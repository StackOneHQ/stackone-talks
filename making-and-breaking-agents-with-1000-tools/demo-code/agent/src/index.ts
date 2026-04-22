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
import { BUILTIN_TOOLS, WEB_FETCH_BETA, CODE_EXECUTION_BETA, CODE_EXECUTION_TOOL } from "./builtin-tools.js";
import { S, badge } from "./display.js";
import {
	buildAnthropicTools,
	showHelp,
	renderDashboard,
	showUsage,
	executeMcpTool,
	logServerBlock,
} from "./util.js";

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

// Conversation history persists across runAgent() calls
let conversationMessages: Anthropic.MessageParam[] = [];
// Usage tracking: stores state from the most recent runAgent() call
let lastTools: Anthropic.Tool[] = [];
let lastSystemPrompt: string | undefined;
let turnTokenHistory: number[] = [];
let cachedBaselineTokens: number | null = null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// ---------------------------------------------------------------------------
// State-bound wrappers for util functions
// ---------------------------------------------------------------------------

function dashboard() {
	renderDashboard({
		isCodeMode: codeMode.isCodeMode(),
		isASearch: discovery.isEnabled(),
		isSearch: search.isEnabled(),
		isDefense: defense.isEnabled(),
		toolCount: allTools.size,
		providers: Array.from(providers.values()).map((v) => ({ name: v.name, tools: v.tools })),
		builtinToolsEnabled,
		anthropicCodeEnabled,
		actualInputTokens,
		lastProvider,
		lastAction,
		lastLatencyMs,
		cachedBaselineTokens,
	});
}

function buildCurrentTools(): { tools: any[]; systemPrompt?: string } {
	let tools: any[] = [];
	let systemPrompt: string | undefined;
	if (codeMode.isCodeMode()) {
		tools = codeMode.buildCodeModeTools();
		systemPrompt = codeMode.buildSystemPrompt();
	} else if (discovery.isEnabled()) {
		tools = discovery.wrapTools(buildAnthropicTools(allTools));
	} else if (search.isEnabled()) {
		tools = search.buildTools();
		systemPrompt = search.buildSystemPrompt();
	} else {
		tools = buildAnthropicTools(allTools);
	}
	if (builtinToolsEnabled) tools = [...tools, ...BUILTIN_TOOLS];
	if (anthropicCodeEnabled) tools = [...tools, CODE_EXECUTION_TOOL];
	if (defense.isEnabled()) systemPrompt = (systemPrompt ?? "") + "\n\n" + defense.getSystemInstructions();
	return { tools, systemPrompt };
}

async function usage(verbose = false) {
	const current = buildCurrentTools();
	await showUsage({
		anthropic,
		allTools,
		currentTools: current.tools,
		currentSystemPrompt: current.systemPrompt,
		conversationMessages,
		lastTools: lastTools as any[],
		lastSystemPrompt,
		actualInputTokens,
		turnTokenHistory,
		cachedBaselineTokens,
		onBaselineMeasured: (n) => { cachedBaselineTokens = n; },
	}, verbose);
}

const execTool = (name: string, args: Record<string, unknown>) =>
	executeMcpTool(allTools, providers, name, args);

// ---------------------------------------------------------------------------
// Provider management (MCP connection)
// ---------------------------------------------------------------------------

async function addProvider(providerName: string) {
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
		const client = new Client({ name: `demo-${name}`, version: "1.0.0" });

		if (localEntry) {
			const transport = new StdioClientTransport({
				command: localEntry.command,
				args: localEntry.args,
				stderr: "pipe",
			});
			await client.connect(transport);
		} else {
			const authToken = Buffer.from(`${process.env.STACKONE_API_KEY}:`).toString("base64");
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

		providers.set(id, { name, tools: toolCount, client });
		p.log.success(
			`${name} (+${toolCount} tools, ${allTools.size}${builtinToolsEnabled ? " + " + BUILTIN_TOOLS.length + " built-in" : ""}${anthropicCodeEnabled ? " + 1 sandbox" : ""} total)`,
		);

		await usage();
		dashboard();
	} catch (error: any) {
		p.log.error(`Failed to connect ${name}: ${error.message}`);
	}
}

// ---------------------------------------------------------------------------
// Agent loop (multi-turn)
// ---------------------------------------------------------------------------

async function handleDefaultToolUse(
	block: { id: string; name: string; input: any },
): Promise<{ toolResult: Anthropic.ToolResultBlockParam; lastProvider: string; lastAction: string }> {
	const result = await execTool(block.name, block.input as Record<string, unknown>);
	return {
		toolResult: { type: "tool_result", tool_use_id: block.id, content: result.content },
		lastProvider: result.provider,
		lastAction: block.name,
	};
}

async function runAgent(prompt: string) {
	if (!anthropic) {
		p.log.error("ANTHROPIC_API_KEY not set");
		return;
	}

	p.log.step("Processing with Claude...");
	const startTime = Date.now();
	turnTokenHistory = [];

	// Pre-flight checks for code mode
	if (codeMode.isCodeMode()) {
		if (providers.size === 0) {
			p.log.warn("No providers connected. Use /add <provider> first.");
			return;
		}
		const sandbox = codeMode.getSandbox();
		if (!sandbox || !sandbox.isRunning()) {
			p.log.step("Sandbox not ready, setting up...");
			await codeMode.setup(allTools, MCP_BASE_URL, getAuthHeader());
		}
	}

	const { tools, systemPrompt } = buildCurrentTools();

	// Log what mode we're in
	if (codeMode.isCodeMode()) p.log.info(`Code mode: 2 tools (search + execute), ${allTools.size} tools indexed`);
	else if (discovery.isEnabled()) p.log.info(`Anthropic search: ${allTools.size} tools deferred`);
	else if (search.isEnabled()) p.log.info(`Search mode: 2 meta-tools (${allTools.size} indexed)`);
	else if (allTools.size > 100) p.log.warn(`Loading ${tools.length} tool definitions into context...`);

	try {
		// Append new user message to persistent conversation history
		conversationMessages.push({ role: "user", content: prompt });
		let turnCount = 0;

		while (turnCount < 10) {
			turnCount++;
			const turnStart = Date.now();

			const createParams: any = {
				model: MODEL,
				max_tokens: 8192,
				...(tools.length > 0 ? { tools } : {}),
				...(systemPrompt ? { system: systemPrompt } : {}),
				messages: conversationMessages,
			};

			const betas = [
				...(anthropicCodeEnabled ? [CODE_EXECUTION_BETA] : []),
				...(builtinToolsEnabled ? [WEB_FETCH_BETA] : []),
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
				} else if (block.type === "tool_use") {
					const handled =
						await search.handleToolUse(block, execTool)
						?? await codeMode.handleToolUse(block, () =>
							codeMode.setup(allTools, MCP_BASE_URL, getAuthHeader()),
						)
						?? await handleDefaultToolUse(block);

					if (handled) {
						lastProvider = handled.lastProvider;
						lastAction = handled.lastAction;
						toolResults.push(handled.toolResult);
					}
				} else {
					const state = logServerBlock(block as any, allTools.size);
					if (state.lastProvider) lastProvider = state.lastProvider;
					if (state.lastAction) lastAction = state.lastAction;
				}
			}

			// Always append assistant response to conversation history
			conversationMessages.push({ role: "assistant", content: response.content });

			if (toolResults.length === 0) break;
			conversationMessages.push({ role: "user", content: toolResults });
		}

		lastTools = [...tools];
		lastSystemPrompt = systemPrompt;
		lastLatencyMs = Date.now() - startTime;
		p.log.step(`Response time: ${lastLatencyMs}ms`);
		dashboard();
	} catch (error: any) {
		if (error instanceof Anthropic.BadRequestError) {
			p.note(
				[
					error.message,
					"",
					"The agent could not process your request.",
					"Tool definitions + accumulated raw responses filled the context window.",
					"All conversation context has been lost.",
				].join("\n"),
				chalk.red.bold("💥 CONTEXT WINDOW EXCEEDED"),
			);
		} else {
			p.log.error(error.message || String(error));
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

async function main() {
	p.intro(chalk.hex("#05C168").bold("MCP Demo Agent") + chalk.dim(" — MCPconf London 2026"));

	if (!process.env.STACKONE_API_KEY) p.log.warn("STACKONE_API_KEY not set");
	if (!process.env.ANTHROPIC_API_KEY) p.log.warn("ANTHROPIC_API_KEY not set");
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
				const lines: string[] = [];
				let totalCount = 0;

				if (search.isEnabled()) {
					const searchTools = search.buildTools();
					totalCount = searchTools.length;
					lines.push(`  ${S.brand("Search")} ${S.muted("(" + searchTools.length + ")")}  ${S.accent(searchTools.map((t) => t.name).join(", "))}`);
					lines.push(`  ${S.muted(allTools.size + " tools indexed (not in context)")}`);
				} else if (discovery.isEnabled()) {
					totalCount = 1;
					lines.push(`  ${S.brand("Anthropic Search")} ${S.muted("(1)")}  ${S.accent("tool_search_tool_bm25")}`);
					lines.push(`  ${S.muted(allTools.size + " tools deferred (loaded on demand)")}`);
				} else if (codeMode.isCodeMode()) {
					totalCount = 1;
					lines.push(`  ${S.brand("Code Mode")} ${S.muted("(1)")}  ${S.accent("execute_code")}`);
					lines.push(`  ${S.muted(allTools.size + " tools available via sandbox")}`);
				} else {
					const byProvider = new Map<string, string[]>();
					for (const [, tool] of allTools) {
						if (!byProvider.has(tool.provider))
							byProvider.set(tool.provider, []);
						byProvider.get(tool.provider)!.push(tool.name);
					}
					totalCount = allTools.size;
					for (const [provider, provTools] of byProvider) {
						lines.push(
							`  ${S.brand(provider)} ${S.muted("(" + provTools.length + ")")}  ${S.accent(provTools.slice(0, 5).join(", "))}${provTools.length > 5 ? S.muted(" +" + (provTools.length - 5) + " more") : ""}`,
						);
					}
				}

				if (builtinToolsEnabled) {
					totalCount += BUILTIN_TOOLS.length;
					lines.push(`  ${S.brand("Built-in (Anthropic)")} ${S.muted("(" + BUILTIN_TOOLS.length + ")")}  ${S.accent(BUILTIN_TOOLS.map((t) => t.name).join(", "))}`);
				}
				if (anthropicCodeEnabled) {
					totalCount += 1;
					lines.push(`  ${S.brand("Anthropic Sandbox")} ${S.muted("(1)")}  ${S.accent(CODE_EXECUTION_TOOL.name)}`);
				}
				p.note(lines.join("\n"), S.brand(`🔧 Tools (${totalCount})`));
			} else if (trimmed === "/add-all") {
				const unconnectedCloud = AVAILABLE_PROVIDERS.filter((a) => !providers.has(a.id));
				const unconnectedLocal = LOCAL_MCP_PROVIDERS.filter((l) => !providers.has(l.id));
				if (unconnectedCloud.length === 0 && unconnectedLocal.length === 0 && builtinToolsEnabled) {
					p.log.info(S.muted("Everything already connected."));
				} else {
					if (!builtinToolsEnabled) {
						builtinToolsEnabled = true;
						p.log.success(`Built-in tools ${badge.on}: ${S.accent(BUILTIN_TOOLS.map((t) => t.name).join(", "))}`);
					}
					for (const entry of unconnectedCloud) {
						await addProvider(entry.provider);
					}
					for (const entry of unconnectedLocal) {
						await addProvider(entry.provider);
					}
				}
			} else if (trimmed.startsWith("/add ")) {
				const provider = trimmed.slice(5).trim().replace(/^["']|["']$/g, "");
				await addProvider(provider);
			} else if (trimmed === "/usage") {
				await usage(true);
			} else if (trimmed === "/code") {
				if (discovery.isEnabled()) discovery.cleanup();
				if (search.isEnabled()) search.cleanup();
				await codeMode.toggle(allTools, providers, MCP_BASE_URL, getAuthHeader(), dashboard);
			} else if (trimmed === "/acode") {
				anthropicCodeEnabled = !anthropicCodeEnabled;
				if (anthropicCodeEnabled) {
					p.log.success(`Anthropic code execution ${badge.anthropic} ${S.muted("(server-side sandbox)")}`);
				} else {
					p.log.info(`Anthropic code execution ${S.muted("OFF")}`);
				}
				dashboard();
			} else if (trimmed === "/asearch") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (search.isEnabled()) search.cleanup();
				discovery.toggle(allTools.size, dashboard);
			} else if (trimmed === "/search") {
				if (codeMode.isCodeMode()) await codeMode.cleanup();
				if (discovery.isEnabled()) discovery.cleanup();
				await search.toggle(allTools, dashboard);
			} else if (trimmed === "/defaults") {
				builtinToolsEnabled = !builtinToolsEnabled;
				if (builtinToolsEnabled) {
					p.log.success(`Built-in tools ${badge.on}: ${S.accent(BUILTIN_TOOLS.map((t) => t.name).join(", "))}`);
				} else {
					p.log.info(`Built-in tools ${S.muted("OFF")}`);
				}
				dashboard();
			} else if (trimmed === "/defend") {
				await defense.toggle(dashboard);
			} else if (trimmed === "/reset") {
				await cleanupAll();
				providers.clear();
				allTools.clear();
				actualInputTokens = null;
				lastProvider = "-";
				lastAction = "-";
				lastLatencyMs = null;
				conversationMessages = [];
				lastTools = [];
				lastSystemPrompt = undefined;
				turnTokenHistory = [];
				cachedBaselineTokens = null;
				builtinToolsEnabled = false;
				anthropicCodeEnabled = false;
				p.log.success("Reset complete");
				dashboard();
			} else if (trimmed.length > 0) {
				await runAgent(trimmed);
			}

			promptLoop();
		});
	};

	promptLoop();
}

main().catch(console.error);
