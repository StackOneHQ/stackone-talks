/**
 * Anthropic Search — Anthropic Tool Search Tool (beta).
 *
 * All tools are sent with defer_loading: true. Claude searches
 * for relevant tools server-side before calling them.
 * 845 tools → ~3-5 loaded on demand. 85% token reduction.
 */

import type Anthropic from "@anthropic-ai/sdk";
import * as p from "@clack/prompts";

let enabled = false;

export const BETA = "advanced-tool-use-2025-11-20";

export function isEnabled(): boolean {
	return enabled;
}

export function toggle(
	toolCount: number,
	renderDashboard: () => void,
): void {
	if (toolCount === 0 && !enabled) {
		p.log.warn("No tools loaded. Use /add <provider> first.");
		return;
	}
	enabled = !enabled;
	if (enabled) {
		p.log.success(`Anthropic search ON — ${toolCount} tools deferred`);
	} else {
		p.log.info("Anthropic search OFF — all tools loaded in context");
	}
	renderDashboard();
}

/** Wrap tools with defer_loading and prepend the BM25 tool search tool. */
export function wrapTools(tools: Anthropic.Tool[]): any[] {
	return [
		{ type: "tool_search_tool_bm25_20251119", name: "tool_search_tool_bm25" },
		...tools.map((t) => ({ ...t, defer_loading: true })),
	];
}

export function cleanup(): void {
	enabled = false;
}
