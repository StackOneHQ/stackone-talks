/**
 * Fetch tool schemas from all StackOne MCP accounts and cache locally.
 * Run once: bun run src/fetch-all-tools.ts
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = resolve(__dirname, "../tools-cache.json");

// Parse .env
const envPath = resolve(__dirname, "../.env");
const env: Record<string, string> = {};
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  let val = trimmed.slice(eq + 1);
  // Strip surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const apiKey = env.STACKONE_API_KEY;
const auth = btoa(`${apiKey}:`);
const baseUrl = "https://api.stackone.com/mcp";

const accounts = env.STACKONE_ACCOUNTS.split(",").map((entry) => {
  const [id, provider] = entry.split("=");
  return { id, provider };
});

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

async function fetchTools(accountId: string): Promise<McpTool[]> {
  const url = `${baseUrl}?x-account-id=${accountId}`;
  const headers = {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });

  const data = (await resp.json()) as any;
  return data?.result?.tools ?? [];
}

console.log(`Fetching tools from ${accounts.length} StackOne accounts...\n`);

const allTools: Record<string, McpTool[]> = {};
let totalTools = 0;

for (const { id, provider } of accounts) {
  try {
    const tools = await fetchTools(id);
    allTools[provider] = tools;
    totalTools += tools.length;
    console.log(`  ${provider.padEnd(20)} ${tools.length} tools`);
  } catch (e: any) {
    console.log(`  ${provider.padEnd(20)} ERROR: ${e.message}`);
    allTools[provider] = [];
  }
}

writeFileSync(CACHE_PATH, JSON.stringify(allTools, null, 2));
const sizeKB = (Buffer.byteLength(JSON.stringify(allTools)) / 1024).toFixed(0);
console.log(`\n  Total: ${totalTools} tools across ${accounts.length} accounts`);
console.log(`  Cached to tools-cache.json (${sizeKB} KB)`);
