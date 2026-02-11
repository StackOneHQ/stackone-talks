/**
 * Defense Mode — Prompt injection defense for tool results.
 *
 * Uses @stackone/prompt-defense to detect and block injection attacks
 * hidden in tool outputs (emails, documents, etc.).
 *
 * Tier 1: Pattern-based detection (regex, instant)
 * Tier 2: ML classifier (MLP + embeddings, ~100ms)
 */

import {
	createPromptDefense,
	createTier2Classifier,
	MLP_WEIGHTS,
	hasValidWeights,
} from "../prompt-defense/src/index.ts";
import * as p from "@clack/prompts";
import chalk from "chalk";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let enabled = false;
let defense: ReturnType<typeof createPromptDefense> | null = null;
let tier2: ReturnType<typeof createTier2Classifier> | null = null;
let ready = false;

export function isEnabled(): boolean {
	return enabled;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DefenseResult {
	allowed: boolean;
	riskLevel: string;
	detections: string[];
	tier2Score?: number;
	maxSentence?: string;
	latencyMs: number;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function init(): Promise<void> {
	if (ready) return;

	defense = createPromptDefense({
		enableTier1: true,
		enableTier2: false, // We run Tier 2 separately for sentence-level analysis
	});

	if (hasValidWeights()) {
		tier2 = createTier2Classifier();
		tier2.loadWeights(MLP_WEIGHTS);
		p.log.step("Loading Tier 2 ML classifier...");
		await tier2.warmup();
		p.log.success("Defense ready (Tier 1 patterns + Tier 2 ML)");
	} else {
		p.log.warn("ML weights not found, using Tier 1 patterns only");
	}

	ready = true;
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export async function toggle(renderDashboard: () => void): Promise<void> {
	if (enabled) {
		enabled = false;
		p.log.info("Defense OFF");
	} else {
		if (!ready) await init();
		enabled = true;
		p.log.success("Defense ON — tool results will be scanned for injection");
	}
	renderDashboard();
}

// ---------------------------------------------------------------------------
// Tool result defense check
// ---------------------------------------------------------------------------

function extractStrings(obj: unknown): string[] {
	const strings: string[] = [];
	function traverse(value: unknown): void {
		if (typeof value === "string") {
			strings.push(value);
		} else if (Array.isArray(value)) {
			for (const item of value) traverse(item);
		} else if (value && typeof value === "object") {
			for (const v of Object.values(value)) traverse(v);
		}
	}
	traverse(obj);
	return strings;
}

export async function checkToolResult(
	result: unknown,
	toolName: string,
): Promise<DefenseResult> {
	if (!defense) throw new Error("Defense not initialized");

	const startTime = performance.now();

	// Tier 1: pattern detection
	const sanitized = defense.sanitizeToolResult(result, { toolName });
	const detections: string[] = [];
	for (const patterns of Object.values(
		sanitized.metadata.patternsRemovedByField,
	)) {
		for (const pattern of patterns) {
			if (!detections.includes(pattern)) detections.push(pattern);
		}
	}

	// Tier 2: ML sentence-level classification
	let tier2Score: number | undefined;
	let maxSentence: string | undefined;
	let tier2Risk: "low" | "medium" | "high" = "low";

	if (tier2) {
		const strings = extractStrings(result);
		const text = strings.join("\n\n");
		if (text.length > 0) {
			const t2 = await tier2.classifyBySentence(text);
			if (!t2.skipped) {
				tier2Score = t2.score;
				tier2Risk = tier2.getRiskLevel(t2.score);
				maxSentence = t2.maxSentence;
			}
		}
	}

	const latencyMs = performance.now() - startTime;

	// Overall risk = max(tier1, tier2)
	const riskLevels = ["low", "medium", "high", "critical"];
	const t1Idx = riskLevels.indexOf(sanitized.metadata.overallRiskLevel);
	const t2Idx = riskLevels.indexOf(tier2Risk);
	const overallRisk = riskLevels[Math.max(t1Idx, t2Idx)];
	const allowed = overallRisk !== "high" && overallRisk !== "critical";

	return {
		allowed,
		riskLevel: overallRisk,
		detections,
		tier2Score,
		maxSentence,
		latencyMs,
	};
}

/**
 * Run defense on a tool result string. Returns the (possibly replaced) content.
 * Logs the outcome to the terminal.
 */
export async function defendResult(
	resultContent: string,
	toolName: string,
): Promise<string> {
	try {
		const parsed = JSON.parse(resultContent);
		const check = await checkToolResult(parsed, toolName);

		if (!check.allowed) {
			p.log.error(
				chalk.red(
					`🛡️  BLOCKED [${check.riskLevel.toUpperCase()}] ${check.detections.join(", ")}`,
				),
			);
			if (check.tier2Score !== undefined) {
				p.log.warn(
					`   ML score: ${check.tier2Score.toFixed(3)} — "${check.maxSentence?.substring(0, 60)}..."`,
				);
			}
			return JSON.stringify({
				error: `Content blocked by prompt defense (risk: ${check.riskLevel})`,
				detections: check.detections,
			});
		}

		p.log.step(
			chalk.green(
				`🛡️  OK [${check.riskLevel}] ${check.latencyMs.toFixed(0)}ms`,
			),
		);
		return resultContent;
	} catch {
		// Non-JSON result — skip defense
		return resultContent;
	}
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function cleanup(): void {
	enabled = false;
}
