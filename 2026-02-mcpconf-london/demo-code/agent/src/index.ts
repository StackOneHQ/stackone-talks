import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool } from "ai";
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
  accounts: string[];
}

const dashboard: DashboardState = {
  toolCount: 0,
  tokenEstimate: 0,
  lastProvider: "-",
  lastAction: "-",
  accounts: [],
};

// Available StackOne accounts (from API)
const AVAILABLE_ACCOUNTS = [
  { id: "attio", provider: "Attio", toolCount: 45 },
  { id: "zendesk", provider: "Zendesk", toolCount: 87 },
  { id: "honeycomb", provider: "Honeycomb", toolCount: 23 },
  { id: "trello", provider: "Trello", toolCount: 156 },
  { id: "gmail", provider: "Gmail", toolCount: 34 },
  { id: "gong", provider: "Gong", toolCount: 28 },
  { id: "github", provider: "GitHub", toolCount: 89 },
  { id: "hubspot", provider: "HubSpot", toolCount: 312 },
  { id: "greenhouse", provider: "Greenhouse", toolCount: 78 },
  // Mock enterprise accounts for demo
  { id: "salesforce", provider: "Salesforce", toolCount: 370 },
  { id: "workday", provider: "Workday", toolCount: 186 },
  { id: "oracle-fusion", provider: "Oracle Fusion", toolCount: 1506 },
  { id: "sap", provider: "SAP SuccessFactors", toolCount: 234 },
  { id: "servicenow", provider: "ServiceNow", toolCount: 156 },
];

let mcpClient: Client | null = null;
let mcpTools: Map<string, any> = new Map();

function renderDashboard() {
  const width = 50;
  const border = chalk.gray("─".repeat(width));

  console.log("\n" + border);
  console.log(chalk.bold.green("  📊 MCP DEMO DASHBOARD"));
  console.log(border);
  console.log(
    chalk.cyan("  Tools:    ") +
      chalk.bold.yellow(dashboard.toolCount.toLocaleString()) +
      chalk.gray(" loaded")
  );
  console.log(
    chalk.cyan("  Tokens:   ") +
      chalk.bold.yellow("~" + dashboard.tokenEstimate.toLocaleString()) +
      chalk.gray(" (tool definitions)")
  );
  console.log(
    chalk.cyan("  Accounts: ") +
      chalk.bold.white(dashboard.accounts.length.toString())
  );
  console.log(
    chalk.cyan("  Last:     ") +
      chalk.white(dashboard.lastProvider) +
      chalk.gray(" → ") +
      chalk.white(dashboard.lastAction)
  );
  console.log(border + "\n");
}

async function connectToStackOne(accountIds: string[]) {
  const apiKey = process.env.STACKONE_API_KEY;
  if (!apiKey) {
    console.log(chalk.red("Error: STACKONE_API_KEY not set"));
    return;
  }

  const mcpUrl = process.env.STACKONE_MCP_URL || "https://mcp.stackone.com";

  console.log(chalk.gray(`Connecting to StackOne MCP at ${mcpUrl}...`));

  // For each account, we'd normally connect to StackOne's MCP endpoint
  // In the demo, we simulate progressive tool loading
  let totalTools = 0;

  for (const accountId of accountIds) {
    const account = AVAILABLE_ACCOUNTS.find((a) => a.id === accountId);
    if (account) {
      totalTools += account.toolCount;
      dashboard.accounts.push(account.provider);
      console.log(
        chalk.green(`  ✓ ${account.provider}`) +
          chalk.gray(` (+${account.toolCount} tools)`)
      );
    }
  }

  dashboard.toolCount = totalTools;
  // Rough estimate: ~150 tokens per tool definition
  dashboard.tokenEstimate = totalTools * 150;

  renderDashboard();
}

async function addAccount(accountId: string) {
  const account = AVAILABLE_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) {
    console.log(chalk.red(`Unknown account: ${accountId}`));
    console.log(
      chalk.gray("Available: " + AVAILABLE_ACCOUNTS.map((a) => a.id).join(", "))
    );
    return;
  }

  if (dashboard.accounts.includes(account.provider)) {
    console.log(chalk.yellow(`${account.provider} already connected`));
    return;
  }

  console.log(
    chalk.cyan(`Adding ${account.provider}...`) +
      chalk.gray(` (+${account.toolCount} tools)`)
  );

  dashboard.accounts.push(account.provider);
  dashboard.toolCount += account.toolCount;
  dashboard.tokenEstimate = dashboard.toolCount * 150;

  renderDashboard();

  // Show warning when context gets large
  if (dashboard.toolCount > 500) {
    console.log(
      chalk.yellow("⚠️  Warning: Tool count > 500. Context window filling up.")
    );
  }
  if (dashboard.toolCount > 1000) {
    console.log(
      chalk.red("🚨 Critical: Tool count > 1,000. Expect degraded performance.")
    );
  }
}

async function runAgent(prompt: string) {
  console.log(chalk.gray("\n🤖 Processing..."));

  // Simulate agent response with tool usage
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Add artificial latency based on tool count (demo effect)
  if (dashboard.toolCount > 500) {
    console.log(chalk.yellow("⏳ Loading tool definitions..."));
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(dashboard.toolCount * 2, 3000))
    );
  }

  // Simulate picking a tool
  if (dashboard.accounts.length > 0) {
    const randomAccount =
      dashboard.accounts[Math.floor(Math.random() * dashboard.accounts.length)];
    dashboard.lastProvider = randomAccount;
    dashboard.lastAction = getRandomAction(prompt);
  }

  // In real implementation, this would use the AI SDK:
  // const result = await generateText({
  //   model: anthropic("claude-sonnet-4-20250514"),
  //   prompt,
  //   tools: Object.fromEntries(mcpTools),
  // });

  console.log(
    chalk.green("\n✓ Agent response:") +
      chalk.white(` Used ${dashboard.lastProvider}::${dashboard.lastAction}`)
  );

  renderDashboard();
}

function getRandomAction(prompt: string): string {
  const actions = [
    "list_records",
    "get_employee",
    "search_contacts",
    "create_ticket",
    "send_message",
    "list_deals",
    "get_user",
  ];
  return actions[Math.floor(Math.random() * actions.length)];
}

function showHelp() {
  console.log(chalk.bold("\n📖 Demo Commands:"));
  console.log(chalk.cyan("  /add <account>") + chalk.gray(" - Add an account"));
  console.log(
    chalk.cyan("  /accounts") + chalk.gray(" - List available accounts")
  );
  console.log(
    chalk.cyan("  /reset") + chalk.gray(" - Reset to clean state")
  );
  console.log(
    chalk.cyan("  /demo") + chalk.gray(" - Run the full demo sequence")
  );
  console.log(chalk.cyan("  /help") + chalk.gray(" - Show this help"));
  console.log(chalk.cyan("  /quit") + chalk.gray(" - Exit"));
  console.log(chalk.gray("\nOr type any prompt to run the agent.\n"));
}

async function runDemoSequence() {
  console.log(chalk.bold.green("\n🎬 Starting Demo Sequence...\n"));

  // Phase 1: Start small
  console.log(chalk.bold.blue("Phase 1: Personal Assistant"));
  console.log(chalk.gray("Adding basic productivity tools..."));
  await addAccount("gmail");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("trello");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("gong");

  console.log(chalk.gray("\nDemo prompt: 'Summarize my last meeting'\n"));
  await runAgent("Summarize my last meeting");

  // Phase 2: Add enterprise
  console.log(chalk.bold.blue("\n\nPhase 2: Enterprise Systems"));
  console.log(chalk.gray("Adding enterprise integrations..."));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await addAccount("salesforce");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("workday");

  console.log(chalk.gray("\nDemo prompt: 'Find the latest deal and check if the owner is on PTO'\n"));
  await runAgent("Find the latest deal and check if the owner is on PTO");

  // Phase 3: The break
  console.log(chalk.bold.blue("\n\nPhase 3: Scale to 1,000+ Tools"));
  console.log(chalk.gray("Adding more systems..."));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await addAccount("oracle-fusion");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("sap");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("servicenow");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("hubspot");
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await addAccount("greenhouse");

  console.log(
    chalk.bold.red("\n\n🚨 CONTEXT EXPLOSION DEMO")
  );
  console.log(chalk.gray("Watch what happens with 1,000+ tools...\n"));
  await runAgent("List my contacts");

  console.log(chalk.bold.green("\n\n✅ Demo Sequence Complete"));
  console.log(chalk.gray("Type /help for commands or any prompt to continue.\n"));
}

async function main() {
  console.log(chalk.bold.green("\n═══════════════════════════════════════════"));
  console.log(chalk.bold.green("   MCP Demo Agent - MCPconf London 2026"));
  console.log(chalk.bold.green("═══════════════════════════════════════════\n"));

  showHelp();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(chalk.cyan("❯ "), async (input) => {
      const trimmed = input.trim();

      if (trimmed === "/quit" || trimmed === "/exit") {
        console.log(chalk.gray("Goodbye!"));
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/help") {
        showHelp();
      } else if (trimmed === "/accounts") {
        console.log(chalk.bold("\nAvailable accounts:"));
        AVAILABLE_ACCOUNTS.forEach((a) => {
          const connected = dashboard.accounts.includes(a.provider);
          const status = connected ? chalk.green("✓") : chalk.gray("○");
          console.log(
            `  ${status} ${chalk.cyan(a.id.padEnd(15))} ${a.provider.padEnd(20)} ${chalk.gray(`${a.toolCount} tools`)}`
          );
        });
        console.log();
      } else if (trimmed.startsWith("/add ")) {
        const accountId = trimmed.slice(5).trim();
        await addAccount(accountId);
      } else if (trimmed === "/reset") {
        dashboard.toolCount = 0;
        dashboard.tokenEstimate = 0;
        dashboard.accounts = [];
        dashboard.lastProvider = "-";
        dashboard.lastAction = "-";
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
