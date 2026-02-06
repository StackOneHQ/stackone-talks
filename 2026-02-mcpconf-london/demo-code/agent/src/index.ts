import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import chalk from "chalk";
import * as readline from "readline";
import "dotenv/config";

// Dashboard state
interface DashboardState {
  toolCount: number;
  tokenEstimate: number;
  lastProvider: string;
  lastAction: string;
  accounts: Map<string, { name: string; tools: number; client?: Client }>;
}

const dashboard: DashboardState = {
  toolCount: 0,
  tokenEstimate: 0,
  lastProvider: "-",
  lastAction: "-",
  accounts: new Map(),
};

// Real StackOne accounts with actual tool counts
const AVAILABLE_ACCOUNTS = [
  { id: "j7ahtiKsIeDWLKWvdLT2o", provider: "Gmail", toolCount: 42 },
  { id: "GlSyNhL2kMnc7ufbyoy8R", provider: "Trello", toolCount: 109 },
  { id: "kRm6w3fUMpzpsQR19mOUT", provider: "Gong", toolCount: 16 },
  { id: "lxujn4SLe8d6u3VuwDJ91", provider: "GitHub", toolCount: 74 },
  { id: "MFQob34emXsdPpqKd07CO", provider: "HubSpot", toolCount: 65 },
  { id: "XCygsVa6dSOJdUnAX6qUg", provider: "Greenhouse", toolCount: 99 },
  { id: "47336761421214075533", provider: "Zendesk", toolCount: 45 },
  { id: "47337121114612380857", provider: "Attio", toolCount: 38 },
  { id: "svJm9VFpt4ZtdBTo0ddEp", provider: "Pinpoint", toolCount: 52 },
  { id: "8pJAk5Zcm7tNS0BJLBSAD", provider: "Honeycomb", toolCount: 28 },
  { id: "UTeyrycq6tVPIr4WPkSsp", provider: "Range", toolCount: 22 },
  { id: "ULaAZD6pw2C5PQzrLs8y0", provider: "Browserbase", toolCount: 18 },
];

let allTools: Map<string, any> = new Map();
let anthropic: Anthropic;

function renderDashboard() {
  const width = 55;
  const border = chalk.gray("─".repeat(width));

  console.log("\n" + border);
  console.log(chalk.bold.hex("#05C168")("  📊 MCP DEMO DASHBOARD"));
  console.log(border);
  console.log(
    chalk.cyan("  Tools:    ") +
      chalk.bold.yellow(dashboard.toolCount.toLocaleString().padStart(6)) +
      chalk.gray(" loaded in context")
  );
  console.log(
    chalk.cyan("  Tokens:   ") +
      chalk.bold.yellow(("~" + dashboard.tokenEstimate.toLocaleString()).padStart(6)) +
      chalk.gray(" (tool definitions)")
  );
  console.log(
    chalk.cyan("  Accounts: ") +
      chalk.bold.white(dashboard.accounts.size.toString().padStart(6))
  );
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

  // Warnings
  if (dashboard.toolCount > 1000) {
    console.log(chalk.red("\n  🚨 CRITICAL: Over 1,000 tools. Context overload!"));
  } else if (dashboard.toolCount > 500) {
    console.log(chalk.yellow("\n  ⚠️  Warning: Tool count > 500. Performance degrading."));
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
        chalk.gray(` (+${toolCount} tools)`)
    );

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

  // Convert tools to Anthropic format
  const tools: Anthropic.Tool[] = Array.from(allTools.values()).map((tool) => ({
    name: tool.name,
    description: `[${tool.provider}] ${tool.description || ""}`,
    input_schema: tool.inputSchema || { type: "object", properties: {} },
  }));

  const startTime = Date.now();

  try {
    // Show context size warning for large tool sets
    if (tools.length > 100) {
      console.log(
        chalk.yellow(`⏳ Loading ${tools.length} tool definitions into context...`)
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools,
      messages: [{ role: "user", content: prompt }],
    });

    const elapsed = Date.now() - startTime;

    // Process response
    for (const block of response.content) {
      if (block.type === "text") {
        console.log(chalk.white("\n" + block.text));
      } else if (block.type === "tool_use") {
        const toolInfo = allTools.get(
          Array.from(allTools.keys()).find((k) => k.endsWith(`::${block.name}`)) || ""
        );
        dashboard.lastProvider = toolInfo?.provider || "unknown";
        dashboard.lastAction = block.name;

        console.log(
          chalk.hex("#05C168")(`\n🔧 Tool call: `) +
            chalk.white(`${dashboard.lastProvider}::${block.name}`)
        );
        console.log(chalk.gray(`   Input: ${JSON.stringify(block.input).substring(0, 100)}...`));

        // Actually execute the tool via MCP
        if (toolInfo?.accountId) {
          const accountData = dashboard.accounts.get(toolInfo.accountId);
          if (accountData?.client) {
            try {
              const result = await accountData.client.callTool({
                name: block.name,
                arguments: block.input as Record<string, unknown>,
              });
              console.log(
                chalk.green(`   ✓ Result: `) +
                  chalk.gray(JSON.stringify(result).substring(0, 150) + "...")
              );
            } catch (err: any) {
              console.log(chalk.red(`   ✗ Error: ${err.message}`));
            }
          }
        }
      }
    }

    console.log(chalk.gray(`\n⏱  Response time: ${elapsed}ms`));
    renderDashboard();
  } catch (error: any) {
    console.log(chalk.red(`\nError: ${error.message}`));
    if (error.message.includes("context")) {
      console.log(
        chalk.yellow("💡 Tip: Too many tools in context. This is the problem we're demonstrating!")
      );
    }
  }
}

function showHelp() {
  console.log(chalk.bold("\n📖 Demo Commands:"));
  console.log(chalk.cyan("  /add <provider>") + chalk.gray(" - Connect a StackOne account"));
  console.log(chalk.cyan("  /accounts") + chalk.gray(" - List available accounts"));
  console.log(chalk.cyan("  /connected") + chalk.gray(" - Show connected accounts"));
  console.log(chalk.cyan("  /tools") + chalk.gray(" - List all loaded tools"));
  console.log(chalk.cyan("  /reset") + chalk.gray(" - Disconnect all accounts"));
  console.log(chalk.cyan("  /demo") + chalk.gray(" - Run the full demo sequence"));
  console.log(chalk.cyan("  /help") + chalk.gray(" - Show this help"));
  console.log(chalk.cyan("  /quit") + chalk.gray(" - Exit"));
  console.log(chalk.gray("\nOr type any prompt to run the agent.\n"));
}

async function runDemoSequence() {
  console.log(chalk.bold.hex("#05C168")("\n🎬 Starting Demo Sequence...\n"));

  // Phase 1: Start small
  console.log(chalk.bold.blue("━━━ Phase 1: Personal Assistant ━━━"));
  console.log(chalk.gray("Starting with basic productivity tools...\n"));
  await addAccount("Gmail");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Trello");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Gong");

  console.log(chalk.gray('\nDemo prompt: "List my recent emails"\n'));
  await runAgent("List my recent emails from today");

  // Phase 2: Add enterprise
  console.log(chalk.bold.blue("\n\n━━━ Phase 2: Enterprise Systems ━━━"));
  console.log(chalk.gray("Adding CRM and ATS...\n"));
  await new Promise((r) => setTimeout(r, 1500));
  await addAccount("HubSpot");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Greenhouse");

  console.log(chalk.gray('\nDemo prompt: "Find contacts and open job positions"\n'));
  await runAgent("List contacts from HubSpot and show open job positions from Greenhouse");

  // Phase 3: The break
  console.log(chalk.bold.blue("\n\n━━━ Phase 3: Scale to Many Tools ━━━"));
  console.log(chalk.gray("Adding more systems - watch the tool count climb...\n"));
  await new Promise((r) => setTimeout(r, 1500));
  await addAccount("GitHub");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Zendesk");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Attio");
  await new Promise((r) => setTimeout(r, 1000));
  await addAccount("Pinpoint");

  console.log(chalk.bold.red("\n\n🚨 CONTEXT EXPLOSION"));
  console.log(chalk.gray("Watch what happens with 400+ tools...\n"));
  await runAgent("List my contacts");

  console.log(chalk.bold.hex("#05C168")("\n\n✅ Demo Sequence Complete"));
  console.log(chalk.gray("Type /help for commands or any prompt to continue.\n"));
}

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

  const prompt = () => {
    rl.question(chalk.hex("#05C168")("❯ "), async (input) => {
      const trimmed = input.trim();

      if (trimmed === "/quit" || trimmed === "/exit") {
        // Close all MCP connections
        for (const account of dashboard.accounts.values()) {
          if (account.client) {
            await account.client.close().catch(() => {});
          }
        }
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
          for (const [id, account] of dashboard.accounts) {
            console.log(
              `  ${chalk.green("✓")} ${chalk.cyan(account.name.padEnd(15))} ${chalk.gray(`${account.tools} tools`)}`
            );
          }
        }
        console.log();
      } else if (trimmed === "/tools") {
        console.log(chalk.bold(`\nLoaded tools (${allTools.size}):`));
        const byProvider = new Map<string, string[]>();
        for (const [key, tool] of allTools) {
          const provider = tool.provider;
          if (!byProvider.has(provider)) byProvider.set(provider, []);
          byProvider.get(provider)!.push(tool.name);
        }
        for (const [provider, tools] of byProvider) {
          console.log(chalk.cyan(`\n  ${provider} (${tools.length}):`));
          console.log(chalk.gray(`    ${tools.slice(0, 5).join(", ")}${tools.length > 5 ? "..." : ""}`));
        }
        console.log();
      } else if (trimmed.startsWith("/add ")) {
        const provider = trimmed.slice(5).trim();
        await addAccount(provider);
      } else if (trimmed === "/reset") {
        // Close all connections
        for (const account of dashboard.accounts.values()) {
          if (account.client) {
            await account.client.close().catch(() => {});
          }
        }
        dashboard.toolCount = 0;
        dashboard.tokenEstimate = 0;
        dashboard.accounts.clear();
        dashboard.lastProvider = "-";
        dashboard.lastAction = "-";
        allTools.clear();
        console.log(chalk.green("✓ Reset complete"));
        renderDashboard();
      } else if (trimmed === "/demo") {
        await runDemoSequence();
      } else if (trimmed.length > 0) {
        await runAgent(trimmed);
      }

      prompt();
    });
  };

  // Check for --demo flag
  if (process.argv.includes("--demo")) {
    await runDemoSequence();
  }

  prompt();
}

main().catch(console.error);
