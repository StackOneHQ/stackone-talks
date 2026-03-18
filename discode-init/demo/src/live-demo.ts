/**
 * Live demo: All tools vs search-filtered tools.
 *
 * Usage:
 *   bun run few "List all the conversations in slack"
 *   bun run all "List all the conversations in slack"
 *   bun run search "List all the conversations in slack"
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createFinetunedSearch } from "./embeddings.js";
import { loadTools } from "./tools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const CONTEXT_LIMIT = 200_000; // Sonnet context window

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

// --- Load cached tools ---
const cachePath = resolve(__dirname, "../tools-cache.json");
if (!existsSync(cachePath)) {
  console.error("Run `bun run fetch-tools` first to cache tool schemas.");
  process.exit(1);
}
const toolsByProvider: Record<string, any[]> = JSON.parse(
  readFileSync(cachePath, "utf-8")
);

// --- Parse args ---
function parseArgs() {
  const args = process.argv.slice(2);
  let mode: "all" | "few" | "search" = "all";
  const queryParts: string[] = [];

  for (const arg of args) {
    if (arg === "--all") mode = "all";
    else if (arg === "--few") mode = "few";
    else if (arg === "--search") mode = "search";
    else queryParts.push(arg);
  }

  return { mode, query: queryParts.join(" ") };
}

// --- Helpers ---
function formatToolsForClaude(tools: any[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

function getToolSubset(providers: string[]): any[] {
  const tools: any[] = [];
  for (const p of providers) {
    if (toolsByProvider[p]) tools.push(...toolsByProvider[p]);
  }
  return tools;
}

function getAllTools(): any[] {
  return Object.values(toolsByProvider).flat();
}

function estimateTokens(tools: any[]): number {
  return Math.round(Buffer.byteLength(JSON.stringify(tools)) / 4);
}

function bar(ratio: number, width = 30): string {
  const clamped = Math.min(ratio, 1);
  const filled = Math.round(clamped * width);
  const empty = width - filled;
  const color = ratio > 0.8 ? RED : ratio > 0.4 ? YELLOW : GREEN;
  const overflow = ratio > 1 ? ` ${RED}OVERFLOW${RESET}` : "";
  return `${color}${"█".repeat(filled)}${DIM}${"░".repeat(empty)}${RESET}${overflow}`;
}

function commas(n: number): string {
  return n.toLocaleString();
}

function pctColor(pct: number): string {
  if (pct > 80) return RED;
  if (pct > 40) return YELLOW;
  return GREEN;
}

function printProviderLine(
  provider: string,
  tools: any[],
  cumTokens: number
) {
  const tokens = estimateTokens(tools);
  const cumPct = ((cumTokens + tokens) / CONTEXT_LIMIT) * 100;
  const color = pctColor(cumPct);
  console.log(
    `  ${DIM}+${RESET} ${provider.padEnd(18)} ${DIM}${String(tools.length).padStart(3)} tools  ${commas(tokens).padStart(7)} tokens  ${color}${cumPct.toFixed(1).padStart(5)}% context${RESET}`
  );
  return tokens;
}

const FEW_PROVIDERS = ["hubspot", "slack", "jira"];

// --- Main ---
async function main() {
  const { mode, query } = parseArgs();

  if (!query) {
    console.log('Usage: bun run [few|all|search] "your query"');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  let tools: any[];
  let searchMs: string | null = null;

  console.log();

  if (mode === "few") {
    tools = getToolSubset(FEW_PROVIDERS);

    console.log(
      `  ${BOLD}Loading tools from ${FEW_PROVIDERS.length} accounts...${RESET}`
    );
    console.log();
    let cumTokens = 0;
    for (const p of FEW_PROVIDERS) {
      const pt = toolsByProvider[p] ?? [];
      cumTokens += printProviderLine(p, pt, cumTokens);
    }
  } else if (mode === "search") {
    console.log(`  ${BOLD}Searching...${RESET}`);
    const engine = createFinetunedSearch();
    const catalogTools = loadTools();
    const t0 = performance.now();
    await engine.initialize(catalogTools);
    const initMs = (performance.now() - t0).toFixed(0);

    const t1 = performance.now();
    const results = await engine.search(query, undefined, 5);
    searchMs = (performance.now() - t1).toFixed(1);

    console.log(`  ${DIM}Model loaded in ${initMs}ms${RESET}`);
    console.log();
    console.log(
      `  ${BOLD}Top matches ${DIM}(${searchMs}ms)${RESET}${BOLD}:${RESET}`
    );
    for (const [i, r] of results.entries()) {
      const pct = (r.score * 100).toFixed(1);
      const marker = i === 0 ? ` ${GREEN}← best match${RESET}` : "";
      console.log(
        `  ${DIM}${String(i + 1)}.${RESET} ${pct}%  ${r.label}${marker}`
      );
    }

    // Map search results to real StackOne tool schemas by name
    const allReal = getAllTools();
    const realByName = new Map(allReal.map((t) => [t.name, t]));
    tools = [];
    for (const r of results) {
      const real = realByName.get(r.name);
      if (real) tools.push(real);
    }
  } else {
    tools = getAllTools();

    console.log(
      `  ${BOLD}Loading tools from all ${Object.keys(toolsByProvider).length} accounts...${RESET}`
    );
    console.log();
    let cumTokens = 0;
    for (const [p, pts] of Object.entries(toolsByProvider)) {
      cumTokens += printProviderLine(p, pts, cumTokens);
    }
  }

  const schemaBytes = Buffer.byteLength(JSON.stringify(tools));
  const schemaKB = (schemaBytes / 1024).toFixed(0);
  const totalTokens = Math.round(schemaBytes / 4);
  const contextPct = totalTokens / CONTEXT_LIMIT;

  console.log();
  console.log(`  ${BOLD}────────────────────────────────────────────────────────${RESET}`);
  console.log(`  ${DIM}Query:${RESET}    ${BOLD}"${query}"${RESET}`);
  console.log(
    `  ${DIM}Tools:${RESET}    ${BOLD}${commas(tools.length)}${RESET}`
  );
  console.log(
    `  ${DIM}Schema:${RESET}   ${BOLD}${commas(parseInt(schemaKB))} KB${RESET} ${DIM}(~${commas(totalTokens)} tokens)${RESET}`
  );
  console.log(
    `  ${DIM}Context:${RESET}  ${bar(contextPct)} ${BOLD}${(contextPct * 100).toFixed(1)}%${RESET} ${DIM}of 200k${RESET}`
  );
  if (searchMs) {
    console.log(`  ${DIM}Search:${RESET}   ${BOLD}${searchMs}ms${RESET}`);
  }
  console.log(`  ${BOLD}────────────────────────────────────────────────────────${RESET}`);
  console.log();

  if (tools.length === 0) {
    console.log("  No matching tools found in real accounts.");
    process.exit(1);
  }

  const claudeTools = formatToolsForClaude(tools);

  console.log(`  ${DIM}Calling Claude Sonnet 4.5...${RESET}`);
  console.log();
  const t0 = performance.now();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: query }],
      tools: claudeTools,
    });

    const ms = (performance.now() - t0).toFixed(0);

    for (const block of response.content) {
      if (block.type === "text") {
        for (const line of block.text.split("\n")) {
          console.log(`  ${line}`);
        }
      } else if (block.type === "tool_use") {
        console.log(`  ${GREEN}${BOLD}→ ${block.name}${RESET}`);
        const inputStr = JSON.stringify(block.input, null, 2);
        for (const line of inputStr.split("\n").slice(0, 8)) {
          console.log(`    ${DIM}${line}${RESET}`);
        }
      }
    }

    console.log();
    console.log(
      `  ${DIM}${ms}ms · ${commas(response.usage.input_tokens)} input tokens · ${commas(response.usage.output_tokens)} output tokens${RESET}`
    );
  } catch (e: any) {
    const ms = (performance.now() - t0).toFixed(0);
    const msg = e.message?.slice(0, 300) || String(e);
    const promptTooLong = msg.match(
      /prompt is too long: ([\d,]+) tokens > ([\d,]+) maximum/
    );
    if (msg.includes("502") || msg.includes("too large") || promptTooLong) {
      const actual = promptTooLong?.[1] || "?";
      const limit = promptTooLong?.[2] || "200,000";
      console.log(
        `  ${RED}${BOLD}✗ Too many tools — prompt exceeds context window${RESET}`
      );
      console.log(`  ${DIM}${actual} tokens > ${limit} token limit${RESET}`);
    } else {
      console.log(`  ${RED}✗ ${msg}${RESET}`);
    }
  }

  console.log();
}

main().catch(console.error);
