/**
 * Side-by-side demo: Naive vs Fine-Tuned search.
 *
 * Loads both models, runs the same query, shows results comparison.
 *
 * Usage:
 *   bun run demo "Create a new employee in BambooHR"
 *   bun run demo --connector=bamboohr "Create a new employee"
 *   bun run demo                       # runs all example queries
 */

import { loadTools, getToolsByConnector, loadTasks } from "./tools.js";
import {
  createNaiveSearch,
  createFinetunedSearch,
  type SearchResult,
} from "./embeddings.js";

const EXAMPLE_QUERIES = [
  {
    query: "Book a new meeting in the calendar",
    expected: "bullhorn_create_appointment",
    connector: "bullhorn",
  },
  {
    query: "Show me all customer orders from the store",
    expected: "shopify_list_orders",
    connector: "shopify",
  },
  {
    query: "Schedule time off for next week",
    expected: "personio_create_time_off",
    connector: "personio",
  },
  {
    query: "Show me all the open issues assigned to me",
    expected: "linear_list_issues",
    connector: "linear",
  },
  {
    query: "File a new bug report in Linear",
    expected: "linear_create_issue",
    connector: "linear",
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let connector: string | undefined;
  const queryParts: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--connector=")) connector = arg.split("=")[1];
    else queryParts.push(arg);
  }

  return { connector, query: queryParts.join(" ") || undefined };
}

function printResults(label: string, results: SearchResult[], expected?: string) {
  console.log(`  ${label}`);
  console.log("  " + "─".repeat(60));
  for (const [i, r] of results.slice(0, 5).entries()) {
    const score = (r.score * 100).toFixed(1);
    const isCorrect = expected && r.name === expected;
    const marker = isCorrect ? " ✓" : "";
    console.log(`  ${String(i + 1).padStart(2)}. [${score}%] ${r.label}${marker}`);
  }

  if (expected) {
    const rank = results.findIndex((r) => r.name === expected) + 1;
    if (rank > 0 && rank <= 5) {
      console.log(`  → Found at rank ${rank}`);
    } else if (rank > 5) {
      console.log(`  → Found at rank ${rank} (outside top 5)`);
    } else {
      console.log(`  → NOT FOUND in top ${results.length}`);
    }
  }
  console.log();
}

async function main() {
  const { connector, query } = parseArgs();

  // Load tools
  const allTools = loadTools();
  const tools = connector ? getToolsByConnector(connector) : allTools;
  const toolNames = tools.map((t) => t.name);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Disco Search Demo: Naive vs Fine-Tuned");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`\n  Tool catalog: ${allTools.length} tools across ${new Set(allTools.map(t => t.connector)).size} connectors`);
  if (connector) console.log(`  Scoped to: ${connector} (${tools.length} tools)`);

  // Initialize both models
  console.log("\n  Loading models...");

  const naive = createNaiveSearch();
  const finetuned = createFinetunedSearch();

  const t0 = performance.now();
  await naive.initialize(allTools);
  const naiveMs = (performance.now() - t0).toFixed(0);
  console.log(`  ✓ Naive (MiniLM-L6-v2, 22M params): ${naiveMs}ms`);

  const t1 = performance.now();
  await finetuned.initialize(allTools);
  const ftMs = (performance.now() - t1).toFixed(0);
  console.log(`  ✓ Fine-tuned MiniLM (method C, 22M params): ${ftMs}ms`);

  // Run queries
  const queries = query
    ? [{ query, expected: undefined as string | undefined, connector }]
    : EXAMPLE_QUERIES;

  for (const q of queries) {
    const scopeTools = q.connector
      ? allTools.filter((t) => t.connector === q.connector).map((t) => t.name)
      : undefined;

    console.log("\n───────────────────────────────────────────────────────────────");
    console.log(`  Query: "${q.query}"`);
    if (q.expected) console.log(`  Expected: ${q.expected}`);
    if (q.connector) console.log(`  Scope: ${q.connector} (${scopeTools?.length} tools)`);
    console.log();

    const naiveResults = await naive.search(q.query, scopeTools, 10);
    const ftResults = await finetuned.search(q.query, scopeTools, 10);

    printResults("Off-the-Shelf (MiniLM-L6-v2)", naiveResults, q.expected);
    printResults("Fine-Tuned (Disco Search)", ftResults, q.expected);
  }

  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
