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

export function contextBar(tokens: number, width = 30): string {
	const pct = Math.min(tokens / CONTEXT_WINDOW, 1);
	const filled = Math.round(pct * width);
	const color = pct > 0.75 ? chalk.red : pct > 0.5 ? chalk.yellow : chalk.green;
	const pctStr = (pct * 100).toFixed(0) + "%";
	return `${color("█".repeat(filled))}${chalk.dim("░".repeat(width - filled))} ${color(pctStr)}`;
}
