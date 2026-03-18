/**
 * Disco Search MCP Server
 *
 * A stdio MCP server that provides intelligent tool routing.
 * Instead of loading hundreds of tools into Claude's context,
 * this single server uses a fine-tuned MiniLM model to find
 * the right tool in <5ms.
 *
 * Usage:
 *   claude mcp add disco-search --transport stdio -- bun run src/disco-mcp-server.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createFinetunedSearch, type EmbeddingSearch } from "./embeddings.js";
import { loadTools, type Tool } from "./tools.js";

// --- Lazy initialization ---

let engine: EmbeddingSearch | null = null;
let tools: Tool[] = [];
let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (engine) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    tools = loadTools();
    engine = createFinetunedSearch();
    console.error(
      `[disco] Loading fine-tuned MiniLM & embedding ${tools.length} tools...`
    );
    const t0 = performance.now();
    await engine.initialize(tools);
    console.error(
      `[disco] Ready in ${(performance.now() - t0).toFixed(0)}ms — ${tools.length} tools indexed`
    );
  })();

  return initPromise;
}

// Start initialization in the background immediately
ensureInitialized();

// --- MCP Server ---

const server = new McpServer({
  name: "disco-search",
  version: "1.0.0",
});

server.tool(
  "disco_search",
  "Search across all connected integrations to find the right tool for any task. " +
    "Routes natural language instructions to the correct API action across 92 connectors " +
    "and 998 tools in <5ms using a fine-tuned embedding model. " +
    "Use this for ANY integration task: CRM, HRIS, ATS, ticketing, messaging, " +
    "file storage, calendars, e-commerce, and more.",
  {
    instruction: z
      .string()
      .describe(
        "Natural language description of what you want to do, e.g. " +
          "'Show me all customer orders from the store' or " +
          "'Schedule time off for next week'"
      ),
  },
  async ({ instruction }) => {
    await ensureInitialized();

    const t0 = performance.now();
    const results = await engine!.search(instruction, undefined, 5);
    const ms = (performance.now() - t0).toFixed(1);

    const output = {
      query: instruction,
      latency_ms: parseFloat(ms),
      model: "fine-tuned MiniLM-L6-v2 (method C, 22M params)",
      tools_indexed: tools.length,
      results: results.map((r, i) => ({
        rank: i + 1,
        tool_id: r.name,
        label: r.label,
        confidence: `${(r.score * 100).toFixed(1)}%`,
      })),
    };

    return {
      content: [
        { type: "text" as const, text: JSON.stringify(output, null, 2) },
      ],
    };
  }
);

// --- Connect via stdio immediately (don't wait for model) ---

const transport = new StdioServerTransport();
await server.connect(transport);
