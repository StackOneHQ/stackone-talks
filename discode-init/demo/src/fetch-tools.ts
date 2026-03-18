/**
 * Fetch tool schemas from the StackOne MCP server.
 *
 * Connects to the live MCP endpoint, lists all available tools
 * across the configured accounts, and saves them to tools-cache.json.
 *
 * Usage:
 *   bun run fetch-tools
 */

const MCP_URL = "https://api.stackone.com/mcp";
const API_KEY = "v1.eu1.D-e-Ip0XOouTQWuxOA3H4FNk2yI21q3mE_y6HB02vv7m0WfyH9whOh3OZTWgTKnzxZzZ680uw77gYBGpnFkpXw";

const ACCOUNT_IDS = [
  "klaviyo-acme",
  "slack-acme",
  "google-sheets-acme",
  "notion-acme",
  "datadog-acme",
  "personio-acme",
  "hubspot-acme",
  "salesforce-acme",
  "greenhouse-acme",
  "ashby-acme",
  "asana-acme",
  "bamboohr-acme",
  "jira-acme",
  "clickup-acme",
  "google-calendar-acme",
  "box-acme",
  "onedrive-acme",
  "docusign-acme",
  "zendesk-acme",
  "intercom-acme",
];

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

function makeHeaders(accountId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Basic ${btoa(API_KEY + ":")}`,
    "x-account-id": accountId,
  };
}

function parseSSEResponse(text: string): unknown | null {
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      try {
        return JSON.parse(line.slice(6));
      } catch {}
    }
  }
  return null;
}

async function mcpRequest(
  accountId: string,
  method: string,
  params: Record<string, unknown>,
  id: number
): Promise<unknown> {
  const resp = await fetch(MCP_URL, {
    method: "POST",
    headers: makeHeaders(accountId),
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${resp.statusText} - ${body.slice(0, 200)}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await resp.text();
    return parseSSEResponse(text);
  }
  return resp.json();
}

async function fetchToolsForAccount(accountId: string): Promise<McpTool[]> {
  // Step 1: Initialize MCP session
  const initResult = await mcpRequest(accountId, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "search-demo", version: "1.0.0" },
  }, 1);

  // Step 2: Send initialized notification
  await fetch(MCP_URL, {
    method: "POST",
    headers: makeHeaders(accountId),
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  // Step 3: List tools
  const result = await mcpRequest(accountId, "tools/list", {}, 2) as any;
  return result?.result?.tools || [];
}

async function main() {
  console.log("Fetching tools from StackOne MCP...\n");

  const allTools: Array<McpTool & { account: string }> = [];
  const byAccount: Record<string, number> = {};

  for (const accountId of ACCOUNT_IDS) {
    process.stdout.write(`  ${accountId}... `);
    try {
      const tools = await fetchToolsForAccount(accountId);
      console.log(`${tools.length} tools`);
      byAccount[accountId] = tools.length;
      for (const tool of tools) {
        allTools.push({ ...tool, account: accountId });
      }
    } catch (e: any) {
      console.log(`error: ${e.message?.slice(0, 80)}`);
      byAccount[accountId] = 0;
    }
  }

  console.log(`\n  Total: ${allTools.length} tools across ${ACCOUNT_IDS.length} accounts`);

  // Deduplicate by name
  const unique = new Map<string, McpTool>();
  for (const t of allTools) unique.set(t.name, t);
  console.log(`  Unique tool names: ${unique.size}`);

  // Show schema size
  const schemaJson = JSON.stringify(allTools, null, 2);
  const sizeKb = (Buffer.byteLength(schemaJson) / 1024).toFixed(0);
  console.log(`  Total schema size: ${sizeKb} KB`);
  console.log(`  → That's what goes into the LLM context with naive MCP.\n`);

  // Save cache
  const { writeFileSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const cachePath = resolve(__dirname, "../tools-cache.json");
  writeFileSync(cachePath, schemaJson);
  console.log(`  Saved to ${cachePath}`);
}

main().catch(console.error);
