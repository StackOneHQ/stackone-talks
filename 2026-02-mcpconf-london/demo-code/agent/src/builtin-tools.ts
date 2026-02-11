/**
 * Built-in Anthropic server tools — Anthropic executes, zero client code.
 *
 * /defaults  → web_search + web_fetch
 * /acode     → code_execution (separate beta)
 */

// ---------------------------------------------------------------------------
// Server-side tools (Anthropic executes, zero implementation)
// ---------------------------------------------------------------------------

export const BUILTIN_TOOLS: any[] = [
	{ type: "web_search_20250305", name: "web_search", max_uses: 5 },
	{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 5 },
];

export const WEB_FETCH_BETA = "web-fetch-2025-09-10";

export const CODE_EXECUTION_BETA = "code-execution-2025-08-25";
export const CODE_EXECUTION_TOOL = { type: "code_execution_20250825", name: "code_execution" };
