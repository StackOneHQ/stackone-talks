/**
 * Built-in Anthropic server tools.
 *
 * web_search is a default tool (available via /defaults).
 * code_execution is a separate mode (toggled via /acode), not a default.
 */

export const CODE_EXECUTION_BETA = "code-execution-2025-08-25";
export const CODE_EXECUTION_TOOL = { type: "code_execution_20250825", name: "code_execution" };

export const BUILTIN_TOOLS: any[] = [
	{ type: "web_search_20250305", name: "web_search", max_uses: 5 },
];
