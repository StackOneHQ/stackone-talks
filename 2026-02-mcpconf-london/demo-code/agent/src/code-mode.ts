/**
 * Code Mode — the "solution" side of the demo.
 *
 * Instead of loading 845 tool schemas into context (MCP mode),
 * give Claude a single `execute_code` tool with a sandbox that has
 * pre-authenticated wrappers for every MCP tool.
 *
 * 845 tools → 1 tool. Context drops from 130k tokens to ~500.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { createPersistentSandbox, type PersistentSandbox } from "./sandbox.js";
import * as p from "@clack/prompts";

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
// Sandbox setup — injects fetch-based wrappers for every MCP tool
// ---------------------------------------------------------------------------

export async function setupSandbox(
	allTools: Map<string, any>,
	mcpBaseUrl: string,
	authHeader: string,
): Promise<void> {
	if (sandbox) await sandbox.stop();
	sandbox = await createPersistentSandbox({ timeout: 30000 });

	const wrappers: string[] = [];
	for (const [, tool] of allTools) {
		const fnName = tool.name.replace(/-/g, "_");
		wrappers.push(`
  ${fnName}: async (args) => {
    const res = await fetch("${mcpBaseUrl}?x-account-id=${tool.accountId}", {
      method: "POST",
      headers: {
        "Authorization": "${authHeader}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "call-" + Date.now(),
        method: "tools/call",
        params: { name: "${tool.name}", arguments: args }
      })
    });
    const data = await res.json();
    if (data.result?.content) {
      const tc = data.result.content.find(c => c.type === "text");
      if (tc?.text) { try { return JSON.parse(tc.text); } catch { return tc.text; } }
    }
    return data.result || data;
  }`);
	}

	const result = await sandbox.execute(`
globalThis.tools = {${wrappers.join(",")}
};
return "Sandbox ready: " + Object.keys(globalThis.tools).length + " tool wrappers loaded"`);

	if (!result.success) throw new Error(`Sandbox setup failed: ${result.error}`);
	p.log.step(String(result.result));
}

// ---------------------------------------------------------------------------
// Toggle between MCP mode and Code mode
// ---------------------------------------------------------------------------

export async function toggle(
	allTools: Map<string, any>,
	accounts: Map<string, any>,
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
		if (accounts.size === 0) {
			p.log.warn("No accounts connected. Use /add <provider> first.");
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
