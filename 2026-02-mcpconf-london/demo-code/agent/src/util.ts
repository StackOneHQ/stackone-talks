/**
 * Agent utilities — display, measurement, and tool dispatch.
 *
 * Extracted from index.ts to keep the main agent loop readable.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as p from "@clack/prompts";
import chalk from "chalk";
import * as defense from "./defense-mode.js";
import { MODEL, CONTEXT_WINDOW } from "./config.js";
import { BUILTIN_TOOLS } from "./builtin-tools.js";
import { S, badge, truncate, contextBar, groupByProvider } from "./display.js";

// ---------------------------------------------------------------------------
// Tool formatting
// ---------------------------------------------------------------------------

export function buildAnthropicTools(allTools: Map<string, any>): Anthropic.Tool[] {
	return Array.from(allTools.values()).map((tool) => ({
		name: tool.name,
		description: `[${tool.provider}] ${tool.description || ""}`,
		input_schema: tool.inputSchema || { type: "object", properties: {} },
	}));
}

// ---------------------------------------------------------------------------
// Token measurement
// ---------------------------------------------------------------------------

export async function measureContext(
	anthropic: Anthropic | null,
	opts?: {
		tools?: Anthropic.Tool[];
		messages?: Anthropic.MessageParam[];
		system?: string;
	},
): Promise<number | null> {
	if (!anthropic) return null;
	const tools = opts?.tools ?? [];
	if (tools.length === 0 && !opts?.messages) return null;
	try {
		const result = await anthropic.beta.messages.countTokens({
			model: MODEL,
			...(tools.length > 0 ? { tools: tools as any[] } : {}),
			...(opts?.system ? { system: opts.system } : {}),
			messages: opts?.messages ?? [{ role: "user", content: "hello" }],
		});
		return result.input_tokens;
	} catch {
		return Math.round(JSON.stringify(tools).length / 3.5);
	}
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

export function showHelp() {
	const c = (name: string) => S.cmd(name.padEnd(14));
	const d = S.muted;

	const lines = [
		S.heading("Providers"),
		`  ${c("/add")} ${d("<provider>")}  Connect an MCP provider`,
		`  ${c("/add-all")}          Connect all + enable defaults`,
		`  ${c("/providers")}         List available providers`,
		`  ${c("/connected")}         Show connected providers`,
		`  ${c("/tools")}             List loaded tools by provider`,
		`  ${c("/reset")}             Disconnect all providers`,
		"",
		S.heading("Modes"),
		`  ${c("/defaults")}         Toggle built-in tools ${d("(web search + fetch)")}`,
		`  ${c("/code")}             Custom code execution ${d("(local sandbox)")}`,
		`  ${c("/acode")}            Anthropic code execution ${d("(server sandbox)")}`,
		`  ${c("/asearch")}          Anthropic server-side search ${d("(beta)")}`,
		`  ${c("/search")}           Client-side BM25 + TF-IDF search`,
		`  ${c("/defend")}           Prompt injection defense`,
		"",
		S.heading("Info"),
		`  ${c("/usage")}            Context window breakdown`,
		`  ${c("/help")}             Show this help`,
		`  ${c("/quit")}             Exit`,
		"",
		d("Or type any prompt to query the agent."),
	];
	p.note(lines.join("\n"), S.brand("⚡ Commands"));
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardOpts {
	isCodeMode: boolean;
	isASearch: boolean;
	isSearch: boolean;
	isDefense: boolean;
	toolCount: number;
	providers: { name: string; tools: number }[];
	builtinToolsEnabled: boolean;
	anthropicCodeEnabled: boolean;
	actualInputTokens: number | null;
	lastProvider: string;
	lastAction: string;
	lastLatencyMs: number | null;
	cachedBaselineTokens: number | null;
}

export function renderDashboard(o: DashboardOpts) {
	const lines: string[] = [];

	const modeBadge = o.isCodeMode ? badge.code
		: o.isASearch ? badge.asearch
		: o.isSearch ? badge.search
		: badge.mcp;
	const modeDetail = o.isCodeMode
		? S.muted(`1 tool, was ${o.toolCount}`)
		: o.isASearch
			? S.muted(`${o.toolCount} tools deferred`)
			: o.isSearch
				? S.muted(`2 meta-tools, ${o.toolCount} indexed`)
				: S.muted(`${o.toolCount}${o.builtinToolsEnabled ? " + " + BUILTIN_TOOLS.length + " built-in" : ""}${o.anthropicCodeEnabled ? " + 1 sandbox" : ""} tools in context`);
	lines.push(`${S.label("Mode")}      ${modeBadge} ${modeDetail}`);

	if (o.actualInputTokens !== null) {
		const pct = (o.actualInputTokens / CONTEXT_WINDOW) * 100;
		const color = pct > 75 ? chalk.red : pct > 50 ? chalk.yellow : chalk.green;
		lines.push(
			`${S.label("Tokens")}    ${color(o.actualInputTokens.toLocaleString())} ${S.muted(`(${pct.toFixed(0)}% of ${CONTEXT_WINDOW / 1000}k)`)}`,
		);
	} else {
		const est = o.isCodeMode ? "~500" : o.isSearch ? "~1k" : `~${(o.toolCount * 150).toLocaleString()}`;
		lines.push(`${S.label("Tokens")}    ${S.muted(est + " est.")}`);
	}

	if (o.builtinToolsEnabled) {
		const names = BUILTIN_TOOLS.map((t) => t.name).join(", ");
		lines.push(`${S.label("Built-in")}  ${badge.on} ${S.muted(names)}`);
	}
	if (o.anthropicCodeEnabled) {
		lines.push(`${S.label("Sandbox")}   ${badge.anthropic} ${S.muted("server-side code_execution")}`);
	}
	if (o.isDefense) {
		lines.push(`${S.label("Defense")}   ${badge.defense}`);
	}

	lines.push(`${S.label("Providers")} ${S.val(String(o.providers.length))}`);
	if (o.lastLatencyMs !== null) lines.push(`${S.label("Latency")}   ${S.val(o.lastLatencyMs + "ms")}`);
	lines.push(`${S.label("Last")}      ${S.accent(o.lastProvider)} → ${S.val(o.lastAction)}`);

	if (o.providers.length > 0) {
		lines.push("");
		lines.push(
			o.providers
				.map((a) => `${S.brand(a.name)}${S.muted("(" + a.tools + ")")}`)
				.join(S.muted(", ")),
		);
	}

	if (!o.isCodeMode && !o.isASearch && !o.isSearch && o.cachedBaselineTokens !== null) {
		const usagePct = o.cachedBaselineTokens / CONTEXT_WINDOW;
		if (usagePct > 0.75) {
			lines.push("");
			lines.push(badge.critical + chalk.red(` ${(usagePct * 100).toFixed(0)}% context used by tools alone. Overload!`));
		} else if (usagePct > 0.4) {
			lines.push("");
			lines.push(badge.warning + chalk.yellow(` ${(usagePct * 100).toFixed(0)}% context used by tool definitions. Performance degrading.`));
		}
	}

	const title = o.isCodeMode ? "💻 Code Mode"
		: o.isASearch ? "🔍 Anthropic Search"
		: o.isSearch ? "🔎 Search Mode"
		: "⚡ Dashboard";
	p.note(lines.join("\n"), S.brand(title));
}

// ---------------------------------------------------------------------------
// Usage display
// ---------------------------------------------------------------------------

export interface UsageOpts {
	anthropic: Anthropic | null;
	allTools: Map<string, any>;
	currentTools: any[];
	currentSystemPrompt?: string;
	lastMessages: Anthropic.MessageParam[];
	lastTools: any[];
	lastSystemPrompt?: string;
	actualInputTokens: number | null;
	turnTokenHistory: number[];
	cachedBaselineTokens: number | null;
	onBaselineMeasured: (n: number) => void;
}

export async function showUsage(o: UsageOpts, verbose = false) {
	const hasRun = o.lastMessages.length > 0;

	if (hasRun) {
		const totalTokens = await measureContext(o.anthropic, {
			tools: o.lastTools as Anthropic.Tool[],
			messages: o.lastMessages,
			system: o.lastSystemPrompt,
		});
		const baselineTokens = await measureContext(o.anthropic, {
			tools: o.lastTools as Anthropic.Tool[],
			system: o.lastSystemPrompt,
		});
		if (totalTokens === null) return;

		if (!verbose) {
			p.log.step(`Usage: ${totalTokens.toLocaleString()} tokens ${contextBar(totalTokens)}`);
			return;
		}

		const pct = ((totalTokens / CONTEXT_WINDOW) * 100).toFixed(1);
		const remaining = CONTEXT_WINDOW - totalTokens;
		const baseline = baselineTokens ?? 0;
		const conversation = totalTokens - baseline;

		const lines = [
			`${S.label("Total:")}        ${S.val(totalTokens.toLocaleString())} tokens ${S.muted("(" + pct + "% of " + CONTEXT_WINDOW / 1000 + "k)")}`,
			`  ${S.label("Baseline:")}   ${S.val(baseline.toLocaleString())} ${S.muted("(tools + system prompt)")}`,
			`  ${S.label("Convo:")}      ${S.val(conversation.toLocaleString())} ${S.muted("(messages + tool results)")}`,
			`${S.label("Remaining:")}    ${S.ok(remaining.toLocaleString())} tokens`,
			contextBar(totalTokens),
		];

		if (o.actualInputTokens !== null) {
			lines.push("");
			lines.push(`${S.label("API reported:")} ${S.val(o.actualInputTokens.toLocaleString())} ${S.muted("input_tokens (last turn)")}`);
		}

		if (o.turnTokenHistory.length > 1) {
			lines.push("");
			lines.push(S.heading("Per-turn growth:"));
			for (let i = 0; i < o.turnTokenHistory.length; i++) {
				const tok = o.turnTokenHistory[i];
				const delta = i > 0 ? ` (+${(tok - o.turnTokenHistory[i - 1]).toLocaleString()})` : "";
				lines.push(`  Turn ${i + 1}: ${tok.toLocaleString()}${delta}`);
			}
		}

		// Per-provider breakdown only makes sense when MCP tools were in context
		const mcpToolsInContext = o.lastTools.length >= o.allTools.size && o.allTools.size > 0;
		if (mcpToolsInContext && baselineTokens !== null) {
			const avgPerTool = Math.round(baselineTokens / o.lastTools.length);
			lines.push("");
			for (const [provider, count] of groupByProvider(o.allTools)) {
				lines.push(
					`  ${S.brand(provider.padEnd(16))} ${S.val(String(count))} tools ${S.muted("≈ " + (count * avgPerTool).toLocaleString() + " tokens")}`,
				);
			}
		} else {
			lines.push("");
			lines.push(`${S.label("Tools sent:")}  ${S.val(String(o.lastTools.length))} ${S.muted("(" + o.allTools.size + " available)")}`);
		}

		p.note(lines.join("\n"), "📊 Context Usage (actual)");
		return;
	}

	// No agent run yet — show baseline estimate
	const tools = o.currentTools;
	if (tools.length === 0) {
		if (verbose) p.log.info("No tools loaded and no agent run yet. Use /add <provider> to connect.");
		return;
	}

	const tokens = await measureContext(o.anthropic, { tools, system: o.currentSystemPrompt });
	if (tokens === null) return;
	o.onBaselineMeasured(tokens);

	if (!verbose) {
		p.log.step(`Baseline: ${tokens.toLocaleString()} tokens ${contextBar(tokens)}`);
		return;
	}

	const pct = ((tokens / CONTEXT_WINDOW) * 100).toFixed(1);
	const toolCount = tools.length;
	const avgPerTool = toolCount > 0 ? Math.round(tokens / toolCount) : 0;
	const remaining = CONTEXT_WINDOW - tokens;

	const lines = [
		`${S.label("Tools:")}     ${S.val(String(toolCount))}`,
		`${S.label("Baseline:")}  ${S.val(tokens.toLocaleString())} tokens ${S.muted("(" + pct + "% of " + CONTEXT_WINDOW / 1000 + "k window)")}`,
		`${S.label("Per tool:")}  ${S.muted("~" + avgPerTool + " tokens")}`,
		`${S.label("Remaining:")} ${S.ok(remaining.toLocaleString())} tokens`,
		contextBar(tokens),
		"",
		S.muted("(This is the baseline cost before any conversation.)"),
		S.muted("(Send a prompt for actual usage breakdown.)"),
	];

	// Per-provider breakdown only when MCP tools are in context (not in search/code modes)
	const mcpToolsInBaseline = toolCount >= o.allTools.size && o.allTools.size > 0;
	if (mcpToolsInBaseline) {
		for (const [provider, count] of groupByProvider(o.allTools)) {
			lines.push(
				`  ${S.brand(provider.padEnd(16))} ${S.val(String(count))} tools ${S.muted("≈ " + (count * avgPerTool).toLocaleString() + " tokens")}`,
			);
		}
	} else if (o.allTools.size > 0) {
		lines.push(`${S.label("Tools sent:")}  ${S.val(String(toolCount))} ${S.muted("(" + o.allTools.size + " available)")}`);
	}

	if (tokens > CONTEXT_WINDOW * 0.5) {
		lines.push("");
		lines.push(chalk.yellow(`⚠ ${pct}% of context used by tool definitions alone.`));
		lines.push(chalk.yellow("The model hasn't even seen your question yet."));
		lines.push(chalk.yellow("Each tool call will add 10-50k tokens of raw API responses on top."));
	}

	p.note(lines.join("\n"), "📊 Context Usage (baseline)");
}

// ---------------------------------------------------------------------------
// MCP tool execution
// ---------------------------------------------------------------------------

export async function executeMcpTool(
	allTools: Map<string, any>,
	providers: Map<string, { name: string; tools: number; client: any }>,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{ content: string; provider: string }> {
	const toolKey = Array.from(allTools.keys()).find((k) => k.endsWith(`::${toolName}`));
	const toolInfo = toolKey ? allTools.get(toolKey) : undefined;
	const provider = toolInfo?.provider || "unknown";

	p.log.step(`🔧 ${provider}::${toolName}`);

	if (!toolInfo) {
		p.log.error(`Tool not found: ${toolName}`);
		return { content: `Error: Tool '${toolName}' not found`, provider };
	}

	const providerData = providers.get(toolInfo.providerId);
	if (!providerData?.client) {
		p.log.error(`No MCP client for provider ${toolInfo.providerId}`);
		return { content: "Tool execution failed", provider };
	}

	let content: string;
	try {
		const result = await providerData.client.callTool({ name: toolName, arguments: args });
		content = JSON.stringify(result);
		p.log.success("Result: " + truncate(content, 150));
	} catch (err: any) {
		content = `Error: ${err.message}`;
		p.log.error(err.message);
	}
	if (defense.isEnabled()) {
		content = await defense.defendResult(content, toolName);
	}
	return { content, provider };
}

// ---------------------------------------------------------------------------
// Server-side tool block logging (web search, code execution, discovery)
// ---------------------------------------------------------------------------

export function logServerBlock(block: any, toolCount: number): { lastProvider?: string; lastAction?: string } {
	if (block.type === "server_tool_use") {
		if (block.name === "web_search") {
			p.log.step(`🌐 Web search: ${S.accent(`"${block.input?.query || ""}"`)}`);
		} else if (block.name === "web_fetch") {
			p.log.step(`🌐 Web fetch: ${S.accent(block.input?.url || "")}`);
		} else if (block.name === "bash_code_execution") {
			p.log.step(`${S.accent("$")} ${truncate(block.input?.command, 80)}`);
			return { lastProvider: "built-in", lastAction: "bash" };
		} else if (block.name === "text_editor_code_execution") {
			const { command, path } = block.input || {};
			p.log.step(`${S.accent("\u270e")} ${command} ${S.muted(path || "")}`);
			return { lastProvider: "built-in", lastAction: `editor:${command}` };
		} else {
			p.log.step(`🔍 Anthropic BM25 search across ${S.accent(toolCount + " deferred tools")}: ${S.accent(`"${block.input?.query || block.input?.pattern || ""}"`)}`);
			p.log.info(`  ${S.muted("Server-side ranking — scores not exposed to client")}`);
		}
	} else if (block.type === "web_search_tool_result") {
		const urls = (block.content || [])
			.filter((r: any) => r.type === "web_search_result")
			.map((r: any) => r.title || r.url);
		if (urls.length > 0) {
			p.log.success(`${S.ok(String(urls.length))} results: ${S.muted(urls.slice(0, 3).join(", "))}${urls.length > 3 ? S.muted(` +${urls.length - 3} more`) : ""}`);
		}
	} else if (block.type === "web_fetch_tool_result") {
		const text = block.content || "";
		p.log.success(`Fetched ${S.muted(truncate(String(text), 150))}`);
	} else if (block.type === "bash_code_execution_tool_result") {
		if (block.content?.stdout) p.log.success(S.muted(truncate(block.content.stdout, 200)));
		if (block.content?.stderr) p.log.warn(S.muted(truncate(block.content.stderr, 200)));
	} else if (block.type === "text_editor_code_execution_tool_result") {
		if (block.content?.content) p.log.success(S.muted(truncate(String(block.content.content), 200)));
	}
	return {};
}
