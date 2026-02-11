import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import * as p from "@clack/prompts";
import chalk from "chalk";
import * as readline from "readline";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import * as codeMode from "./code-mode.js";
import * as discovery from "./discovery-mode.js";
import * as search from "./search-mode.js";
import * as defense from "./defense-mode.js";

// ---------------------------------------------------------------------------
// Config & state
// ---------------------------------------------------------------------------

const MODEL = "claude-sonnet-4-5-20250929";
const MCP_BASE_URL = "https://api.stackone.com/mcp";
const CONTEXT_WINDOW = 200_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
let AVAILABLE_ACCOUNTS: { id: string; provider: string }[] = [];
try {
	AVAILABLE_ACCOUNTS = JSON.parse(
		readFileSync(resolve(__dirname, "../accounts.json"), "utf-8"),
	);
} catch {}

const accounts = new Map<
	string,
	{ name: string; tools: number; client: Client }
>();
const allTools = new Map<string, any>();
let actualInputTokens: number | null = null;
let lastProvider = "-";
let lastAction = "-";
let lastLatencyMs: number | null = null;

// Usage tracking: stores state from the most recent runAgent() call
let lastMessages: Anthropic.MessageParam[] = [];
let lastTools: Anthropic.Tool[] = [];
let lastSystemPrompt: string | undefined;
let turnTokenHistory: number[] = [];
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

function getAuthHeader(): string {
	return (
		"Basic " +
		Buffer.from((process.env.STACKONE_API_KEY || "") + ":").toString("base64")
	);
}

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

function contextBar(tokens: number, width = 30): string {
	const pct = Math.min(tokens / CONTEXT_WINDOW, 1);
	const filled = Math.round(pct * width);
	const icon = pct > 0.75 ? "🔴" : pct > 0.5 ? "🟡" : "🟢";
	return `${icon} ${"█".repeat(filled)}${"░".repeat(width - filled)} ${(pct * 100).toFixed(0)}%`;
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
			`Total:        ${totalTokens.toLocaleString()} tokens (${pct}% of ${CONTEXT_WINDOW / 1000}k)`,
			`  Baseline:   ${baseline.toLocaleString()} (tools + system prompt)`,
			`  Convo:      ${conversation.toLocaleString()} (messages + tool results)`,
			`Remaining:    ${remaining.toLocaleString()} tokens`,
			contextBar(totalTokens),
		];

		if (actualInputTokens !== null) {
			lines.push("");
			lines.push(`API reported: ${actualInputTokens.toLocaleString()} input_tokens (last turn)`);
		}

		if (turnTokenHistory.length > 1) {
			lines.push("");
			lines.push("Per-turn growth:");
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
					`  ${provider.padEnd(16)} ${count} tools ≈ ${(count * avgPerTool).toLocaleString()} tokens`,
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
		`Tools:     ${allTools.size}`,
		`Baseline:  ${tokens.toLocaleString()} tokens (${pct}% of ${CONTEXT_WINDOW / 1000}k window)`,
		`Per tool:  ~${avgPerTool} tokens`,
		`Remaining: ${remaining.toLocaleString()} tokens`,
		contextBar(tokens),
		"",
		"(This is the baseline cost before any conversation.)",
		"(Send a prompt for actual usage breakdown.)",
	];

	const byProvider = new Map<string, number>();
	for (const [, tool] of allTools) {
		byProvider.set(tool.provider, (byProvider.get(tool.provider) || 0) + 1);
	}
	for (const [provider, count] of byProvider) {
		lines.push(
			`  ${provider.padEnd(16)} ${count} tools ≈ ${(count * avgPerTool).toLocaleString()} tokens`,
		);
	}

	if (tokens > CONTEXT_WINDOW * 0.5) {
		lines.push("");
		lines.push(`⚠ ${pct}% of context used by tool definitions alone.`);
		lines.push("The model hasn't even seen your question yet.");
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

	const lines: string[] = [];

	if (isCode) {
		lines.push(`Mode:     CODE (1 tool, was ${allTools.size})`);
	} else if (isDisco) {
		lines.push(`Mode:     DISCOVERY (${allTools.size} tools deferred)`);
	} else if (isSearch) {
		lines.push(`Mode:     SEARCH (2 meta-tools, ${allTools.size} indexed)`);
	} else {
		lines.push(`Mode:     MCP (${allTools.size} tools in context)`);
	}

	if (actualInputTokens !== null) {
		const pct = ((actualInputTokens / CONTEXT_WINDOW) * 100).toFixed(0);
		lines.push(
			`Tokens:   ${actualInputTokens.toLocaleString()} (${pct}% of ${CONTEXT_WINDOW / 1000}k)`,
		);
	} else {
		const est = isCode
			? "~500"
			: isSearch
				? "~1k"
				: `~${(allTools.size * 150).toLocaleString()}`;
		lines.push(`Tokens:   ${est} est.`);
	}

	if (defense.isEnabled()) {
		lines.push(`Defense:  ON`);
	}
	lines.push(`Accounts: ${accounts.size}`);
	if (lastLatencyMs !== null) lines.push(`Latency:  ${lastLatencyMs}ms`);
	lines.push(`Last:     ${lastProvider} → ${lastAction}`);

	if (accounts.size > 0) {
		lines.push("");
		lines.push(
			Array.from(accounts.values())
				.map((a) => `${a.name}(${a.tools})`)
				.join(", "),
		);
	}

	if (!isCode && !isDisco && !isSearch && allTools.size > 1000) {
		lines.push("");
		lines.push("🚨 CRITICAL: Over 1,000 tools. Context overload!");
	} else if (!isCode && !isDisco && !isSearch && allTools.size > 500) {
		lines.push("");
		lines.push("⚠ Warning: Tool count > 500. Performance degrading.");
	}

	const title = isCode
		? "💻 CODE MODE"
		: isDisco
			? "🔍 DISCOVERY MODE"
			: isSearch
				? "🔎 SEARCH MODE"
				: "📊 MCP DEMO";
	p.note(lines.join("\n"), title);
}

// ---------------------------------------------------------------------------
// Account management (MCP connection)
// ---------------------------------------------------------------------------

async function addAccount(providerName: string) {
	const account = AVAILABLE_ACCOUNTS.find(
		(a) =>
			a.provider.toLowerCase() === providerName.toLowerCase() ||
			a.id === providerName,
	);
	if (!account) {
		p.log.error(`Unknown provider: ${providerName}`);
		p.log.message(
			"Available: " + AVAILABLE_ACCOUNTS.map((a) => a.provider).join(", "),
		);
		return;
	}
	if (accounts.has(account.id)) {
		p.log.warn(`${account.provider} already connected`);
		return;
	}
	if (!process.env.STACKONE_API_KEY) {
		p.log.error("STACKONE_API_KEY not set");
		return;
	}

	p.log.step(`Connecting to ${account.provider}...`);

	try {
		const client = new Client({
			name: `demo-${account.provider}`,
			version: "1.0.0",
		});
		const authToken = Buffer.from(
			`${process.env.STACKONE_API_KEY}:`,
		).toString("base64");
		const transport = new StreamableHTTPClientTransport(
			new URL(MCP_BASE_URL),
			{
				requestInit: {
					headers: {
						Authorization: `Basic ${authToken}`,
						"x-account-id": account.id,
						"Content-Type": "application/json",
						Accept: "application/json, text/event-stream",
					},
				},
			},
		);

		await client.connect(transport);
		const toolsResult = await client.listTools();
		const toolCount = toolsResult.tools?.length || 0;

		for (const tool of toolsResult.tools || []) {
			allTools.set(`${account.provider}::${tool.name}`, {
				...tool,
				provider: account.provider,
				accountId: account.id,
			});
		}

		accounts.set(account.id, {
			name: account.provider,
			tools: toolCount,
			client,
		});
		p.log.success(
			`${account.provider} (+${toolCount} tools, ${allTools.size} total)`,
		);

		await showUsage();
		renderDashboard();
	} catch (error: any) {
		p.log.error(`Failed to connect ${account.provider}: ${error.message}`);
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
		if (accounts.size === 0) {
			p.log.warn("No accounts connected. Use /add <provider> first.");
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

			// Discovery mode needs the tool-search beta header
			const response: any = isDisco
				? await anthropic.messages.create(createParams, {
						headers: { "anthropic-beta": discovery.BETA },
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
					// Discovery mode: tool search happened server-side
					const query =
						block.input?.query || block.input?.pattern || "";
					p.log.step(`🔍 Tool search: "${query}"`);
				} else if (block.type === "tool_use") {
					if (isSearch && block.name === "meta_search_tools") {
						// Search mode: client-side BM25 + TF-IDF search
						const input = block.input as { query: string; limit?: number };
						p.log.step(`🔎 Searching: "${input.query}"`);
						const results = search.handleSearch(input);
						const resultStr = JSON.stringify(results);
						p.log.success(
							`Found ${results.tools.length} tools: ${results.tools.map((t) => t.name).join(", ")}`,
						);
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
							const accountData = accounts.get(toolInfo.accountId);
							if (accountData?.client) {
								try {
									const result = await accountData.client.callTool({
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
								p.log.error(`No MCP client for account ${toolInfo.accountId}`);
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
							const accountData = accounts.get(
								toolInfo.accountId,
							);
							if (accountData?.client) {
								try {
									const result =
										await accountData.client.callTool({
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
									`No MCP client for account ${toolInfo.accountId}`,
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
			lines.push("Tool definitions alone filled the context window.");
			lines.push("All conversation context has been lost.");

			p.note(
				lines.join("\n"),
				"💥 CONTEXT WINDOW EXCEEDED — AGENT CRASHED",
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
	for (const account of accounts.values()) {
		await account.client.close().catch(() => {});
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
	p.note(
		[
			"/add <provider>  Connect a StackOne account",
			"/accounts        List available accounts",
			"/connected       Show connected accounts",
			"/tools           List loaded tools by provider",
			"/usage           Show context window usage",
			"/code            Toggle code mode (sandbox)",
			"/discover        Toggle discovery mode (Anthropic tool search)",
			"/search          Toggle search mode (client-side BM25 + TF-IDF)",
			"/defend          Toggle prompt injection defense on tool results",
			"/reset           Disconnect all accounts",
			"/help            Show this help",
			"/quit            Exit",
			"",
			"Or type any prompt to query the agent.",
		].join("\n"),
		"📖 Commands",
	);
}

async function main() {
	p.intro("MCP Demo Agent — MCPconf London 2026");

	if (!process.env.STACKONE_API_KEY) p.log.warn("STACKONE_API_KEY not set");
	if (!process.env.ANTHROPIC_API_KEY)
		p.log.warn("ANTHROPIC_API_KEY not set");
	if (AVAILABLE_ACCOUNTS.length === 0)
		p.log.warn("accounts.json not found. Copy accounts.example.json.");

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
			} else if (trimmed === "/accounts") {
				const lines = AVAILABLE_ACCOUNTS.map((a) => {
					const data = accounts.get(a.id);
					return data
						? `  ✓ ${a.provider.padEnd(15)} ${data.tools} tools`
						: `  ○ ${a.provider.padEnd(15)} not connected`;
				});
				p.note(lines.join("\n"), "Available Accounts");
			} else if (trimmed === "/connected") {
				if (accounts.size === 0) {
					p.log.info("No accounts connected.");
				} else {
					const lines = Array.from(accounts.values()).map(
						(a) => `  ✓ ${a.name.padEnd(15)} ${a.tools} tools`,
					);
					p.note(lines.join("\n"), "Connected Accounts");
				}
			} else if (trimmed === "/tools") {
				const byProvider = new Map<string, string[]>();
				for (const [, tool] of allTools) {
					if (!byProvider.has(tool.provider))
						byProvider.set(tool.provider, []);
					byProvider.get(tool.provider)!.push(tool.name);
				}
				const lines = Array.from(byProvider.entries()).map(
					([provider, tools]) =>
						`${provider} (${tools.length}): ${tools.slice(0, 5).join(", ")}${tools.length > 5 ? "..." : ""}`,
				);
				p.note(lines.join("\n"), `Loaded Tools (${allTools.size})`);
			} else if (trimmed.startsWith("/add ")) {
				const provider = trimmed
					.slice(5)
					.trim()
					.replace(/^["']|["']$/g, "");
				await addAccount(provider);
			} else if (trimmed === "/usage") {
				await showUsage(true);
			} else if (trimmed === "/code") {
				if (discovery.isEnabled()) discovery.cleanup();
				if (search.isEnabled()) search.cleanup();
				await codeMode.toggle(
					allTools,
					accounts,
					MCP_BASE_URL,
					getAuthHeader(),
					renderDashboard,
				);
			} else if (trimmed === "/discover") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (search.isEnabled()) search.cleanup();
				discovery.toggle(allTools.size, renderDashboard);
			} else if (trimmed === "/search") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (discovery.isEnabled()) discovery.cleanup();
				search.toggle(allTools, renderDashboard);
			} else if (trimmed === "/defend") {
			await defense.toggle(renderDashboard);
		} else if (trimmed === "/reset") {
				await cleanupAll();
				accounts.clear();
				allTools.clear();
				actualInputTokens = null;
				lastProvider = "-";
				lastAction = "-";
				lastLatencyMs = null;
				lastMessages = [];
				lastTools = [];
				lastSystemPrompt = undefined;
				turnTokenHistory = [];
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
