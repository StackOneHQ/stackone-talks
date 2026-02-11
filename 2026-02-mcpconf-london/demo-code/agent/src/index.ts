import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createPersistentSandbox, type PersistentSandbox } from "./sandbox.js";
import chalk from "chalk";
import * as readline from "readline";
import "dotenv/config";

// Constants
const MCP_BASE_URL = "https://api.stackone.com/mcp";

// Dashboard state
interface DashboardState {
  toolCount: number;
  tokenEstimate: number;
  actualInputTokens: number | null; // from API response.usage
  lastProvider: string;
  lastAction: string;
  lastLatencyMs: number | null;
  accounts: Map<string, { name: string; tools: number; client?: Client }>;
}

const dashboard: DashboardState = {
  toolCount: 0,
  tokenEstimate: 0,
  actualInputTokens: null,
  lastProvider: "-",
  lastAction: "-",
  lastLatencyMs: null,
  accounts: new Map(),
};

// Real StackOne accounts with actual tool counts
const AVAILABLE_ACCOUNTS = [
  { id: "j7ahtiKsIeDWLKWvdLT2o", provider: "Gmail", toolCount: 42 },
  { id: "GlSyNhL2kMnc7ufbyoy8R", provider: "Trello", toolCount: 109 },
  { id: "kRm6w3fUMpzpsQR19mOUT", provider: "Gong", toolCount: 16 },
  { id: "lxujn4SLe8d6u3VuwDJ91", provider: "GitHub", toolCount: 74 },
  { id: "MFQob34emXsdPpqKd07CO", provider: "HubSpot", toolCount: 65 },
  { id: "xOclkfmMw7OIeEV0iiZkI", provider: "Ashby", toolCount: 108 },
  { id: "47336761421214075533", provider: "Zendesk", toolCount: 45 },
  { id: "8pJAk5Zcm7tNS0BJLBSAD", provider: "Honeycomb", toolCount: 28 },
  { id: "UTeyrycq6tVPIr4WPkSsp", provider: "Range", toolCount: 22 },
  { id: "ULaAZD6pw2C5PQzrLs8y0", provider: "Browserbase", toolCount: 18 },
  { id: "8awoZle1L0anIueVlE0Oe", provider: "Jira", toolCount: 158 },
  { id: "lKnIwJ8VDvaZw0CQWw1IP", provider: "Humaans", toolCount: 51 },
  { id: "04Rcfz28ZvPtE23Fi2kmv", provider: "Datadog", toolCount: 26 },
  { id: "kIMNxuuF5XxggdOZA6LVM", provider: "Google Docs", toolCount: 3 },
  { id: "MXZCxL08BUuWIDHSlJ3St", provider: "Google Drive", toolCount: 47 },
  { id: "xhZBiSjNQZqSy3VVUyxSr", provider: "Google Calendar", toolCount: 37 },
  { id: "oPZLtoxzwbqTf70QydClG", provider: "Fireflies", toolCount: 4 },
  { id: "mzFpTROtXzxHwnVH0mQE6", provider: "Notion", toolCount: 27 },
];

// Default agent tools (built-in capabilities, not from MCP providers)
const DEFAULT_TOOLS = [
  { name: "web_search", description: "Search the web for information" },
  { name: "web_fetch", description: "Fetch and extract content from a URL" },
  { name: "read_file", description: "Read the contents of a file" },
  { name: "write_file", description: "Create or overwrite a file" },
  { name: "edit_file", description: "Make targeted edits to an existing file" },
  { name: "list_directory", description: "List files and directories" },
  { name: "search_files", description: "Search file contents with regex patterns" },
  { name: "bash", description: "Execute shell commands in a sandbox" },
  { name: "python", description: "Execute Python code" },
  { name: "computer_use", description: "Take screenshots and interact with the screen" },
  { name: "text_editor", description: "View and edit text with syntax highlighting" },
  { name: "save_memory", description: "Persist information across sessions" },
  { name: "recall_memory", description: "Retrieve saved information" },
  { name: "create_artifact", description: "Generate documents, diagrams, or files" },
  { name: "calculator", description: "Evaluate mathematical expressions" },
];

let allTools: Map<string, any> = new Map();
let anthropic: Anthropic;

// ---------------------------------------------------------------------------
// Context measurement — shows real token cost BEFORE any query
// Uses Anthropic's count_tokens API to measure tool definition overhead
// ---------------------------------------------------------------------------

const CONTEXT_WINDOW = 200_000; // Haiku 4.5 context window

function buildAnthropicTools(): Anthropic.Tool[] {
  return Array.from(allTools.values()).map((tool) => ({
    name: tool.name,
    description: `[${tool.provider}] ${tool.description || ""}`,
    input_schema: tool.inputSchema || { type: "object", properties: {} },
  }));
}

function renderContextBar(tokens: number, width = 40): string {
  const pct = Math.min(tokens / CONTEXT_WINDOW, 1);
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const color =
    pct > 0.75 ? chalk.red : pct > 0.5 ? chalk.yellow : chalk.green;
  const bar = color("█".repeat(filled)) + chalk.gray("░".repeat(empty));
  const pctStr = (pct * 100).toFixed(0) + "%";
  return `[${bar}] ${pctStr}`;
}

async function measureContext(): Promise<number | null> {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    anthropic = new Anthropic({ apiKey });
  }

  if (allTools.size === 0) return null;

  const tools = buildAnthropicTools();

  try {
    const result = await anthropic.beta.messages.countTokens({
      model: "claude-haiku-4-5-20251001",
      tools: tools as any, // Beta API expects BetaTool[] but same shape
      messages: [{ role: "user", content: "hello" }],
    });
    return result.input_tokens;
  } catch {
    // Fallback: estimate from JSON size (roughly 3.5 chars per token)
    const jsonSize = JSON.stringify(tools).length;
    return Math.round(jsonSize / 3.5);
  }
}

async function showContextUsage(verbose = false) {
  if (allTools.size === 0) return;

  const tokens = await measureContext();
  if (tokens === null) return;

  dashboard.actualInputTokens = tokens;

  // Compact version (after /add)
  if (!verbose) {
    console.log(
      chalk.gray("  Context: ") +
        renderContextBar(tokens) +
        chalk.gray("  ") +
        chalk.bold(tokens.toLocaleString()) +
        chalk.gray(" tokens (before any query)")
    );
    return;
  }

  // Verbose version (/context command)
  const remaining = CONTEXT_WINDOW - tokens;
  const pct = ((tokens / CONTEXT_WINDOW) * 100).toFixed(1);
  const avgPerTool = Math.round(tokens / allTools.size);

  console.log(chalk.bold("\n📊 Context Window Analysis"));
  console.log(chalk.gray("─".repeat(55)));
  console.log(
    chalk.cyan("  Tools loaded:    ") +
      chalk.bold.white(allTools.size.toLocaleString())
  );
  console.log(
    chalk.cyan("  Token cost:      ") +
      chalk.bold.yellow(tokens.toLocaleString()) +
      chalk.gray(` (${pct}% of ${(CONTEXT_WINDOW / 1000).toFixed(0)}k window)`)
  );
  console.log(
    chalk.cyan("  Avg per tool:    ") +
      chalk.white(`~${avgPerTool} tokens`)
  );
  console.log(
    chalk.cyan("  Remaining:       ") +
      (remaining < 50000
        ? chalk.red(remaining.toLocaleString())
        : chalk.green(remaining.toLocaleString())) +
      chalk.gray(" tokens for system prompt + conversation")
  );
  console.log(
    chalk.cyan("  Context bar:     ") + renderContextBar(tokens)
  );

  // Breakdown by provider
  const byProvider = new Map<string, number>();
  for (const [_key, tool] of allTools) {
    byProvider.set(
      tool.provider,
      (byProvider.get(tool.provider) || 0) + 1
    );
  }

  console.log(chalk.gray("─".repeat(55)));
  console.log(chalk.bold("  Per provider (estimated):"));
  for (const [provider, count] of byProvider) {
    const estTokens = count * avgPerTool;
    console.log(
      chalk.gray("    ") +
        chalk.cyan(provider.padEnd(16)) +
        chalk.white(`${count} tools`) +
        chalk.gray(` ≈ ${estTokens.toLocaleString()} tokens`)
    );
  }

  if (tokens > CONTEXT_WINDOW * 0.5) {
    console.log(
      chalk.red(
        `\n  ⚠️  Over ${((tokens / CONTEXT_WINDOW) * 100).toFixed(0)}% of context used by tool definitions alone.`
      )
    );
    console.log(
      chalk.red("  The model hasn't even seen your question yet.")
    );
  }
  console.log(chalk.gray("─".repeat(55)) + "\n");
}

// Code mode state
let codeMode = false;
let sandbox: PersistentSandbox | null = null;

function getAuthHeader(): string {
  const apiKey = process.env.STACKONE_API_KEY || "";
  return "Basic " + Buffer.from(apiKey + ":").toString("base64");
}

function renderDashboard() {
  const width = 55;
  const border = chalk.gray("─".repeat(width));

  console.log("\n" + border);
  if (codeMode) {
    console.log(chalk.bold.hex("#FF6B00")("  💻 CODE MODE DASHBOARD"));
  } else {
    console.log(chalk.bold.hex("#05C168")("  📊 MCP DEMO DASHBOARD"));
  }
  console.log(border);

  if (codeMode) {
    console.log(
      chalk.cyan("  Mode:     ") +
        chalk.bold.hex("#FF6B00")("CODE".padStart(6)) +
        chalk.gray(` (1 tool, was ${dashboard.toolCount})`)
    );
  } else {
    console.log(
      chalk.cyan("  Tools:    ") +
        chalk.bold.yellow(dashboard.toolCount.toLocaleString().padStart(6)) +
        chalk.gray(" loaded in context")
    );
  }

  if (dashboard.actualInputTokens !== null) {
    const pct = ((dashboard.actualInputTokens / 200000) * 100).toFixed(0);
    const tokenColor = dashboard.actualInputTokens > 150000 ? chalk.bold.red : dashboard.actualInputTokens > 80000 ? chalk.bold.yellow : chalk.bold.white;
    console.log(
      chalk.cyan("  Tokens:   ") +
        tokenColor(dashboard.actualInputTokens.toLocaleString().padStart(6)) +
        chalk.gray(` input (${pct}% of 200k context)`)
    );
  } else {
    console.log(
      chalk.cyan("  Tokens:   ") +
        chalk.bold.yellow(
          codeMode
            ? "~500".padStart(6)
            : ("~" + dashboard.tokenEstimate.toLocaleString()).padStart(6)
        ) +
        chalk.gray(codeMode ? " (system prompt)" : " est. (tool definitions)")
    );
  }
  console.log(
    chalk.cyan("  Accounts: ") +
      chalk.bold.white(dashboard.accounts.size.toString().padStart(6))
  );
  if (dashboard.lastLatencyMs !== null) {
    const latencyColor = dashboard.lastLatencyMs > 5000 ? chalk.bold.red : dashboard.lastLatencyMs > 2000 ? chalk.bold.yellow : chalk.bold.green;
    console.log(
      chalk.cyan("  Latency:  ") +
        latencyColor((dashboard.lastLatencyMs + "ms").padStart(6))
    );
  }
  console.log(
    chalk.cyan("  Last:     ") +
      chalk.hex("#05C168")(dashboard.lastProvider) +
      chalk.gray(" → ") +
      chalk.white(dashboard.lastAction)
  );
  console.log(border);

  // Show connected accounts
  if (dashboard.accounts.size > 0) {
    const accountList = Array.from(dashboard.accounts.values())
      .map((a) => `${a.name}(${a.tools})`)
      .join(", ");
    console.log(chalk.gray("  " + accountList));
  }

  // Warnings (only in MCP mode)
  if (!codeMode) {
    if (dashboard.toolCount > 1000) {
      console.log(chalk.red("\n  🚨 CRITICAL: Over 1,000 tools. Context overload!"));
    } else if (dashboard.toolCount > 500) {
      console.log(chalk.yellow("\n  ⚠️  Warning: Tool count > 500. Performance degrading."));
    }
  }

  console.log(border + "\n");
}

async function connectAccount(accountId: string): Promise<boolean> {
  const account = AVAILABLE_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) {
    console.log(chalk.red(`Unknown account: ${accountId}`));
    return false;
  }

  if (dashboard.accounts.has(accountId)) {
    console.log(chalk.yellow(`${account.provider} already connected`));
    return false;
  }

  const apiKey = process.env.STACKONE_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("Error: STACKONE_API_KEY not set"));
    return false;
  }

  console.log(chalk.cyan(`Connecting to ${account.provider}...`));

  try {
    const client = new Client({ name: `demo-${account.provider}`, version: "1.0.0" });
    const authToken = Buffer.from(`${apiKey}:`).toString("base64");

    const transport = new StreamableHTTPClientTransport(
      new URL("https://api.stackone.com/mcp"),
      {
        requestInit: {
          headers: {
            Authorization: `Basic ${authToken}`,
            "x-account-id": accountId,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
        },
      }
    );

    await client.connect(transport);

    // Get tools from this account
    const toolsResult = await client.listTools();
    const toolCount = toolsResult.tools?.length || 0;

    // Store tools with provider prefix
    for (const tool of toolsResult.tools || []) {
      allTools.set(`${account.provider}::${tool.name}`, {
        ...tool,
        provider: account.provider,
        accountId: accountId,
      });
    }

    dashboard.accounts.set(accountId, {
      name: account.provider,
      tools: toolCount,
      client,
    });
    dashboard.toolCount += toolCount;
    dashboard.tokenEstimate = dashboard.toolCount * 150;

    console.log(
      chalk.green(`  ✓ ${account.provider}`) +
        chalk.gray(` (+${toolCount} tools, ${dashboard.toolCount} total)`)
    );

    await showContextUsage();
    renderDashboard();
    return true;
  } catch (error: any) {
    console.log(chalk.red(`  ✗ Failed to connect ${account.provider}: ${error.message}`));
    return false;
  }
}

async function addAccount(providerName: string) {
  const account = AVAILABLE_ACCOUNTS.find(
    (a) => a.provider.toLowerCase() === providerName.toLowerCase() || a.id === providerName
  );
  if (!account) {
    console.log(chalk.red(`Unknown provider: ${providerName}`));
    console.log(
      chalk.gray("Available: " + AVAILABLE_ACCOUNTS.map((a) => a.provider).join(", "))
    );
    return;
  }
  await connectAccount(account.id);
}

async function addDefaults() {
  if (dashboard.accounts.has("defaults")) {
    console.log(chalk.yellow("Default tools already loaded"));
    return;
  }

  console.log(chalk.cyan("Loading agent default tools..."));

  for (const tool of DEFAULT_TOOLS) {
    allTools.set(`Defaults::${tool.name}`, {
      ...tool,
      provider: "Defaults",
      accountId: "defaults",
      inputSchema: { type: "object", properties: {} },
    });
  }

  dashboard.accounts.set("defaults", {
    name: "Defaults",
    tools: DEFAULT_TOOLS.length,
  });
  dashboard.toolCount += DEFAULT_TOOLS.length;
  dashboard.tokenEstimate = dashboard.toolCount * 150;

  console.log(
    chalk.green(`  ✓ Agent defaults`) +
      chalk.gray(` (+${DEFAULT_TOOLS.length} tools: web_search, bash, file ops, etc.)`)
  );

  await showContextUsage();
  renderDashboard();
}

// ---------------------------------------------------------------------------
// Code Mode: sandbox with MCP tool wrappers
// Pattern from poc-execute/examples/stackone_prompt_demo.ts
// ---------------------------------------------------------------------------

async function setupCodeModeSandbox(): Promise<void> {
  if (sandbox) {
    await sandbox.stop();
  }

  sandbox = await createPersistentSandbox({ timeout: 30000 });

  const authHeader = getAuthHeader();
  const toolWrappers: string[] = [];

  for (const [_key, tool] of allTools) {
    // Skip default tools — they're not real MCP endpoints
    if (tool.accountId === "defaults") continue;

    const fnName = tool.name.replace(/-/g, "_");
    const accountId = tool.accountId;

    toolWrappers.push(`
  ${fnName}: async (args) => {
    const res = await fetch("${MCP_BASE_URL}?x-account-id=${accountId}", {
      method: "POST",
      headers: {
        "Authorization": "${authHeader}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "call-" + Date.now(),
        method: "tools/call",
        params: { name: "${tool.name}", arguments: args }
      })
    });
    const data = await res.json();
    if (data.result?.content) {
      const tc = data.result.content.find(c => c.type === "text");
      if (tc?.text) {
        try { return JSON.parse(tc.text); } catch { return tc.text; }
      }
    }
    return data.result || data;
  }`);
  }

  // Note: tool wrappers contain `await` in their bodies, which triggers
  // the sandbox's async wrapper. Use `return` so the result propagates.
  const setupCode = `
globalThis.tools = {${toolWrappers.join(",")}
};
return "Sandbox ready: " + Object.keys(globalThis.tools).length + " tool wrappers loaded"`;

  const result = await sandbox.execute(setupCode);
  if (!result.success) {
    throw new Error(`Sandbox setup failed: ${result.error}`);
  }
  console.log(chalk.gray(`  ${result.result}`));
}

function buildCodeModeSystemPrompt(): string {
  const byProvider = new Map<string, string[]>();
  for (const [_key, tool] of allTools) {
    const provider = tool.provider;
    if (!byProvider.has(provider)) byProvider.set(provider, []);
    const fnName = tool.name.replace(/-/g, "_");
    const desc = (tool.description || "").slice(0, 80);
    byProvider.get(provider)!.push(`  - tools.${fnName}(args): ${desc}`);
  }

  const toolList = Array.from(byProvider.entries())
    .map(([provider, tools]) => {
      const listed = tools.slice(0, 10).join("\n");
      const more = tools.length > 10 ? `\n  ... and ${tools.length - 10} more` : "";
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

function buildExecuteCodeTool(): Anthropic.Tool {
  return {
    name: "execute_code",
    description:
      "Execute TypeScript code in a sandbox with pre-configured MCP tool wrappers. " +
      "Use `await tools.tool_name(args)` to call tools. " +
      "Return a concise, filtered result.",
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

async function toggleCodeMode(): Promise<void> {
  if (codeMode) {
    codeMode = false;
    if (sandbox) {
      await sandbox.stop();
      sandbox = null;
    }
    console.log(chalk.yellow("\n⚡ Switched to MCP mode"));
    console.log(chalk.gray(`   ${dashboard.toolCount} tools loaded in context`));
  } else {
    if (dashboard.accounts.size === 0) {
      console.log(chalk.yellow("No accounts connected. Use /add <provider> first."));
      return;
    }
    console.log(chalk.cyan("\n⚡ Switching to Code mode..."));
    try {
      await setupCodeModeSandbox();
      codeMode = true;
      console.log(chalk.green("  ✓ Code mode active"));
      console.log(chalk.gray(`   1 tool in context (was ${dashboard.toolCount})`));
    } catch (err: any) {
      console.log(chalk.red(`  ✗ Failed to set up sandbox: ${err.message}`));
    }
  }
  renderDashboard();
}

// ---------------------------------------------------------------------------
// Agent loop (supports both MCP mode and Code mode with multi-turn)
// ---------------------------------------------------------------------------

async function runAgent(prompt: string) {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log(chalk.red("Error: ANTHROPIC_API_KEY not set"));
      return;
    }
    anthropic = new Anthropic({ apiKey });
  }

  if (dashboard.accounts.size === 0) {
    console.log(chalk.yellow("No accounts connected. Use /add <provider> first."));
    return;
  }

  console.log(chalk.gray("\n🤖 Processing with Claude..."));

  const startTime = Date.now();

  // Build tools and system prompt based on mode
  let tools: Anthropic.Tool[];
  let systemPrompt: string | undefined;

  if (codeMode) {
    if (!sandbox || !sandbox.isRunning()) {
      console.log(chalk.yellow("  Sandbox not ready, setting up..."));
      await setupCodeModeSandbox();
    }
    tools = [buildExecuteCodeTool()];
    systemPrompt = buildCodeModeSystemPrompt();
    console.log(chalk.cyan(`  Code mode: 1 tool in context`));
  } else {
    tools = buildAnthropicTools();
    if (tools.length > 100) {
      console.log(
        chalk.yellow(`⏳ Loading ${tools.length} tool definitions into context...`)
      );
    }
  }

  try {
    // Multi-turn agent loop
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    let turnCount = 0;
    const maxTurns = 5;

    while (turnCount < maxTurns) {
      turnCount++;

      const turnStart = Date.now();
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        tools,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
      });
      const turnMs = Date.now() - turnStart;

      // Capture actual token usage from API
      if (turnCount === 1 && response.usage) {
        dashboard.actualInputTokens = response.usage.input_tokens;
        const pct = ((response.usage.input_tokens / 200000) * 100).toFixed(0);
        console.log(
          chalk.gray(`  📊 Actual input: `) +
            chalk.bold.yellow(response.usage.input_tokens.toLocaleString()) +
            chalk.gray(` tokens (${pct}% of context window)`) +
            chalk.gray(` · ${turnMs}ms`)
        );
      }

      // Collect tool results for this turn
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          console.log(chalk.white("\n" + block.text));
        } else if (block.type === "tool_use") {
          if (codeMode && block.name === "execute_code") {
            // Code mode: run in sandbox
            const input = block.input as { code: string };
            dashboard.lastAction = "execute_code";
            dashboard.lastProvider = "sandbox";

            // Re-check sandbox is alive (could have crashed between turns)
            if (!sandbox || !sandbox.isRunning()) {
              console.log(chalk.yellow("  Sandbox crashed, restarting..."));
              await setupCodeModeSandbox();
            }

            console.log(chalk.hex("#FF6B00")("\n💻 Code execution:"));
            console.log(chalk.gray("─".repeat(50)));
            console.log(chalk.cyan(input.code));
            console.log(chalk.gray("─".repeat(50)));

            const execResult = await sandbox!.execute(input.code);

            if (execResult.success) {
              const resultStr = JSON.stringify(execResult.result, null, 2);
              console.log(
                chalk.green("  ✓ Result: ") +
                  chalk.gray(
                    resultStr.substring(0, 300) +
                      (resultStr.length > 300 ? "..." : "")
                  )
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: resultStr,
              });
            } else {
              console.log(chalk.red(`  ✗ Error: ${execResult.error}`));
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Error: ${execResult.error}`,
                is_error: true,
              });
            }
          } else {
            // MCP mode: dispatch to MCP client
            const toolKey = Array.from(allTools.keys()).find((k) =>
              k.endsWith(`::${block.name}`)
            );
            const toolInfo = toolKey ? allTools.get(toolKey) : undefined;
            dashboard.lastProvider = toolInfo?.provider || "unknown";
            dashboard.lastAction = block.name;

            console.log(
              chalk.hex("#05C168")(`\n🔧 Tool call: `) +
                chalk.white(`${dashboard.lastProvider}::${block.name}`)
            );
            console.log(
              chalk.gray(
                `   Input: ${JSON.stringify(block.input).substring(0, 100)}...`
              )
            );

            let resultContent: string;

            if (!toolInfo) {
              resultContent = `Error: Tool '${block.name}' not found in loaded tools`;
              console.log(chalk.red(`   ✗ Tool not found: ${block.name}`));
            } else if (toolInfo.accountId === "defaults") {
              resultContent = `Tool '${block.name}' is a built-in agent capability (not an MCP tool). Use MCP-connected tools instead.`;
              console.log(chalk.yellow(`   ⚠ ${block.name} is a default tool (not executable via MCP)`));
            } else {
              resultContent = "Tool execution failed";
              const accountData = dashboard.accounts.get(toolInfo.accountId);
              if (accountData?.client) {
                try {
                  const result = await accountData.client.callTool({
                    name: block.name,
                    arguments: block.input as Record<string, unknown>,
                  });
                  resultContent = JSON.stringify(result);
                  console.log(
                    chalk.green(`   ✓ Result: `) +
                      chalk.gray(resultContent.substring(0, 150) + "...")
                  );
                } catch (err: any) {
                  resultContent = `Error: ${err.message}`;
                  console.log(chalk.red(`   ✗ Error: ${err.message}`));
                }
              } else {
                console.log(chalk.red(`   ✗ No MCP client for account ${toolInfo.accountId}`));
              }
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultContent,
            });
          }
        }
      }

      // No tool calls means Claude is done
      if (toolResults.length === 0) break;

      // Feed results back for the next turn
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }

    const elapsed = Date.now() - startTime;
    dashboard.lastLatencyMs = elapsed;
    console.log(chalk.gray(`\n⏱  Response time: ${elapsed}ms`));
    renderDashboard();
  } catch (error: any) {
    console.log(chalk.red(`\nError: ${error.message}`));
    if (error.message.includes("context")) {
      console.log(
        chalk.yellow(
          "💡 Tip: Too many tools in context. This is the problem we're demonstrating!"
        )
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

function showHelp() {
  console.log(chalk.bold("\n📖 Demo Commands:"));
  console.log(chalk.cyan("  /add-defaults") + chalk.gray("   - Load agent built-in tools (web, files, etc.)"));
  console.log(chalk.cyan("  /add <provider>") + chalk.gray(" - Connect a StackOne account"));
  console.log(chalk.cyan("  /accounts") + chalk.gray("       - List available accounts"));
  console.log(chalk.cyan("  /connected") + chalk.gray("      - Show connected accounts"));
  console.log(chalk.cyan("  /tools") + chalk.gray("          - List all loaded tools"));
  console.log(chalk.cyan("  /context") + chalk.gray("        - Show real token cost of loaded tools"));
  console.log(chalk.cyan("  /code") + chalk.gray("           - Toggle code mode (sandbox execution)"));
  console.log(chalk.cyan("  /reset") + chalk.gray("          - Disconnect all accounts"));
  console.log(chalk.cyan("  /demo") + chalk.gray("           - Run the full demo sequence"));
  console.log(chalk.cyan("  /help") + chalk.gray("           - Show this help"));
  console.log(chalk.cyan("  /quit") + chalk.gray("           - Exit"));
  console.log(chalk.gray("\nOr type any prompt to run the agent.\n"));
}

async function runDemoSequence() {
  console.log(chalk.bold.hex("#05C168")("\n🎬 Starting Demo Sequence...\n"));

  // Phase 1: Start small
  console.log(chalk.bold.blue("━━━ Phase 1: A Basic Agent ━━━"));
  console.log(chalk.gray("Starting with agent defaults and productivity tools...\n"));
  await addDefaults();
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Gmail");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Trello");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Gong");

  console.log(chalk.gray('\nDemo prompt: "List my recent emails"\n'));
  await runAgent("List my recent emails from today");

  // Phase 2: Expand capabilities
  console.log(chalk.bold.blue("\n\n━━━ Phase 2: Expand Capabilities ━━━"));
  console.log(chalk.gray("Adding CRM, ATS, and dev tools...\n"));
  await new Promise((r) => setTimeout(r, 1500));
  await addAccount("HubSpot");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Ashby");

  console.log(chalk.gray('\nDemo prompt: "Find contacts and open job positions"\n'));
  await runAgent("List contacts from HubSpot and show open job positions from Ashby");

  // Phase 3: The break
  console.log(chalk.bold.blue("\n\n━━━ Phase 3: Scale to Many Tools ━━━"));
  console.log(chalk.gray("Adding more systems - watch the tool count climb...\n"));
  await new Promise((r) => setTimeout(r, 1500));
  await addAccount("GitHub");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Zendesk");

  console.log(chalk.bold.red("\n\n🚨 CONTEXT EXPLOSION"));
  console.log(chalk.gray(`Watch what happens with ${dashboard.toolCount}+ tools...\n`));
  await runAgent("List my contacts");

  console.log(chalk.bold.hex("#05C168")("\n\n✅ Demo Sequence Complete"));
  console.log(chalk.gray("Type /help for commands or any prompt to continue.\n"));
}

async function cleanupAll() {
  // Stop sandbox
  if (sandbox) {
    await sandbox.stop().catch(() => {});
    sandbox = null;
  }
  codeMode = false;

  // Close all MCP connections
  for (const account of dashboard.accounts.values()) {
    if (account.client) {
      await account.client.close().catch(() => {});
    }
  }
}

// Graceful shutdown on Ctrl+C or kill
process.on("SIGINT", async () => {
  console.log(chalk.gray("\n\nShutting down..."));
  await cleanupAll();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await cleanupAll();
  process.exit(0);
});

async function main() {
  console.log(chalk.bold.hex("#05C168")("\n═══════════════════════════════════════════════════════"));
  console.log(chalk.bold.hex("#05C168")("   MCP Demo Agent - MCPconf London 2026"));
  console.log(chalk.bold.hex("#05C168")("   Powered by StackOne + Claude"));
  console.log(chalk.bold.hex("#05C168")("═══════════════════════════════════════════════════════\n"));

  // Check for required env vars
  if (!process.env.STACKONE_API_KEY) {
    console.log(chalk.red("⚠️  STACKONE_API_KEY not set in .env"));
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(chalk.red("⚠️  ANTHROPIC_API_KEY not set in .env"));
  }

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
        console.log(chalk.gray("Goodbye!"));
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/help") {
        showHelp();
      } else if (trimmed === "/accounts") {
        console.log(chalk.bold("\nAvailable StackOne accounts:"));
        AVAILABLE_ACCOUNTS.forEach((a) => {
          const connected = dashboard.accounts.has(a.id);
          const status = connected ? chalk.green("✓") : chalk.gray("○");
          console.log(
            `  ${status} ${chalk.cyan(a.provider.padEnd(15))} ${chalk.gray(`~${a.toolCount} tools`)}`
          );
        });
        console.log();
      } else if (trimmed === "/connected") {
        console.log(chalk.bold("\nConnected accounts:"));
        if (dashboard.accounts.size === 0) {
          console.log(chalk.gray("  None"));
        } else {
          for (const [_id, account] of dashboard.accounts) {
            console.log(
              `  ${chalk.green("✓")} ${chalk.cyan(account.name.padEnd(15))} ${chalk.gray(`${account.tools} tools`)}`
            );
          }
        }
        console.log();
      } else if (trimmed === "/tools") {
        console.log(chalk.bold(`\nLoaded tools (${allTools.size}):`));
        const byProvider = new Map<string, string[]>();
        for (const [_key, tool] of allTools) {
          const provider = tool.provider;
          if (!byProvider.has(provider)) byProvider.set(provider, []);
          byProvider.get(provider)!.push(tool.name);
        }
        for (const [provider, tools] of byProvider) {
          console.log(chalk.cyan(`\n  ${provider} (${tools.length}):`));
          console.log(
            chalk.gray(
              `    ${tools.slice(0, 5).join(", ")}${tools.length > 5 ? "..." : ""}`
            )
          );
        }
        console.log();
      } else if (trimmed === "/add-defaults") {
        await addDefaults();
      } else if (trimmed.startsWith("/add ")) {
        const provider = trimmed.slice(5).trim().replace(/^["']|["']$/g, "");
        await addAccount(provider);
      } else if (trimmed === "/context") {
        await showContextUsage(true);
      } else if (trimmed === "/code") {
        await toggleCodeMode();
      } else if (trimmed === "/reset") {
        await cleanupAll();
        dashboard.toolCount = 0;
        dashboard.tokenEstimate = 0;
        dashboard.actualInputTokens = null;
        dashboard.accounts.clear();
        dashboard.lastProvider = "-";
        dashboard.lastAction = "-";
        dashboard.lastLatencyMs = null;
        allTools.clear();
        console.log(chalk.green("✓ Reset complete"));
        renderDashboard();
      } else if (trimmed === "/demo") {
        await runDemoSequence();
      } else if (trimmed.length > 0) {
        await runAgent(trimmed);
      }

      promptLoop();
    });
  };

  // Check for --demo flag
  if (process.argv.includes("--demo")) {
    await runDemoSequence();
  }

  promptLoop();
}

main().catch(console.error);
