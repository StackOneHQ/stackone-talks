/**
 * Single-model search — run either naive or fine-tuned.
 *
 * Usage:
 *   bun run naive "Create a new employee in BambooHR"
 *   bun run finetuned "Create a new employee in BambooHR"
 *   bun run src/search.ts --naive --connector=bamboohr "Create a new employee"
 */

import { loadTools, getToolsByConnector } from "./tools.js";
import { createNaiveSearch, createFinetunedSearch } from "./embeddings.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let mode: "naive" | "finetuned" = "naive";
  let connector: string | undefined;
  const queryParts: string[] = [];

  for (const arg of args) {
    if (arg === "--naive") mode = "naive";
    else if (arg === "--finetuned") mode = "finetuned";
    else if (arg.startsWith("--connector=")) connector = arg.split("=")[1];
    else queryParts.push(arg);
  }

  return { mode, connector, query: queryParts.join(" ") };
}

async function main() {
  const { mode, connector, query } = parseArgs();

  if (!query) {
    console.log("Usage: bun run src/search.ts --naive|--finetuned [--connector=X] \"query\"");
    process.exit(1);
  }

  const tools = connector ? getToolsByConnector(connector) : loadTools();
  console.log(`\n  Tools in catalog: ${tools.length}${connector ? ` (${connector})` : " (all connectors)"}`);

  const engine = mode === "finetuned" ? createFinetunedSearch() : createNaiveSearch();
  const label = mode === "finetuned"
    ? "Fine-Tuned MiniLM — method C (384-dim, mean pooling)"
    : "Off-the-Shelf MiniLM (384-dim, mean pooling)";

  console.log(`  Model: ${label}`);
  console.log(`  Loading model & embedding ${tools.length} tools...`);

  const t0 = performance.now();
  await engine.initialize(tools);
  const initMs = (performance.now() - t0).toFixed(0);
  console.log(`  Ready in ${initMs}ms\n`);

  console.log(`  Query: "${query}"\n`);

  const t1 = performance.now();
  const results = await engine.search(query, undefined, 10);
  const searchMs = (performance.now() - t1).toFixed(1);

  console.log(`  Top 10 results (${searchMs}ms):`);
  console.log("  " + "─".repeat(70));
  for (const [i, r] of results.entries()) {
    const score = (r.score * 100).toFixed(1);
    const marker = i === 0 ? " ←" : "";
    console.log(`  ${String(i + 1).padStart(2)}. [${score}%] ${r.label}${marker}`);
    console.log(`      ${r.name}`);
  }
  console.log();
}

main().catch(console.error);
