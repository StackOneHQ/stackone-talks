/**
 * Code Mode — two tools, same MCP backend as every other runner.
 *
 * The four runners all call the same underlying MCP server. What differs
 * is the interface the model uses to interact with it:
 *
 *   CLI            shell commands → MCP provider API
 *   Naive MCP      all schemas upfront, model calls tools directly
 *   Deferred MCP   search_tools + execute_tool (one tool per call)
 *   Code mode      search + execute (code that calls multiple tools)
 *
 * Code mode tools:
 *   search(query)  BM25/TF-IDF search over the MCP tool catalog — same
 *                  index as deferred MCP. Returns schemas the model uses
 *                  to write correct tools.* calls.
 *   execute(code)  Runs TypeScript in a Node.js sandbox. The sandbox has
 *                  pre-authenticated wrappers: tools.tool_name(args) calls
 *                  the MCP server. Model never sees credentials.
 *
 * The model can chain multiple tool calls in a single execute(), transform
 * results, and return a filtered summary — without extra round-trips.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { createPersistentSandbox, type PersistentSandbox } from "./sandbox.js";
import { buildIndex, handleSearch } from "../search-bm25-tfidf.js";
import * as p from "@clack/prompts";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let sandbox: PersistentSandbox | null = null;
let enabled = false;

export function isCodeMode(): boolean {
	return enabled;
}

export function getSandbox(): PersistentSandbox | null {
	return sandbox;
}

// ---------------------------------------------------------------------------
// Setup — builds the search index + sandbox tool wrappers
// ---------------------------------------------------------------------------

export async function setup(
	allTools: Map<string, any>,
	mcpBaseUrl: string,
	authHeader: string,
): Promise<void> {
	// Build BM25/TF-IDF index over the MCP tool catalog (same as deferred MCP)
	await buildIndex(allTools);

	// Start sandbox with pre-authenticated MCP tool wrappers
	if (sandbox) await sandbox.stop();
	sandbox = await createPersistentSandbox({ timeout: 30000 });

	const toolDefs = Array.from(allTools.values()).map((t) => ({
		name: t.name,
		providerId: t.providerId,
	}));

	const result = await sandbox.execute(
		`return registerTools(${JSON.stringify(toolDefs)}, ${JSON.stringify(mcpBaseUrl)}, ${JSON.stringify(authHeader)})`,
	);

	if (!result.success) throw new Error(`Sandbox setup failed: ${result.error}`);
	p.log.step(String(result.result));
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export async function toggle(
	allTools: Map<string, any>,
	providers: Map<string, any>,
	mcpBaseUrl: string,
	authHeader: string,
	renderDashboard: () => void,
): Promise<void> {
	if (enabled) {
		enabled = false;
		if (sandbox) {
			await sandbox.stop();
			sandbox = null;
		}
		p.log.info(`Switched to MCP mode — ${allTools.size} tools in context`);
	} else {
		if (providers.size === 0) {
			p.log.warn("No providers connected. Use /add <provider> first.");
			return;
		}
		p.log.step("Switching to Code mode...");
		try {
			await setup(allTools, mcpBaseUrl, authHeader);
			enabled = true;
			p.log.success(`Code mode active — 2 tools, ${allTools.size} tools indexed`);
		} catch (err: any) {
			p.log.error(`Failed to set up code mode: ${err.message}`);
		}
	}
	renderDashboard();
}

// ---------------------------------------------------------------------------
// Tool definitions — what the model sees in code mode
// ---------------------------------------------------------------------------

export function buildCodeModeTools(): Anthropic.Tool[] {
	return [buildSearchTool(), buildExecuteTool()];
}

function buildSearchTool(): Anthropic.Tool {
	return {
		name: "search",
		description:
			"Search the MCP tool catalog by natural language query. Returns matching tool names, " +
			"descriptions, and parameter schemas. Use this to discover which tools.* calls to make in execute().",
		input_schema: {
			type: "object" as const,
			properties: {
				query: {
					type: "string",
					description: "Natural language description of what you want to do (e.g. 'list cloudflare workers')",
				},
			},
			required: ["query"],
		},
	};
}

function buildExecuteTool(): Anthropic.Tool {
	return {
		name: "execute",
		description:
			"Execute TypeScript code in a sandbox with pre-authenticated MCP tool wrappers. " +
			"Use `await tools.tool_name(args)` to call any tool discovered via search(). " +
			"You can chain multiple tool calls and transform results. Return a concise filtered result.",
		input_schema: {
			type: "object" as const,
			properties: {
				code: {
					type: "string",
					description:
						"TypeScript code to run. Call tools with `await tools.tool_name(args)`. " +
						"Return a value — it becomes the tool result.",
				},
			},
			required: ["code"],
		},
	};
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

export type ToolHandlerResult = {
	toolResult: Anthropic.ToolResultBlockParam;
	lastProvider: string;
	lastAction: string;
};

export async function handleToolUse(
	block: { id: string; name: string; input: any },
	restartSandbox: () => Promise<void>,
): Promise<ToolHandlerResult | null> {
	if (!enabled) return null;

	// search — BM25/TF-IDF lookup over the MCP tool catalog
	if (block.name === "search") {
		const { tools, debug } = await handleSearch({ query: block.input.query, limit: 5 });

		p.log.step(`🔍 search("${block.input.query}") → ${tools.length} results (${debug.elapsed})`);
		if (tools.length > 0) {
			console.log(chalk.dim(tools.map((t) => `  ${t.name} (${t.score})`).join("\n")));
		}

		const content = tools.length > 0
			? JSON.stringify(tools, null, 2)
			: "No matching tools found. Try a different query.";

		return {
			toolResult: { type: "tool_result", tool_use_id: block.id, content },
			lastProvider: "search-index",
			lastAction: "search",
		};
	}

	// execute — runs TypeScript in sandbox, tools.* calls go to MCP server
	if (block.name === "execute") {
		const currentSandbox = getSandbox();
		if (!currentSandbox || !currentSandbox.isRunning()) {
			p.log.warn("Sandbox crashed, restarting...");
			await restartSandbox();
		}

		p.log.step("💻 execute:");
		console.log(chalk.cyan(block.input.code));

		const execResult = await getSandbox()!.execute(block.input.code);

		if (execResult.success) {
			const resultStr = JSON.stringify(execResult.result, null, 2);
			p.log.success(
				"Result: " + resultStr.substring(0, 300) + (resultStr.length > 300 ? "..." : ""),
			);
			return {
				toolResult: { type: "tool_result", tool_use_id: block.id, content: resultStr },
				lastProvider: "sandbox",
				lastAction: "execute",
			};
		}

		p.log.error(`Error: ${execResult.error}`);
		return {
			toolResult: {
				type: "tool_result",
				tool_use_id: block.id,
				content: `Error: ${execResult.error}`,
				is_error: true,
			},
			lastProvider: "sandbox",
			lastAction: "execute",
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(): string {
	return `You answer questions by writing code that calls MCP tools via a sandbox.

You have two tools:
1. search(query) — find MCP tools by description. Returns tool names, parameters, and schemas.
2. execute(code) — run TypeScript that calls tools.tool_name(args). All tool calls go through the MCP server.

## Workflow
1. Call search() with a natural language query to find the right tool
2. Call execute() with code that uses tools.* to call it, then return a filtered result

## Example
search: "list cloudflare workers"
execute:
\`\`\`typescript
const r = await tools.cloudflare_workers_list({});
const scripts = r?.result?.result || r?.result || r || [];
return Array.isArray(scripts)
  ? scripts.map(s => ({ id: s.id, etag: s.etag }))
  : scripts;
\`\`\`

## Rules
- Always search before executing — don't guess tool names
- Tool names from search use underscores in code: feature-flag-get-all → tools.feature_flag_get_all
- All query parameter values must be strings: \`{ per_page: "10" }\` not \`{ per_page: 10 }\`
- Return only what the user asked for — filter raw API responses`;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanup(): Promise<void> {
	if (sandbox) {
		await sandbox.stop().catch(() => {});
		sandbox = null;
	}
	enabled = false;
}
