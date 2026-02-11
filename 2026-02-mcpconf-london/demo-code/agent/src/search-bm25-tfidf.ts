/**
 * Search Mode — client-side hybrid BM25 (Orama) + TF-IDF tool discovery.
 *
 * Uses @orama/orama for BM25 scoring and a lightweight TF-IDF index for
 * hybrid search, following the same pattern as @stackone/ai's metaTools.
 *
 * Instead of loading 845 tool schemas into context, gives Claude two
 * meta-tools: `meta_search_tools` (find tools) and `meta_execute_tool`
 * (call them via MCP). Model-agnostic — works with any LLM.
 *
 * 845 tools → 2 tools. Context drops from 130k tokens to ~1k.
 *
 * ## Why hybrid?
 *
 * BM25 alone (39/47 tests) vs hybrid (46/47 tests). BM25 struggles when
 * common action words ("create", "list") dominate over provider-specific
 * terms. TF-IDF's cosine similarity handles this better because it weighs
 * rare terms (provider names) more heavily. The fusion formula:
 *   score = 0.2 × BM25 + 0.8 × TF-IDF
 * was tuned in @stackone/ai's eval suite (10.8% accuracy improvement).
 */

import type Anthropic from "@anthropic-ai/sdk";
import * as orama from "@orama/orama";
import * as p from "@clack/prompts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HYBRID_ALPHA = 0.2; // 20% BM25 + 80% TF-IDF

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let enabled = false;
let oramaDb: ReturnType<typeof orama.create> | null = null;
let tfidfIdx: TfidfIndex | null = null;
let indexedTools: Map<string, any> = new Map();

export function isEnabled(): boolean {
	return enabled;
}

// ---------------------------------------------------------------------------
// TF-IDF index (sparse vector cosine similarity)
//
// Same implementation as @stackone/ai's TfidfIndex. Each document becomes
// a sparse vector in term-space, scored by cosine similarity with the query.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
	"a", "an", "the", "and", "or", "but", "if", "for", "of", "in", "on",
	"to", "from", "by", "with", "as", "at", "is", "are", "was", "were",
	"be", "been", "it", "this", "that", "not", "no", "can", "do", "does",
	"have", "has", "had", "you", "your", "my", "me", "we", "our", "all",
]);

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9_\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

type SparseVec = Map<number, number>;

class TfidfIndex {
	private vocab = new Map<string, number>();
	private idf: number[] = [];
	private docs: { id: string; vec: SparseVec; norm: number }[] = [];

	build(corpus: { id: string; text: string }[]): void {
		const docsTokens = corpus.map((d) => tokenize(d.text));

		for (const tokens of docsTokens)
			for (const t of tokens)
				if (!this.vocab.has(t)) this.vocab.set(t, this.vocab.size);

		const df = new Map<number, number>();
		for (const tokens of docsTokens) {
			const seen = new Set<number>();
			for (const t of tokens) {
				const id = this.vocab.get(t)!;
				if (!seen.has(id)) { seen.add(id); df.set(id, (df.get(id) || 0) + 1); }
			}
		}

		const N = corpus.length;
		this.idf = Array.from({ length: this.vocab.size }, (_, id) =>
			Math.log((N + 1) / ((df.get(id) || 0) + 1)) + 1,
		);

		this.docs = corpus.map((d, i) => {
			const tokens = docsTokens[i]!;
			const tf = new Map<number, number>();
			for (const t of tokens) { const id = this.vocab.get(t)!; tf.set(id, (tf.get(id) || 0) + 1); }

			const vec: SparseVec = new Map();
			let normSq = 0;
			for (const [id, f] of tf) {
				const w = (f / (tokens.length || 1)) * this.idf[id]!;
				if (w > 0) { vec.set(id, w); normSq += w * w; }
			}
			return { id: d.id, vec, norm: Math.sqrt(normSq) || 1 };
		});
	}

	search(query: string, k = 10): { id: string; score: number }[] {
		const tokens = tokenize(query);
		if (tokens.length === 0) return [];

		const tf = new Map<number, number>();
		for (const t of tokens) {
			const id = this.vocab.get(t);
			if (id !== undefined) tf.set(id, (tf.get(id) || 0) + 1);
		}
		if (tf.size === 0) return [];

		const qVec: SparseVec = new Map();
		let qNormSq = 0;
		for (const [id, f] of tf) {
			const w = (f / tokens.length) * this.idf[id]!;
			if (w > 0) { qVec.set(id, w); qNormSq += w * w; }
		}
		const qNorm = Math.sqrt(qNormSq) || 1;

		const results: { id: string; score: number }[] = [];
		for (const d of this.docs) {
			let dot = 0;
			const [small, big] = qVec.size <= d.vec.size ? [qVec, d.vec] : [d.vec, qVec];
			for (const [id, w] of small) {
				const v = big.get(id);
				if (v !== undefined) dot += w * v;
			}
			const sim = dot / (qNorm * d.norm);
			if (sim > 0) results.push({ id: d.id, score: Math.min(1, sim) });
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, k);
	}
}

// ---------------------------------------------------------------------------
// Index management
// ---------------------------------------------------------------------------

function buildCorpus(allTools: Map<string, any>): { id: string; text: string }[] {
	return Array.from(allTools.entries()).map(([key, tool]) => {
		const parts = tool.name.split(/[-_]/);
		const integration = parts[0];
		const actionTypes = ["create", "update", "delete", "get", "list", "search"];
		const actions = parts.filter((p: string) => actionTypes.includes(p));

		return {
			id: key,
			text: [
				`${tool.name} ${tool.name} ${tool.name}`,
				`${integration} ${actions.join(" ")}`,
				tool.description || "",
				parts.join(" "),
			].join(" "),
		};
	});
}

export async function buildIndex(allTools: Map<string, any>): Promise<void> {
	indexedTools = new Map(allTools);

	// Orama BM25 index (structured fields + stemming)
	oramaDb = orama.create({
		schema: {
			name: "string" as const,
			description: "string" as const,
			integration: "string" as const,
			tags: "string[]" as const,
		},
		components: { tokenizer: { stemming: true } },
	});

	for (const [, tool] of allTools) {
		const parts = tool.name.split(/[-_]/);
		const integration = parts[0];
		const actionTypes = ["create", "update", "delete", "get", "list", "search"];
		const actions = parts.filter((p: string) => actionTypes.includes(p));
		await orama.insert(oramaDb, {
			name: tool.name,
			description: tool.description || "",
			integration,
			tags: [...parts, ...actions],
		});
	}

	// TF-IDF index (enriched text + cosine similarity)
	tfidfIdx = new TfidfIndex();
	tfidfIdx.build(buildCorpus(allTools));
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export async function toggle(
	allTools: Map<string, any>,
	renderDashboard: () => void,
): Promise<void> {
	if (allTools.size === 0 && !enabled) {
		p.log.warn("No tools loaded. Use /add <provider> first.");
		return;
	}
	enabled = !enabled;
	if (enabled) {
		await buildIndex(allTools);
		p.log.success(`Search mode ON — ${allTools.size} tools indexed (Orama BM25 + TF-IDF)`);
	} else {
		oramaDb = null;
		tfidfIdx = null;
		indexedTools.clear();
		p.log.info("Search mode OFF — all tools loaded in context");
	}
	renderDashboard();
}

// ---------------------------------------------------------------------------
// Anthropic tool definitions
// ---------------------------------------------------------------------------

export function buildTools(): Anthropic.Tool[] {
	return [
		{
			name: "meta_search_tools",
			description:
				"Search for relevant tools using a natural language query. " +
				"Uses hybrid BM25 + TF-IDF ranking. Call this FIRST to discover " +
				"which tools are available, then use meta_execute_tool to call them.",
			input_schema: {
				type: "object" as const,
				properties: {
					query: {
						type: "string",
						description:
							"Natural language query (e.g., 'list emails', 'create jira ticket', 'get employee info')",
					},
					limit: {
						type: "number",
						description: "Max results to return (default: 5)",
					},
				},
				required: ["query"],
			},
		},
		{
			name: "meta_execute_tool",
			description:
				"Execute a tool discovered via meta_search_tools. " +
				"Pass the exact tool name and its parameters.",
			input_schema: {
				type: "object" as const,
				properties: {
					tool_name: {
						type: "string",
						description: "Exact name of the tool (from meta_search_tools results)",
					},
					params: {
						type: "object",
						description: "Parameters to pass to the tool",
					},
				},
				required: ["tool_name"],
			},
		},
	];
}

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------

function clamp01(x: number): number {
	return x < 0 ? 0 : x > 1 ? 1 : x;
}

export type SearchDebug = {
	bm25Top: { name: string; score: number }[];
	tfidfTop: { name: string; score: number }[];
	fusionTop: { name: string; bm25: number; tfidf: number; hybrid: number }[];
	totalCandidates: number;
	elapsed: string;
};

export async function handleSearch(input: {
	query: string;
	limit?: number;
}): Promise<{
	tools: { name: string; provider: string; description: string; parameters: any; score: number }[];
	debug: SearchDebug;
}> {
	const emptyDebug: SearchDebug = { bm25Top: [], tfidfTop: [], fusionTop: [], totalCandidates: 0, elapsed: "0ms" };
	if (!oramaDb || !tfidfIdx) return { tools: [], debug: emptyDebug };

	const t0 = performance.now();
	const limit = input.limit || 5;
	const minScore = 0.3;

	const [bm25Results, tfidfResults] = await Promise.all([
		orama.search(oramaDb, {
			term: input.query,
			limit: Math.max(50, limit),
		} as Parameters<typeof orama.search>[1]),
		Promise.resolve(tfidfIdx.search(input.query, Math.max(50, limit))),
	]);

	// Normalize BM25 scores to [0, 1]
	const bm25Max = bm25Results.hits.length > 0
		? Math.max(...bm25Results.hits.map((h) => h.score))
		: 1;

	const scoreMap = new Map<string, { bm25: number; tfidf: number }>();

	for (const hit of bm25Results.hits) {
		const doc = hit.document as { name: string };
		const toolKey = Array.from(indexedTools.keys()).find((k) =>
			k.endsWith(`::${doc.name}`),
		) || doc.name;
		const normalized = bm25Max > 0 ? hit.score / bm25Max : 0;
		scoreMap.set(toolKey, { bm25: clamp01(normalized), tfidf: 0 });
	}

	for (const r of tfidfResults) {
		const existing = scoreMap.get(r.id);
		if (existing) {
			existing.tfidf = clamp01(r.score);
		} else {
			scoreMap.set(r.id, { bm25: 0, tfidf: clamp01(r.score) });
		}
	}

	const fused: { id: string; score: number }[] = [];
	for (const [id, scores] of scoreMap) {
		const score = HYBRID_ALPHA * scores.bm25 + (1 - HYBRID_ALPHA) * scores.tfidf;
		if (score >= minScore) fused.push({ id, score });
	}

	fused.sort((a, b) => b.score - a.score);

	const elapsed = `${(performance.now() - t0).toFixed(1)}ms`;

	// Build debug info for demo logging
	const toolName = (id: string) => indexedTools.get(id)?.name || id.split("::").pop() || id;
	const round2 = (n: number) => Math.round(n * 100) / 100;

	const bm25Top = bm25Results.hits.slice(0, 5).map((h) => ({
		name: (h.document as { name: string }).name,
		score: round2(bm25Max > 0 ? h.score / bm25Max : 0),
	}));

	const tfidfTop = tfidfResults.slice(0, 5).map((r) => ({
		name: toolName(r.id),
		score: round2(r.score),
	}));

	const fusionTop = fused.slice(0, limit).map((r) => {
		const scores = scoreMap.get(r.id)!;
		return {
			name: toolName(r.id),
			bm25: round2(scores.bm25),
			tfidf: round2(scores.tfidf),
			hybrid: round2(r.score),
		};
	});

	const debug: SearchDebug = {
		bm25Top,
		tfidfTop,
		fusionTop,
		totalCandidates: scoreMap.size,
		elapsed,
	};

	return {
		tools: fused.slice(0, limit).map((r) => {
			const tool = indexedTools.get(r.id);
			return {
				name: tool?.name || r.id,
				provider: tool?.provider || "unknown",
				description: (tool?.description || "").slice(0, 200),
				parameters: tool?.inputSchema || { type: "object", properties: {} },
				score: Math.round(r.score * 100) / 100,
			};
		}),
		debug,
	};
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

export function buildSystemPrompt(): string {
	const providers = new Set<string>();
	for (const [, tool] of indexedTools) {
		providers.add(tool.provider);
	}
	return [
		"You discover and call tools using two meta-tools:",
		"1. meta_search_tools — find tools by natural language query",
		"2. meta_execute_tool — call a discovered tool by name",
		"",
		`Available providers: ${Array.from(providers).join(", ")}`,
		`Total tools indexed: ${indexedTools.size}`,
		"",
		"Always search first, then execute. Return concise results.",
	].join("\n");
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export function cleanup(): void {
	enabled = false;
	oramaDb = null;
	tfidfIdx = null;
	indexedTools.clear();
}
