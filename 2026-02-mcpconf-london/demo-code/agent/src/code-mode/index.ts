/**
 * Code Mode — the "solution" side of the demo.
 *
 * Fixes two context explosion problems:
 * 1. Upfront: 845 tool schemas → 1 execute_code tool (~500 tokens)
 * 2. Per-turn: raw API responses stay in the sandbox, only filtered
 *    summaries reach the LLM (e.g. 55k JSON → 400-char summary)
 *
 * The sandbox has pre-authenticated fetch wrappers for every MCP tool.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { createPersistentSandbox, type PersistentSandbox } from "./sandbox.js";
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
// Sandbox setup — registers MCP tool wrappers via data, not templates
// ---------------------------------------------------------------------------

export async function setupSandbox(
	allTools: Map<string, any>,
	mcpBaseUrl: string,
	authHeader: string,
): Promise<void> {
	if (sandbox) await sandbox.stop();
	sandbox = await createPersistentSandbox({ timeout: 30000 });

	// Pass tool definitions as JSON data to registerTools() in the runner
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
// Toggle between MCP mode and Code mode
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
			await setupSandbox(allTools, mcpBaseUrl, authHeader);
			enabled = true;
			p.log.success(`Code mode active — 1 tool (was ${allTools.size})`);
		} catch (err: any) {
			p.log.error(`Failed to set up sandbox: ${err.message}`);
		}
	}
	renderDashboard();
}

// ---------------------------------------------------------------------------
// Anthropic tool definition — the single tool Claude sees in code mode
// ---------------------------------------------------------------------------

export function buildExecuteCodeTool(): Anthropic.Tool {
	return {
		name: "execute_code",
		description:
			"Execute TypeScript code in a sandbox with pre-configured MCP tool wrappers. " +
			"Use `await tools.tool_name(args)` to call tools. Return a concise, filtered result.",
		input_schema: {
			type: "object" as const,
			properties: {
				code: {
					type: "string",
					description:
						"TypeScript code to execute. Use await tools.* to call MCP tools. Return a value to send it back.",
				},
			},
			required: ["code"],
		},
	};
}

// ---------------------------------------------------------------------------
// Tool dispatch — handles execute_code blocks
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
	if (!enabled || block.name !== "execute_code") return null;

	const currentSandbox = getSandbox();
	if (!currentSandbox || !currentSandbox.isRunning()) {
		p.log.warn("Sandbox crashed, restarting...");
		await restartSandbox();
	}

	p.log.step("💻 Code execution:");
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
			lastAction: "execute_code",
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
		lastAction: "execute_code",
	};
}

// ---------------------------------------------------------------------------
// System prompt — tells Claude what tools are available in the sandbox
// ---------------------------------------------------------------------------

export function buildSystemPrompt(allTools: Map<string, any>): string {
	const byProvider = new Map<string, string[]>();
	for (const [, tool] of allTools) {
		if (!byProvider.has(tool.provider)) byProvider.set(tool.provider, []);
		const fnName = tool.name.replace(/-/g, "_");
		byProvider
			.get(tool.provider)!
			.push(`  - tools.${fnName}(args): ${(tool.description || "").slice(0, 80)}`);
	}

	const toolList = Array.from(byProvider.entries())
		.map(([provider, tools]) => {
			const listed = tools.slice(0, 10).join("\n");
			const more =
				tools.length > 10 ? `\n  ... and ${tools.length - 10} more` : "";
			return `### ${provider}\n${listed}${more}`;
		})
		.join("\n\n");

	return `You answer questions by writing TypeScript code that calls MCP tool wrappers in a sandbox.

## Available Tools
${toolList}

## How to Use
- Call tools: \`await tools.tool_name({ query: { key: "value" } })\`
- All query parameter values must be STRINGS (e.g., per_page: "10" not 10)
- Navigate nested responses: results may be at data.result.data or data.data
- Filter and summarize results - don't return raw API responses
- Return a concise object with only the fields the user needs

## Example
\`\`\`typescript
const data = await tools.gmail_list_messages({ query: { per_page: "5" } });
let messages = data?.data?.data || data?.data || [];
if (!Array.isArray(messages)) messages = [];
return messages.slice(0, 5).map(m => ({ subject: m.subject, from: m.from }));
\`\`\``;
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
