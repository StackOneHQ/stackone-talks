/**
 * End-to-end demo: natural language → tool search → Claude picks → execute → summarise.
 *
 * Uses the fine-tuned MiniLM model to search the real StackOne tool cache,
 * sends matches to Claude, executes the chosen tool via MCP, feeds the
 * result back for a human-friendly summary.
 *
 * Usage:
 *   bun run call_tool "list me all issues in jira"
 *   bun run call_tool "show me the slack channels"
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createFinetunedSearch } from "./embeddings.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";

const CONTEXT_LIMIT = 200_000;

// --- Load .env ---
const envPath = resolve(__dirname, "../.env");
const env: Record<string, string> = {};
for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  let val = trimmed.slice(eq + 1);
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

// --- Parse accounts mapping (provider → accountId) ---
const accountMap = new Map<string, string>();
for (const entry of env.STACKONE_ACCOUNTS.split(",")) {
  const [id, provider] = entry.split("=");
  accountMap.set(provider, id);
}

// --- Load cached tools ---
const cachePath = resolve(__dirname, "../tools-cache.json");
if (!existsSync(cachePath)) {
  console.error("Run `bun run fetch-tools` first to cache tool schemas.");
  process.exit(1);
}
const toolsByProvider: Record<string, any[]> = JSON.parse(
  readFileSync(cachePath, "utf-8")
);

// --- Build searchable catalog from cached tools ---
function buildCatalog() {
  const catalog: Array<{
    name: string;
    connector: string;
    label: string;
    description: string;
  }> = [];
  for (const [provider, tools] of Object.entries(toolsByProvider)) {
    for (const t of tools) {
      const action = t.name.replace(provider + "_", "").replace(/_/g, " ");
      catalog.push({
        name: t.name,
        connector: provider,
        label: `${provider}: ${action}`,
        description: `${provider}: ${action}. ${t.description || ""}`.slice(0, 500),
      });
    }
  }
  return catalog;
}

// --- Helpers ---
function commas(n: number): string {
  return n.toLocaleString();
}

function estimateTokens(obj: unknown): number {
  return Math.round(Buffer.byteLength(JSON.stringify(obj)) / 4);
}

function bar(ratio: number, width = 30): string {
  const clamped = Math.min(ratio, 1);
  const filled = Math.round(clamped * width);
  const empty = width - filled;
  const color = ratio > 0.8 ? RED : ratio > 0.4 ? YELLOW : GREEN;
  return `${color}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${RESET}`;
}

function formatToolsForClaude(tools: any[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

function getAllTools(): any[] {
  return Object.values(toolsByProvider).flat();
}

function guessProvider(toolName: string): string | undefined {
  for (const provider of accountMap.keys()) {
    const prefix = provider.replace(/-/g, "") + "_";
    const toolNorm = toolName.replace(/-/g, "");
    if (toolNorm.startsWith(prefix)) return provider;
  }
  const first = toolName.split("_")[0];
  if (accountMap.has(first)) return first;
  return undefined;
}

// --- MCP tools/call ---
async function mcpCallTool(
  accountId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const auth = btoa(`${env.STACKONE_API_KEY}:`);
  const url = `https://api.stackone.com/mcp?x-account-id=${accountId}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`MCP ${resp.status}: ${body.slice(0, 300)}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    const text = await resp.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          return JSON.parse(line.slice(6));
        } catch {}
      }
    }
    return null;
  }
  return resp.json();
}

// --- Main ---
async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.log('Usage: bun run call_tool "list me all issues in jira"');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // --- Step 1: Search tools ---
  console.log();
  console.log(`  ${BOLD}1. Search ${commas(getAllTools().length)} tools${RESET}`);
  console.log(`  ${DIM}────────────────────────────────────────────────${RESET}`);

  const catalog = buildCatalog();
  const engine = createFinetunedSearch();

  const t0 = performance.now();
  await engine.initialize(catalog);
  const initMs = (performance.now() - t0).toFixed(0);

  const t1 = performance.now();
  const results = await engine.search(query, undefined, 10);
  const searchMs = (performance.now() - t1).toFixed(1);

  console.log(`  ${DIM}Embedded ${catalog.length} tools in ${initMs}ms, searched in ${searchMs}ms${RESET}`);

  // Map search results to real tool schemas
  const allReal = getAllTools();
  const realByName = new Map(allReal.map((t) => [t.name, t]));
  const tools: any[] = [];
  for (const r of results) {
    const real = realByName.get(r.name);
    if (real) tools.push(real);
  }

  if (tools.length === 0) {
    console.log(`\n  ${RED}No matching tools found.${RESET}\n`);
    process.exit(1);
  }

  // --- Step 2: Claude picks the tool ---
  console.log();
  console.log(`  ${BOLD}2. Claude picks tool${RESET}`);
  console.log(`  ${DIM}────────────────────────────────────────────────${RESET}`);

  const claudeTools = formatToolsForClaude(tools);
  const toolTokens = estimateTokens(claudeTools);
  const toolPct = toolTokens / CONTEXT_LIMIT;
  console.log(
    `  ${DIM}${tools.length} tools, ~${commas(toolTokens)} tokens (${(toolPct * 100).toFixed(1)}% of context)${RESET}`
  );

  const pickT0 = performance.now();
  const pickResponse = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system:
      "You are a tool-calling assistant. Always call a tool immediately — " +
      "never ask clarifying questions. Pick reasonable defaults for any " +
      "missing parameters. For JQL search, always include a time bound " +
      "like 'created >= -30d'. Keep responses concise.",
    messages: [{ role: "user", content: query }],
    tools: claudeTools,
  });
  const pickMs = (performance.now() - pickT0).toFixed(0);

  const toolCalls = pickResponse.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  const textBlocks = pickResponse.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );

  if (textBlocks.length > 0) {
    for (const b of textBlocks) {
      for (const line of b.text.split("\n")) {
        console.log(`  ${line}`);
      }
    }
  }

  if (toolCalls.length === 0) {
    console.log(`  ${YELLOW}Claude didn't call a tool.${RESET}`);
    console.log(
      `  ${DIM}${pickMs}ms | ${commas(pickResponse.usage.input_tokens)} in | ${commas(pickResponse.usage.output_tokens)} out${RESET}`
    );
    console.log();
    process.exit(0);
  }

  for (const tc of toolCalls) {
    console.log(`  ${GREEN}${BOLD}-> ${tc.name}${RESET}`);
    const inputStr = JSON.stringify(tc.input, null, 2);
    for (const line of inputStr.split("\n").slice(0, 6)) {
      console.log(`    ${DIM}${line}${RESET}`);
    }
  }

  console.log(
    `  ${DIM}${pickMs}ms | ${commas(pickResponse.usage.input_tokens)} in | ${commas(pickResponse.usage.output_tokens)} out${RESET}`
  );

  // --- Step 3: Execute the tool ---
  console.log();
  console.log(`  ${BOLD}3. Execute${RESET}`);
  console.log(`  ${DIM}────────────────────────────────────────────────${RESET}`);

  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  let toolResultTokens = 0;

  for (const tc of toolCalls) {
    const provider = guessProvider(tc.name);
    const accountId = provider ? accountMap.get(provider) : undefined;

    if (!accountId) {
      console.log(
        `  ${RED}No account for ${tc.name} (provider: ${provider || "?"})${RESET}`
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: `Error: no account configured for "${provider}"`,
      });
      continue;
    }

    console.log(`  ${DIM}${tc.name} -> ${provider} (${accountId.slice(0, 8)}...)${RESET}`);
    const execT0 = performance.now();

    try {
      const mcpResult = (await mcpCallTool(
        accountId,
        tc.name,
        tc.input as Record<string, unknown>
      )) as any;
      const execMs = (performance.now() - execT0).toFixed(0);

      const resultContent = mcpResult?.result?.content ?? mcpResult;
      const resultStr =
        typeof resultContent === "string"
          ? resultContent
          : JSON.stringify(resultContent, null, 2);

      const resultTokens = estimateTokens(resultStr);
      const resultKB = (Buffer.byteLength(resultStr) / 1024).toFixed(1);

      const preview = resultStr.slice(0, 300);
      toolResultTokens += resultTokens;
      console.log(`  ${GREEN}OK${RESET} ${execMs}ms | ${resultKB} KB (~${commas(resultTokens)} tokens)`);
      for (const line of preview.split("\n").slice(0, 4)) {
        console.log(`    ${DIM}${line}${RESET}`);
      }
      if (resultStr.length > 300) {
        console.log(`    ${DIM}...${RESET}`);
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: resultStr,
      });
    } catch (e: any) {
      const execMs = (performance.now() - execT0).toFixed(0);
      console.log(`  ${RED}ERR ${execMs}ms: ${e.message?.slice(0, 200)}${RESET}`);
      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: `Error: ${e.message}`,
      });
    }
  }

  // --- Step 4: Feed results back to Claude ---
  console.log();
  console.log(`  ${BOLD}4. Summarise${RESET}`);
  console.log(`  ${DIM}────────────────────────────────────────────────${RESET}`);

  let summaryIn = 0;
  let summaryOut = 0;

  const summaryT0 = performance.now();
  try {
    const summaryResponse = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        { role: "user", content: query },
        { role: "assistant", content: pickResponse.content },
        { role: "user", content: toolResults },
      ],
      tools: claudeTools,
    });
    const summaryMs = (performance.now() - summaryT0).toFixed(0);

    summaryIn = summaryResponse.usage.input_tokens;
    summaryOut = summaryResponse.usage.output_tokens;

    for (const block of summaryResponse.content) {
      if (block.type === "text") {
        for (const line of block.text.split("\n")) {
          console.log(`  ${line}`);
        }
      }
    }

    console.log(
      `  ${DIM}${summaryMs}ms | ${commas(summaryIn)} in | ${commas(summaryOut)} out${RESET}`
    );
  } catch (e: any) {
    const summaryMs = (performance.now() - summaryT0).toFixed(0);
    const promptTooLong = e.message?.match(
      /prompt is too long: ([\d,]+) tokens > ([\d,]+) maximum/
    );
    if (promptTooLong) {
      const actual = promptTooLong[1];
      const limit = promptTooLong[2];
      console.log(
        `  ${RED}${BOLD}Context overflow — ${actual} tokens > ${limit} token limit${RESET}`
      );
      console.log(
        `  ${DIM}The tool result was too large to fit back into context${RESET}`
      );
    } else {
      console.log(`  ${RED}${e.message?.slice(0, 200)}${RESET}`);
    }
    console.log(`  ${DIM}${summaryMs}ms${RESET}`);
  }

  // --- Totals ---
  // If summary succeeded, use real token counts; otherwise estimate from tool result
  const totalIn = summaryIn > 0
    ? pickResponse.usage.input_tokens + summaryIn
    : pickResponse.usage.input_tokens + toolTokens + toolResultTokens;
  const totalOut = pickResponse.usage.output_tokens + summaryOut;
  const contextPct = totalIn / CONTEXT_LIMIT;

  console.log();
  console.log(`  ${BOLD}────────────────────────────────────────────────${RESET}`);
  console.log(`  ${DIM}Query:${RESET}     ${BOLD}"${query}"${RESET}`);
  console.log(`  ${DIM}Tools:${RESET}     ${BOLD}${tools.length}${RESET} ${DIM}(searched ${commas(catalog.length)} in ${searchMs}ms)${RESET}`);
  console.log(`  ${DIM}Tool schema:${RESET} ${BOLD}${commas(toolTokens)}${RESET} ${DIM}tokens${RESET}`);
  console.log(`  ${DIM}Tool result:${RESET} ${BOLD}${commas(toolResultTokens)}${RESET} ${DIM}tokens${RESET}`);
  console.log(
    `  ${DIM}Context:${RESET}   ${bar(contextPct)} ${BOLD}${(contextPct * 100).toFixed(1)}%${RESET} ${DIM}of 200k${RESET}`
  );
  console.log(`  ${BOLD}────────────────────────────────────────────────${RESET}`);
  console.log();
}

main().catch(console.error);
