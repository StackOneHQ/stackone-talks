/**
 * Display helpers — shared styling and formatting.
 */

import chalk from "chalk";
import { CONTEXT_WINDOW } from "./config.js";

export const S = {
	brand: chalk.hex("#05C168"),
	cmd: (name: string) => chalk.hex("#05C168").bold(name),
	label: chalk.dim,
	val: chalk.white,
	muted: chalk.dim,
	warn: chalk.yellow,
	err: chalk.red,
	ok: chalk.green,
	accent: chalk.cyan,
	heading: chalk.bold.white,
};

/** Colored badge for mode/status indicators. */
export const badge = {
	on: chalk.bgHex("#05C168").black(" ON "),
	off: chalk.dim(" OFF "),
	code: chalk.bgCyan.black(" CODE "),
	asearch: chalk.bgMagenta.white(" ANTHROPIC SEARCH "),
	search: chalk.bgBlue.white(" SEARCH "),
	mcp: chalk.bgHex("#05C168").black(" MCP "),
	anthropic: chalk.bgCyan.black(" ANTHROPIC "),
	defense: chalk.bgYellow.black(" ON "),
	critical: chalk.bgRed.white(" CRITICAL "),
	warning: chalk.bgYellow.black(" WARNING "),
};

/** Truncate string with ellipsis. */
export function truncate(s: string | undefined, max: number): string {
	if (!s) return "";
	return s.length > max ? s.substring(0, max) + "..." : s;
}

export function contextBar(tokens: number, width = 30): string {
	const pct = Math.min(tokens / CONTEXT_WINDOW, 1);
	const filled = Math.round(pct * width);
	const color = pct > 0.75 ? chalk.red : pct > 0.5 ? chalk.yellow : chalk.green;
	const pctStr = (pct * 100).toFixed(0) + "%";
	return `${color("█".repeat(filled))}${chalk.dim("░".repeat(width - filled))} ${color(pctStr)}`;
}

/** Group tools by provider name → count. */
export function groupByProvider(allTools: Map<string, any>): Map<string, number> {
	const groups = new Map<string, number>();
	for (const [, tool] of allTools) {
		groups.set(tool.provider, (groups.get(tool.provider) || 0) + 1);
	}
	return groups;
}
