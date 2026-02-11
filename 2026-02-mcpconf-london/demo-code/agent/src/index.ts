import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as p from "@clack/prompts";
import chalk from "chalk";
import * as readline from "readline";
import "dotenv/config";

import * as codeMode from "./code-mode/index.js";
import * as discovery from "./search-anthropic.js";
import * as search from "./search-bm25-tfidf.js";
import * as defense from "./defense-mode.js";
import { MODEL, MCP_BASE_URL, CONTEXT_WINDOW, getAuthHeader, loadProviders, LOCAL_MCP_PROVIDERS } from "./config.js";
import { BUILTIN_TOOLS, CODE_EXECUTION_BETA, CODE_EXECUTION_TOOL } from "./builtin-tools.js";
import { S, contextBar } from "./display.js";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const AVAILABLE_PROVIDERS = loadProviders();

const providers = new Map<
	string,
	{ name: string; tools: number; client: Client }
>();
const allTools = new Map<string, any>();
let actualInputTokens: number | null = null;
let lastProvider = "-";
let lastAction = "-";
let lastLatencyMs: number | null = null;
let builtinToolsEnabled = false;
let anthropicCodeEnabled = false;

// Usage tracking: stores state from the most recent runAgent() call
let lastMessages: Anthropic.MessageParam[] = [];
let lastTools: Anthropic.Tool[] = [];
let lastSystemPrompt: string | undefined;
let turnTokenHistory: number[] = [];
let cachedBaselineTokens: number | null = null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// ---------------------------------------------------------------------------
// Tool helpers
// ---------------------------------------------------------------------------

function buildAnthropicTools(): Anthropic.Tool[] {
	return Array.from(allTools.values()).map((tool) => ({
		name: tool.name,
		description: `[${tool.provider}] ${tool.description || ""}`,
		input_schema: tool.inputSchema || { type: "object", properties: {} },
	}));
}

async function measureContext(opts?: {
	tools?: Anthropic.Tool[];
	messages?: Anthropic.MessageParam[];
	system?: string;
}): Promise<number | null> {
	if (!anthropic) return null;
	const tools = opts?.tools ?? buildAnthropicTools();
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
// Usage display
// ---------------------------------------------------------------------------

async function showUsage(verbose = false) {
	const hasRun = lastMessages.length > 0;

	// ── After an agent run: show actual usage breakdown ──
	if (hasRun) {
		const totalTokens = await measureContext({
			tools: lastTools as Anthropic.Tool[],
			messages: lastMessages,
			system: lastSystemPrompt,
		});

		const baselineTokens = await measureContext({
			tools: lastTools as Anthropic.Tool[],
			system: lastSystemPrompt,
		});

		if (totalTokens === null) return;

		if (!verbose) {
			p.log.step(
				`Usage: ${totalTokens.toLocaleString()} tokens ${contextBar(totalTokens)}`,
			);
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

		if (actualInputTokens !== null) {
			lines.push("");
			lines.push(`${S.label("API reported:")} ${S.val(actualInputTokens.toLocaleString())} ${S.muted("input_tokens (last turn)")}`);
		}

		if (turnTokenHistory.length > 1) {
			lines.push("");
			lines.push(S.heading("Per-turn growth:"));
			for (let i = 0; i < turnTokenHistory.length; i++) {
				const tok = turnTokenHistory[i];
				const delta = i > 0 ? ` (+${(tok - turnTokenHistory[i - 1]).toLocaleString()})` : "";
				lines.push(`  Turn ${i + 1}: ${tok.toLocaleString()}${delta}`);
			}
		}

		if (allTools.size > 0 && baselineTokens !== null) {
			const avgPerTool = Math.round(baselineTokens / allTools.size);
			lines.push("");
			const byProvider = new Map<string, number>();
			for (const [, tool] of allTools) {
				byProvider.set(tool.provider, (byProvider.get(tool.provider) || 0) + 1);
			}
			for (const [provider, count] of byProvider) {
				lines.push(
					`  ${S.brand(provider.padEnd(16))} ${S.val(String(count))} tools ${S.muted("≈ " + (count * avgPerTool).toLocaleString() + " tokens")}`,
				);
			}
		}

		p.note(lines.join("\n"), "📊 Context Usage (actual)");
		return;
	}

	// ── No agent run yet: show baseline estimate ──
	if (allTools.size === 0) {
		if (verbose) p.log.info("No tools loaded and no agent run yet. Use /add <provider> to connect.");
		return;
	}

	const systemPrompt = codeMode.isCodeMode() ? codeMode.buildSystemPrompt(allTools) : undefined;
	const tokens = await measureContext({ system: systemPrompt });
	if (tokens === null) return;
	cachedBaselineTokens = tokens;

	if (!verbose) {
		p.log.step(
			`Baseline: ${tokens.toLocaleString()} tokens ${contextBar(tokens)}`,
		);
		return;
	}

	const pct = ((tokens / CONTEXT_WINDOW) * 100).toFixed(1);
	const avgPerTool = Math.round(tokens / allTools.size);
	const remaining = CONTEXT_WINDOW - tokens;

	const lines = [
		`${S.label("Tools:")}     ${S.val(String(allTools.size))}`,
		`${S.label("Baseline:")}  ${S.val(tokens.toLocaleString())} tokens ${S.muted("(" + pct + "% of " + CONTEXT_WINDOW / 1000 + "k window)")}`,
		`${S.label("Per tool:")}  ${S.muted("~" + avgPerTool + " tokens")}`,
		`${S.label("Remaining:")} ${S.ok(remaining.toLocaleString())} tokens`,
		contextBar(tokens),
		"",
		S.muted("(This is the baseline cost before any conversation.)"),
		S.muted("(Send a prompt for actual usage breakdown.)"),
	];

	const byProvider = new Map<string, number>();
	for (const [, tool] of allTools) {
		byProvider.set(tool.provider, (byProvider.get(tool.provider) || 0) + 1);
	}
	for (const [provider, count] of byProvider) {
		lines.push(
			`  ${S.brand(provider.padEnd(16))} ${S.val(String(count))} tools ${S.muted("≈ " + (count * avgPerTool).toLocaleString() + " tokens")}`,
		);
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
// Dashboard
// ---------------------------------------------------------------------------

function renderDashboard() {
	const isCode = codeMode.isCodeMode();
	const isDisco = discovery.isEnabled();
	const isSearch = search.isEnabled();
	const isDefend = defense.isEnabled();

	const lines: string[] = [];

	// Mode line with colored badge
	const modeBadge = isCode
		? chalk.bgCyan.black(" CODE ")
		: isDisco
			? chalk.bgMagenta.white(" DISCOVERY ")
			: isSearch
				? chalk.bgBlue.white(" SEARCH ")
				: chalk.bgHex("#05C168").black(" MCP ");
	const modeDetail = isCode
		? S.muted(`1 tool, was ${allTools.size}`)
		: isDisco
			? S.muted(`${allTools.size} tools deferred`)
			: isSearch
				? S.muted(`2 meta-tools, ${allTools.size} indexed`)
				: S.muted(`${allTools.size}${builtinToolsEnabled ? " + " + BUILTIN_TOOLS.length + " built-in" : ""}${anthropicCodeEnabled ? " + 1 sandbox" : ""} tools in context`);
	lines.push(`${S.label("Mode")}      ${modeBadge} ${modeDetail}`);

	// Tokens
	if (actualInputTokens !== null) {
		const pct = (actualInputTokens / CONTEXT_WINDOW) * 100;
		const color = pct > 75 ? chalk.red : pct > 50 ? chalk.yellow : chalk.green;
		lines.push(
			`${S.label("Tokens")}    ${color(actualInputTokens.toLocaleString())} ${S.muted(`(${pct.toFixed(0)}% of ${CONTEXT_WINDOW / 1000}k)`)}`,
		);
	} else {
		const est = isCode
			? "~500"
			: isSearch
				? "~1k"
				: `~${(allTools.size * 150).toLocaleString()}`;
		lines.push(`${S.label("Tokens")}    ${S.muted(est + " est.")}`);
	}

	// Built-in tools status
	if (builtinToolsEnabled) {
		const names = BUILTIN_TOOLS.map((t) => t.name).join(", ");
		lines.push(`${S.label("Built-in")}  ${chalk.bgHex("#05C168").black(" ON ")} ${S.muted(names)}`);
	}

	// Anthropic code execution status
	if (anthropicCodeEnabled) {
		lines.push(`${S.label("Sandbox")}   ${chalk.bgCyan.black(" ANTHROPIC ")} ${S.muted("server-side code_execution")}`);
	}

	// Defense status
	if (isDefend) {
		lines.push(`${S.label("Defense")}   ${chalk.bgYellow.black(" ON ")}`);
	}

	// Providers
	lines.push(`${S.label("Providers")} ${S.val(String(providers.size))}`);
	if (lastLatencyMs !== null) lines.push(`${S.label("Latency")}   ${S.val(lastLatencyMs + "ms")}`);
	lines.push(`${S.label("Last")}      ${S.accent(lastProvider)} → ${S.val(lastAction)}`);

	if (providers.size > 0) {
		lines.push("");
		lines.push(
			Array.from(providers.values())
				.map((a) => `${S.brand(a.name)}${S.muted("(" + a.tools + ")")}`)
				.join(S.muted(", ")),
		);
	}

	if (!isCode && !isDisco && !isSearch && cachedBaselineTokens !== null) {
		const usagePct = cachedBaselineTokens / CONTEXT_WINDOW;
		if (usagePct > 0.75) {
			lines.push("");
			lines.push(chalk.bgRed.white(" CRITICAL ") + chalk.red(` ${(usagePct * 100).toFixed(0)}% context used by tools alone. Overload!`));
		} else if (usagePct > 0.4) {
			lines.push("");
			lines.push(chalk.bgYellow.black(" WARNING ") + chalk.yellow(` ${(usagePct * 100).toFixed(0)}% context used by tool definitions. Performance degrading.`));
		}
	}

	const title = isCode
		? "💻 Code Mode"
		: isDisco
			? "🔍 Discovery Mode"
			: isSearch
				? "🔎 Search Mode"
				: "⚡ Dashboard";
	p.note(lines.join("\n"), S.brand(title));
}

// ---------------------------------------------------------------------------
// Provider management (MCP connection)
// ---------------------------------------------------------------------------

async function addProvider(providerName: string) {
	// Check both StackOne and local MCP providers
	const entry = AVAILABLE_PROVIDERS.find(
		(a) =>
			a.provider.toLowerCase() === providerName.toLowerCase() ||
			a.id === providerName,
	);
	const localEntry = LOCAL_MCP_PROVIDERS.find(
		(l) =>
			l.provider.toLowerCase() === providerName.toLowerCase() ||
			l.id === providerName,
	);
	if (!entry && !localEntry) {
		p.log.error(`Unknown provider: ${providerName}`);
		const all = [
			...AVAILABLE_PROVIDERS.map((a) => a.provider),
			...LOCAL_MCP_PROVIDERS.map((l) => l.provider),
		];
		p.log.message("Available: " + all.map((n) => S.brand(n)).join(S.muted(", ")));
		return;
	}
	const id = entry?.id ?? localEntry!.id;
	const name = entry?.provider ?? localEntry!.provider;
	if (providers.has(id)) {
		p.log.warn(`${name} already connected`);
		return;
	}
	if (entry && !process.env.STACKONE_API_KEY) {
		p.log.error("STACKONE_API_KEY not set");
		return;
	}

	p.log.step(`Connecting to ${name}...`);

	try {
		const client = new Client({
			name: `demo-${name}`,
			version: "1.0.0",
		});

		if (localEntry) {
			// Local MCP server — spawn via stdio
			const transport = new StdioClientTransport({
				command: localEntry.command,
				args: localEntry.args,
				stderr: "pipe",
			});
			await client.connect(transport);
		} else {
			// StackOne cloud MCP server — HTTP transport
			const authToken = Buffer.from(
				`${process.env.STACKONE_API_KEY}:`,
			).toString("base64");
			const transport = new StreamableHTTPClientTransport(
				new URL(MCP_BASE_URL),
				{
					requestInit: {
						headers: {
							Authorization: `Basic ${authToken}`,
							"x-account-id": entry!.id,
							"Content-Type": "application/json",
							Accept: "application/json, text/event-stream",
						},
					},
				},
			);
			await client.connect(transport);
		}

		const toolsResult = await client.listTools();
		const toolCount = toolsResult.tools?.length || 0;

		for (const tool of toolsResult.tools || []) {
			allTools.set(`${name}::${tool.name}`, {
				...tool,
				provider: name,
				providerId: id,
			});
		}

		providers.set(id, {
			name,
			tools: toolCount,
			client,
		});
		p.log.success(
			`${name} (+${toolCount} tools, ${allTools.size}${builtinToolsEnabled ? " + " + BUILTIN_TOOLS.length + " built-in" : ""}${anthropicCodeEnabled ? " + 1 sandbox" : ""} total)`,
		);

		await showUsage();
		renderDashboard();
	} catch (error: any) {
		p.log.error(`Failed to connect ${name}: ${error.message}`);
	}
}

// ---------------------------------------------------------------------------
// Agent loop (MCP mode + Code mode + Discovery mode, multi-turn)
// ---------------------------------------------------------------------------

async function runAgent(prompt: string) {
	if (!anthropic) {
		p.log.error("ANTHROPIC_API_KEY not set");
		return;
	}

	p.log.step("Processing with Claude...");
	const startTime = Date.now();

	// Reset per-run usage tracking
	turnTokenHistory = [];

	let tools: any[] = [];
	let systemPrompt: string | undefined;
	const isCode = codeMode.isCodeMode();
	const isDisco = discovery.isEnabled();
	const isSearch = search.isEnabled();
	const sandbox = codeMode.getSandbox();

	if (isCode) {
		if (providers.size === 0) {
			p.log.warn("No providers connected. Use /add <provider> first.");
			return;
		}
		if (!sandbox || !sandbox.isRunning()) {
			p.log.step("Sandbox not ready, setting up...");
			await codeMode.setupSandbox(allTools, MCP_BASE_URL, getAuthHeader());
		}
		tools = [codeMode.buildExecuteCodeTool()];
		systemPrompt = codeMode.buildSystemPrompt(allTools);
		p.log.info("Code mode: 1 tool in context");
	} else if (isDisco) {
		tools = discovery.wrapTools(buildAnthropicTools());
		p.log.info(`Discovery mode: ${allTools.size} tools deferred`);
	} else if (isSearch) {
		tools = search.buildTools();
		systemPrompt = search.buildSystemPrompt();
		p.log.info(`Search mode: 2 meta-tools (${allTools.size} indexed)`);
	} else if (allTools.size > 0) {
		tools = buildAnthropicTools();
		if (tools.length > 100)
			p.log.warn(`Loading ${tools.length} tool definitions into context...`);
	}

	// Append built-in Anthropic server tools (web search etc.)
	if (builtinToolsEnabled) {
		tools = [...tools, ...BUILTIN_TOOLS];
	}

	// Anthropic code execution mode: add server-side sandbox tool
	if (anthropicCodeEnabled) {
		tools = [...tools, CODE_EXECUTION_TOOL];
	}

	// When defense mode is on, tell the LLM how to handle boundary tags
	if (defense.isEnabled()) {
		systemPrompt = (systemPrompt ?? "") + "\n\n" + defense.getSystemInstructions();
	}

	try {
		const messages: Anthropic.MessageParam[] = [
			{ role: "user", content: prompt },
		];
		let turnCount = 0;

		while (turnCount < 5) {
			turnCount++;
			const turnStart = Date.now();

			const createParams: any = {
				model: MODEL,
				max_tokens: 2048,
				...(tools.length > 0 ? { tools } : {}),
				...(systemPrompt ? { system: systemPrompt } : {}),
				messages,
			};

			// Combine beta headers as needed
			const betas = [
				...(isDisco ? [discovery.BETA] : []),
				...(anthropicCodeEnabled ? [CODE_EXECUTION_BETA] : []),
			];
			const response: any = betas.length > 0
				? await anthropic.messages.create(createParams, {
						headers: { "anthropic-beta": betas.join(",") },
					})
				: await anthropic.messages.create(createParams);

			if (response.usage) {
				const inputTok = response.usage.input_tokens;
				actualInputTokens = inputTok;
				turnTokenHistory.push(inputTok);
				const pct = ((inputTok / CONTEXT_WINDOW) * 100).toFixed(0);
				p.log.step(
					`Turn ${turnCount}: ${inputTok.toLocaleString()} tokens (${pct}%) · ${Date.now() - turnStart}ms`,
				);
			}

			const toolResults: Anthropic.ToolResultBlockParam[] = [];

			for (const block of response.content) {
				if (block.type === "text") {
					console.log("\n" + block.text);
				} else if (block.type === "server_tool_use") {
					// Server-side tools (web search, code execution, discovery)
					if (block.name === "web_search") {
						const query = block.input?.query || "";
						p.log.step(`🌐 Web search: ${S.accent(`"${query}"`)}`);
					} else if (block.name === "bash_code_execution") {
						const cmd = block.input?.command || "";
						lastProvider = "built-in";
						lastAction = "bash";
						p.log.step(`${S.accent("$")} ${cmd.length > 80 ? cmd.substring(0, 80) + "..." : cmd}`);
					} else if (block.name === "text_editor_code_execution") {
						const { command, path } = block.input || {};
						lastProvider = "built-in";
						lastAction = `editor:${command}`;
						p.log.step(`${S.accent("\u270e")} ${command} ${S.muted(path || "")}`);
					} else {
						const query = block.input?.query || block.input?.pattern || "";
						p.log.step(`🔍 Anthropic BM25 search across ${S.accent(allTools.size + " deferred tools")}: ${S.accent(`"${query}"`)}`);
						p.log.info(`  ${S.muted("Server-side ranking — scores not exposed to client")}`);
					}
				} else if ((block as any).type === "web_search_tool_result") {
					const results = (block as any).content || [];
					const urls = results
						.filter((r: any) => r.type === "web_search_result")
						.map((r: any) => r.title || r.url);
					if (urls.length > 0) {
						p.log.success(`${S.ok(String(urls.length))} results: ${S.muted(urls.slice(0, 3).join(", "))}${urls.length > 3 ? S.muted(` +${urls.length - 3} more`) : ""}`);
					}
				} else if ((block as any).type === "bash_code_execution_tool_result") {
					const r = (block as any).content || {};
					if (r.stdout) p.log.success(S.muted(r.stdout.length > 200 ? r.stdout.substring(0, 200) + "..." : r.stdout));
					if (r.stderr) p.log.warn(S.muted(r.stderr.length > 200 ? r.stderr.substring(0, 200) + "..." : r.stderr));
				} else if ((block as any).type === "text_editor_code_execution_tool_result") {
					const r = (block as any).content || {};
					if (r.content) p.log.success(S.muted(String(r.content).substring(0, 200)));
				} else if (block.type === "tool_use") {
					if (isSearch && block.name === "meta_search_tools") {
						// Search mode: client-side Orama BM25 + TF-IDF search
						const input = block.input as { query: string; limit?: number };
						p.log.step(`🔎 Searching ${S.accent(allTools.size + " tools")} for: ${S.accent(`"${input.query}"`)}`);
						const results = await search.handleSearch(input);
						const { debug } = results;

						// Show search mechanics for the audience
						if (debug.bm25Top.length > 0) {
							const bm25Line = debug.bm25Top.slice(0, 3).map((t) => `${t.name} ${S.muted(`(${t.score})`)}`).join(", ");
							p.log.info(`  ${S.label("BM25:")}    ${bm25Line}`);
						}
						if (debug.tfidfTop.length > 0) {
							const tfidfLine = debug.tfidfTop.slice(0, 3).map((t) => `${t.name} ${S.muted(`(${t.score})`)}`).join(", ");
							p.log.info(`  ${S.label("TF-IDF:")}  ${tfidfLine}`);
						}
						if (debug.fusionTop.length > 0) {
							const fusionLine = debug.fusionTop.map((t) =>
								`${S.brand(t.name)} ${S.muted(`(0.2×${t.bm25} + 0.8×${t.tfidf} = ${t.hybrid})`)}`
							).join(", ");
							p.log.info(`  ${S.label("Hybrid:")}  ${fusionLine}`);
						}
						p.log.success(
							`Found ${results.tools.length} tools in ${S.accent(debug.elapsed)} ${S.muted(`(${debug.totalCandidates} candidates)`)}`,
						);

						const { debug: _debug, ...resultForLLM } = results;
						const resultStr = JSON.stringify(resultForLLM);
						toolResults.push({
							type: "tool_result",
							tool_use_id: block.id,
							content: resultStr,
						});
					} else if (isSearch && block.name === "meta_execute_tool") {
						// Search mode: dispatch to MCP client
						const input = block.input as { tool_name: string; params?: Record<string, unknown> };
						const toolKey = Array.from(allTools.keys()).find((k) =>
							k.endsWith(`::${input.tool_name}`),
						);
						const toolInfo = toolKey ? allTools.get(toolKey) : undefined;
						lastProvider = toolInfo?.provider || "unknown";
						lastAction = input.tool_name;

						p.log.step(`🔧 ${lastProvider}::${input.tool_name}`);

						let resultContent = "Tool execution failed";
						if (!toolInfo) {
							resultContent = `Error: Tool '${input.tool_name}' not found`;
							p.log.error(`Tool not found: ${input.tool_name}`);
						} else {
							const providerData = providers.get(toolInfo.providerId);
							if (providerData?.client) {
								try {
									const result = await providerData.client.callTool({
										name: input.tool_name,
										arguments: input.params || {},
									});
									resultContent = JSON.stringify(result);
									p.log.success(
										"Result: " + resultContent.substring(0, 150) + "...",
									);
								} catch (err: any) {
									resultContent = `Error: ${err.message}`;
									p.log.error(err.message);
								}
							} else {
								p.log.error(`No MCP client for provider ${toolInfo.providerId}`);
							}
						}
						if (defense.isEnabled()) {
							resultContent = await defense.defendResult(resultContent, input.tool_name);
						}
						toolResults.push({
							type: "tool_result",
							tool_use_id: block.id,
							content: resultContent,
						});
					} else if (isCode && block.name === "execute_code") {
						// Code mode: execute in sandbox
						lastAction = "execute_code";
						lastProvider = "sandbox";

						const currentSandbox = codeMode.getSandbox();
						if (!currentSandbox || !currentSandbox.isRunning()) {
							p.log.warn("Sandbox crashed, restarting...");
							await codeMode.setupSandbox(
								allTools,
								MCP_BASE_URL,
								getAuthHeader(),
							);
						}

						p.log.step("💻 Code execution:");
						console.log(chalk.cyan(block.input.code));

						const execResult = await codeMode
							.getSandbox()!
							.execute(block.input.code);

						if (execResult.success) {
							const resultStr = JSON.stringify(
								execResult.result,
								null,
								2,
							);
							p.log.success(
								"Result: " +
									resultStr.substring(0, 300) +
									(resultStr.length > 300 ? "..." : ""),
							);
							toolResults.push({
								type: "tool_result",
								tool_use_id: block.id,
								content: resultStr,
							});
						} else {
							p.log.error(`Error: ${execResult.error}`);
							toolResults.push({
								type: "tool_result",
								tool_use_id: block.id,
								content: `Error: ${execResult.error}`,
								is_error: true,
							});
						}
					} else {
						// MCP mode or Discovery mode: dispatch to MCP client
						const toolKey = Array.from(allTools.keys()).find((k) =>
							k.endsWith(`::${block.name}`),
						);
						const toolInfo = toolKey
							? allTools.get(toolKey)
							: undefined;
						lastProvider = toolInfo?.provider || "unknown";
						lastAction = block.name;

						p.log.step(`🔧 ${lastProvider}::${block.name}`);

						let resultContent = "Tool execution failed";

						if (!toolInfo) {
							resultContent = `Error: Tool '${block.name}' not found`;
							p.log.error(`Tool not found: ${block.name}`);
						} else {
							const providerData = providers.get(
								toolInfo.providerId,
							);
							if (providerData?.client) {
								try {
									const result =
										await providerData.client.callTool({
											name: block.name,
											arguments:
												block.input as Record<
													string,
													unknown
												>,
										});
									resultContent = JSON.stringify(result);
									p.log.success(
										"Result: " +
											resultContent.substring(0, 150) +
											"...",
									);
								} catch (err: any) {
									resultContent = `Error: ${err.message}`;
									p.log.error(err.message);
								}
							} else {
								p.log.error(
									`No MCP client for provider ${toolInfo.providerId}`,
								);
							}
						}
						if (defense.isEnabled()) {
							resultContent = await defense.defendResult(resultContent, block.name);
						}
						toolResults.push({
							type: "tool_result",
							tool_use_id: block.id,
							content: resultContent,
						});
					}
				}
			}

			if (toolResults.length === 0) break;
			messages.push({ role: "assistant", content: response.content });
			messages.push({ role: "user", content: toolResults });
		}

		// Store conversation state for /usage inspection
		lastMessages = [...messages];
		lastTools = [...tools];
		lastSystemPrompt = systemPrompt;

		lastLatencyMs = Date.now() - startTime;
		p.log.step(`Response time: ${lastLatencyMs}ms`);
		renderDashboard();
	} catch (error: any) {
		const msg = error.message || String(error);
		const tokenMatch = msg.match(
			/(\d[\d,]+)\s*tokens?\s*>\s*(\d[\d,]+)\s*max/i,
		);

		if (
			tokenMatch ||
			msg.includes("too long") ||
			msg.includes("context")
		) {
			const used = tokenMatch
				? parseInt(tokenMatch[1].replace(/,/g, ""))
				: null;
			const limit = tokenMatch
				? parseInt(tokenMatch[2].replace(/,/g, ""))
				: CONTEXT_WINDOW;

			const lines = [];
			if (used && limit) {
				const pct = ((used / limit) * 100).toFixed(0);
				lines.push(
					`Requested: ${used.toLocaleString()} tokens (${pct}% of ${(limit / 1000).toFixed(0)}k limit)`,
				);
				lines.push(
					`Capacity:  ${limit.toLocaleString()} tokens`,
				);
				lines.push(
					`Overflow:  +${(used - limit).toLocaleString()} tokens over limit`,
				);
				lines.push("");
			}
			lines.push(`API error: ${msg}`);
			lines.push("");
			lines.push("The agent could not process your request.");
			lines.push("Tool definitions + accumulated raw responses filled the context window.");
			lines.push("All conversation context has been lost.");

			p.note(
				lines.join("\n"),
				chalk.red.bold("💥 CONTEXT WINDOW EXCEEDED — AGENT CRASHED"),
			);
		} else {
			p.log.error(msg);
		}
	}
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanupAll() {
	await codeMode.cleanup();
	discovery.cleanup();
	search.cleanup();
	defense.cleanup();
	for (const prov of providers.values()) {
		await prov.client.close().catch(() => {});
	}
}

process.on("SIGINT", async () => {
	p.outro("Goodbye!");
	await cleanupAll();
	process.exit(0);
});
process.on("SIGTERM", async () => {
	await cleanupAll();
	process.exit(0);
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function showHelp() {
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
		`  ${c("/defaults")}         Toggle built-in tools ${d("(web search)")}`,
		`  ${c("/code")}             Custom code execution ${d("(local sandbox)")}`,
		`  ${c("/acode")}            Anthropic code execution ${d("(server sandbox)")}`,
		`  ${c("/discover")}         Anthropic server-side search ${d("(beta)")}`,
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

async function main() {
	p.intro(chalk.hex("#05C168").bold("MCP Demo Agent") + chalk.dim(" — MCPconf London 2026"));

	if (!process.env.STACKONE_API_KEY) p.log.warn("STACKONE_API_KEY not set");
	if (!process.env.ANTHROPIC_API_KEY)
		p.log.warn("ANTHROPIC_API_KEY not set");
	if (AVAILABLE_PROVIDERS.length === 0)
		p.log.warn("providers.json not found. Copy providers.example.json.");

	showHelp();

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const promptLoop = () => {
		rl.question(chalk.hex("#05C168")("❯ "), async (input) => {
			const trimmed = input.trim();

			if (trimmed === "/quit" || trimmed === "/exit") {
				await cleanupAll();
				p.outro("Goodbye!");
				rl.close();
				process.exit(0);
			}

			if (trimmed === "/help") {
				showHelp();
			} else if (trimmed === "/providers") {
				const lines = AVAILABLE_PROVIDERS.map((a) => {
					const data = providers.get(a.id);
					return data
						? `  ${S.ok("●")} ${S.brand(a.provider.padEnd(15))} ${S.muted(data.tools + " tools")}`
						: `  ${S.muted("○")} ${chalk.white(a.provider.padEnd(15))} ${S.muted("not connected")}`;
				});
				if (LOCAL_MCP_PROVIDERS.length > 0) {
					lines.push("");
					lines.push(S.label("  Local MCP servers:"));
					for (const l of LOCAL_MCP_PROVIDERS) {
						const data = providers.get(l.id);
						lines.push(data
							? `  ${S.ok("●")} ${S.brand(l.provider.padEnd(15))} ${S.muted(data.tools + " tools")} ${S.muted("(local)")}`
							: `  ${S.muted("○")} ${chalk.white(l.provider.padEnd(15))} ${S.muted("not connected")} ${S.muted("(local)")}`);
					}
				}
				p.note(lines.join("\n"), S.brand("📋 Providers"));
			} else if (trimmed === "/connected") {
				if (providers.size === 0) {
					p.log.info(S.muted("No providers connected. Use ") + S.cmd("/add <provider>") + S.muted(" to connect."));
				} else {
					const lines = Array.from(providers.values()).map(
						(a) => `  ${S.ok("●")} ${S.brand(a.name.padEnd(15))} ${S.muted(a.tools + " tools")}`,
					);
					p.note(lines.join("\n"), S.brand("🔗 Connected"));
				}
			} else if (trimmed === "/tools") {
				const byProvider = new Map<string, string[]>();
				for (const [, tool] of allTools) {
					if (!byProvider.has(tool.provider))
						byProvider.set(tool.provider, []);
					byProvider.get(tool.provider)!.push(tool.name);
				}
				if (builtinToolsEnabled) {
					byProvider.set("Built-in (Anthropic)", BUILTIN_TOOLS.map((t) => t.name));
				}
				if (anthropicCodeEnabled) {
					byProvider.set("Anthropic Sandbox", [CODE_EXECUTION_TOOL.name]);
				}
				const extraCount = (builtinToolsEnabled ? BUILTIN_TOOLS.length : 0) + (anthropicCodeEnabled ? 1 : 0);
				const totalCount = allTools.size + extraCount;
				const lines = Array.from(byProvider.entries()).map(
					([provider, tools]) =>
						`  ${S.brand(provider)} ${S.muted("(" + tools.length + ")")}  ${S.accent(tools.slice(0, 5).join(", "))}${tools.length > 5 ? S.muted(" +" + (tools.length - 5) + " more") : ""}`,
				);
				p.note(lines.join("\n"), S.brand(`🔧 Tools (${totalCount})`));
			} else if (trimmed === "/add-all") {
				const unconnectedCloud = AVAILABLE_PROVIDERS.filter((a) => !providers.has(a.id));
				const unconnectedLocal = LOCAL_MCP_PROVIDERS.filter((l) => !providers.has(l.id));
				if (unconnectedCloud.length === 0 && unconnectedLocal.length === 0 && builtinToolsEnabled) {
					p.log.info(S.muted("Everything already connected."));
				} else {
					if (!builtinToolsEnabled) {
						builtinToolsEnabled = true;
						p.log.success(`Built-in tools ${chalk.bgHex("#05C168").black(" ON ")}: ${S.accent(BUILTIN_TOOLS.map((t) => t.name).join(", "))}`);
					}
					for (const entry of unconnectedCloud) {
						await addProvider(entry.provider);
					}
					for (const entry of unconnectedLocal) {
						await addProvider(entry.provider);
					}
				}
			} else if (trimmed.startsWith("/add ")) {
				const provider = trimmed
					.slice(5)
					.trim()
					.replace(/^["']|["']$/g, "");
				await addProvider(provider);
			} else if (trimmed === "/usage") {
				await showUsage(true);
			} else if (trimmed === "/code") {
				if (discovery.isEnabled()) discovery.cleanup();
				if (search.isEnabled()) search.cleanup();
				await codeMode.toggle(
					allTools,
					providers,
					MCP_BASE_URL,
					getAuthHeader(),
					renderDashboard,
				);
			} else if (trimmed === "/acode") {
				anthropicCodeEnabled = !anthropicCodeEnabled;
				if (anthropicCodeEnabled) {
					p.log.success(`Anthropic code execution ${chalk.bgCyan.black(" ON ")} ${S.muted("(server-side sandbox)")}`);
				} else {
					p.log.info(`Anthropic code execution ${S.muted("OFF")}`);
				}
				renderDashboard();
			} else if (trimmed === "/discover") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (search.isEnabled()) search.cleanup();
				discovery.toggle(allTools.size, renderDashboard);
			} else if (trimmed === "/search") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (discovery.isEnabled()) discovery.cleanup();
				await search.toggle(allTools, renderDashboard);
			} else if (trimmed === "/defaults") {
				builtinToolsEnabled = !builtinToolsEnabled;
				if (builtinToolsEnabled) {
					const names = BUILTIN_TOOLS.map((t) => t.name);
					p.log.success(`Built-in tools ${chalk.bgHex("#05C168").black(" ON ")}: ${S.accent(names.join(", "))}`);
				} else {
					p.log.info(`Built-in tools ${S.muted("OFF")}`);
				}
				renderDashboard();
			} else if (trimmed === "/defend") {
				await defense.toggle(renderDashboard);
			} else if (trimmed === "/reset") {
				await cleanupAll();
				providers.clear();
				allTools.clear();
				actualInputTokens = null;
				lastProvider = "-";
				lastAction = "-";
				lastLatencyMs = null;
				lastMessages = [];
				lastTools = [];
				lastSystemPrompt = undefined;
				turnTokenHistory = [];
				cachedBaselineTokens = null;
				builtinToolsEnabled = false;
				anthropicCodeEnabled = false;
				p.log.success("Reset complete");
				renderDashboard();
			} else if (trimmed.length > 0) {
				await runAgent(trimmed);
			}

			promptLoop();
		});
	};

	promptLoop();
}

main().catch(console.error);
