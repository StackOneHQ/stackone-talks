/**
 * Defense Mode — wraps @stackone/prompt-defense to sanitize tool results.
 */

import { createPromptDefense } from "@stackone/prompt-defense";
import * as p from "@clack/prompts";
import chalk from "chalk";

let enabled = false;
const defense = createPromptDefense({ blockHighRisk: true });

export function isEnabled(): boolean {
	return enabled;
}

export function toggle(renderDashboard: () => void): void {
	enabled = !enabled;
	p.log.info(enabled ? "Defense ON" : "Defense OFF");
	renderDashboard();
}

/** Instructions to append to the system prompt when defense is active. */
export function getSystemInstructions(): string {
	return defense.getSystemPromptInstructions();
}

export function defendResult(resultContent: string, toolName: string): string {
	try {
		const parsed = JSON.parse(resultContent);

		// Tier 1: block high-risk content outright
		const analysis = defense.analyze(JSON.stringify(parsed));
		if (analysis.suggestedRisk === "high" || analysis.suggestedRisk === "critical") {
			p.log.error(chalk.red(`🛡️  BLOCKED — injection detected in ${toolName}`));
			return JSON.stringify({
				error: "Blocked by prompt defense — injection detected",
			});
		}

		// Tier 2: sanitize (adds boundary annotations, strips role markers)
		const { sanitized, metadata } = defense.sanitizeToolResult(parsed, {
			toolName,
		});
		if (metadata.fieldsSanitized.length > 0) {
			p.log.step(
				chalk.green(`🛡️  Sanitized ${metadata.fieldsSanitized.length} fields`),
			);
			return JSON.stringify(sanitized);
		}

		return resultContent;
	} catch {
		return resultContent;
	}
}

export function cleanup(): void {
	enabled = false;
}
