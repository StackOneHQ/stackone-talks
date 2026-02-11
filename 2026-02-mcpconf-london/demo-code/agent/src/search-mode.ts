/**
 * Search Mode — client-side hybrid BM25 + TF-IDF tool discovery.
 *
 * Reimplemented from scratch, inspired by @stackone/ai's metaTools.
 * Instead of loading 845 tool schemas into context, gives Claude two
 * meta-tools: `meta_search_tools` (find tools) and `meta_execute_tool`
 * (call them via MCP). Model-agnostic — works with any LLM.
 *
 * 845 tools → 2 tools. Context drops from 130k tokens to ~1k.
 *
 * ## How the search works
 *
 * Two ranking algorithms run independently, then their scores are fused:
 *
 * **TF-IDF** (Term Frequency–Inverse Document Frequency)
 *   Each tool becomes a sparse vector in term-space. Query becomes a vector
 *   too. Score = cosine similarity between query vector and doc vector.
 *   Good at: finding tools that share rare, distinctive terms with the query.
 *   Weak at: handling document length differences (a long description with
 *   one mention scores the same as a short one with one mention).
 *
 * **BM25** (Okapi Best Match 25)
 *   Extends TF-IDF with two key improvements:
 *   1. Term frequency saturation (k1=1.2): the 5th mention of "email"
 *      matters much less than the 1st. Prevents long descriptions from
 *      dominating just because they repeat a word.
 *   2. Document length normalization (b=0.75): shorter, focused tool
 *      descriptions get a boost over long verbose ones.
 *
 * **Hybrid fusion** (alpha=0.2 → 20% BM25, 80% TF-IDF)
 *   Score = 0.2 * BM25_normalized + 0.8 * TF-IDF_cosine.
 *   TF-IDF dominates because cosine similarity already handles length well.
 *   BM25's contribution is the saturation effect: it breaks ties where
 *   TF-IDF alone would rank two tools equally. This alpha was tuned in
 *   @stackone/ai's eval suite, yielding 10.8% higher accuracy vs either
 *   algorithm alone.
 */

import type Anthropic from "@anthropic-ai/sdk";
import * as p from "@clack/prompts";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let enabled = false;
let index: HybridIndex | null = null;
let indexedTools: Map<string, any> = new Map();

export function isEnabled(): boolean {
	return enabled;
}

// ---------------------------------------------------------------------------
// Tokenizer + stopwords (shared by both BM25 and TF-IDF)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
	"a", "an", "the", "and", "or", "but", "if", "for", "of", "in", "on",
	"to", "from", "by", "with", "as", "at", "is", "are", "was", "were",
	"be", "been", "it", "this", "that", "not", "no", "can", "do", "does",
	"have", "has", "had", "you", "your", "my", "me", "we", "our", "all",
]);

/** Minimal suffix stemmer — just enough to match "emails" → "email", "messages" → "message", etc. */
function stem(word: string): string {
	if (word.length <= 3) return word;
	if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
	if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
	if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
	if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
	return word;
}

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9_\s]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 0 && !STOPWORDS.has(t))
		.map(stem);
}

// ---------------------------------------------------------------------------
// TF-IDF (sparse vectors + cosine similarity)
//
// Each document and query become sparse vectors where each dimension is a term.
// Weight = (term_freq / doc_length) × IDF.
// Score = cosine similarity = dot(query, doc) / (|query| × |doc|).
// The cosine handles variable-length documents, but doesn't saturate TF like BM25.
// ---------------------------------------------------------------------------

type SparseVec = Map<number, number>;

class TfidfIndex {
	private vocab = new Map<string, number>();
	private idf: number[] = [];
	private docs: { id: string; vec: SparseVec; norm: number }[] = [];

	build(corpus: { id: string; text: string }[]): void {
		const docsTokens = corpus.map((d) => tokenize(d.text));

		// Build vocabulary
		for (const tokens of docsTokens) {
			for (const t of tokens) {
				if (!this.vocab.has(t)) this.vocab.set(t, this.vocab.size);
			}
		}

		// Document frequency
		const df = new Map<number, number>();
		for (const tokens of docsTokens) {
			const seen = new Set<number>();
			for (const t of tokens) {
				const id = this.vocab.get(t)!;
				if (!seen.has(id)) {
					seen.add(id);
					df.set(id, (df.get(id) || 0) + 1);
				}
			}
		}

		// Smoothed IDF
		const N = corpus.length;
		this.idf = Array.from({ length: this.vocab.size }, (_, id) => {
			return Math.log((N + 1) / ((df.get(id) || 0) + 1)) + 1;
		});

		// Document vectors
		this.docs = corpus.map((d, i) => {
			const tokens = docsTokens[i]!;
			const tf = new Map<number, number>();
			for (const t of tokens) {
				const id = this.vocab.get(t)!;
				tf.set(id, (tf.get(id) || 0) + 1);
			}
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

		// Query vector
		const qVec: SparseVec = new Map();
		let qNormSq = 0;
		for (const [id, f] of tf) {
			const w = (f / tokens.length) * this.idf[id]!;
			if (w > 0) { qVec.set(id, w); qNormSq += w * w; }
		}
		const qNorm = Math.sqrt(qNormSq) || 1;

		// Cosine similarity
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
// BM25 (Okapi BM25, implemented from scratch — no external deps)
//
// Standard formula per query term qi and document D:
//   score(qi, D) = IDF(qi) × (f × (k1 + 1)) / (f + k1 × (1 − b + b × |D|/avgdl))
// where f = term frequency of qi in D, |D| = doc length, avgdl = avg doc length.
//
// k1 controls term frequency saturation: higher k1 means raw count matters more.
// b controls length normalization: b=1 fully normalizes, b=0 ignores length.
// ---------------------------------------------------------------------------

class Bm25Index {
	private k1 = 1.2;  // saturation: after ~2-3 occurrences, extra mentions matter less
	private b = 0.75;   // length normalization: shorter docs get a ~25% boost
	private vocab = new Map<string, number>();
	private idf: number[] = [];
	private docs: { id: string; tf: Map<number, number>; len: number }[] = [];
	private avgdl = 0;

	build(corpus: { id: string; text: string }[]): void {
		const docsTokens = corpus.map((d) => tokenize(d.text));

		// Build vocabulary
		for (const tokens of docsTokens) {
			for (const t of tokens) {
				if (!this.vocab.has(t)) this.vocab.set(t, this.vocab.size);
			}
		}

		// Document frequency
		const df = new Map<number, number>();
		for (const tokens of docsTokens) {
			const seen = new Set<number>();
			for (const t of tokens) {
				const id = this.vocab.get(t)!;
				if (!seen.has(id)) {
					seen.add(id);
					df.set(id, (df.get(id) || 0) + 1);
				}
			}
		}

		// IDF: ln((N - n + 0.5) / (n + 0.5) + 1)
		const N = corpus.length;
		this.idf = Array.from({ length: this.vocab.size }, (_, id) => {
			const n = df.get(id) || 0;
			return Math.log((N - n + 0.5) / (n + 0.5) + 1);
		});

		// Store doc term frequencies and lengths
		let totalLen = 0;
		this.docs = corpus.map((d, i) => {
			const tokens = docsTokens[i]!;
			const tf = new Map<number, number>();
			for (const t of tokens) {
				const id = this.vocab.get(t)!;
				tf.set(id, (tf.get(id) || 0) + 1);
			}
			totalLen += tokens.length;
			return { id: d.id, tf, len: tokens.length };
		});
		this.avgdl = totalLen / (corpus.length || 1);
	}

	search(query: string, k = 10): { id: string; score: number }[] {
		const tokens = tokenize(query);
		if (tokens.length === 0) return [];

		const queryTermIds = new Set<number>();
		for (const t of tokens) {
			const id = this.vocab.get(t);
			if (id !== undefined) queryTermIds.add(id);
		}
		if (queryTermIds.size === 0) return [];

		const results: { id: string; score: number }[] = [];
		for (const doc of this.docs) {
			let score = 0;
			for (const termId of queryTermIds) {
				const f = doc.tf.get(termId) || 0;
				if (f === 0) continue;
				const idf = this.idf[termId]!;
				// BM25 formula
				score += idf * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * (doc.len / this.avgdl))));
			}
			if (score > 0) results.push({ id: doc.id, score });
		}

		// Normalize scores to 0-1 range
		const maxScore = results.length > 0 ? results[0]!.score : 1;
		if (maxScore > 0) {
			for (const r of results) r.score = r.score / maxScore;
		}

		results.sort((a, b) => b.score - a.score);
		return results.slice(0, k);
	}
}

// ---------------------------------------------------------------------------
// Hybrid index (BM25 + TF-IDF fusion)
//
// Why combine them? Each has blind spots the other covers:
// - TF-IDF with cosine similarity is great at matching conceptual overlap
//   (query "get employee info" matches tool description "retrieve employee data")
//   but treats all term occurrences equally.
// - BM25 is better at keyword precision (query "jira" strongly boosts anything
//   with "jira" in the name) and penalizes verbose descriptions that dilute signal.
//
// The fusion formula: score = alpha × BM25 + (1 - alpha) × TF-IDF
// Both scores are normalized to [0, 1] before fusion.
// ---------------------------------------------------------------------------

// alpha = 0.2 means 20% BM25 + 80% TF-IDF
// Tuned in @stackone/ai evals: 10.8% accuracy improvement over either alone
const HYBRID_ALPHA = 0.2;

class HybridIndex {
	private tfidf = new TfidfIndex();
	private bm25 = new Bm25Index();

	build(corpus: { id: string; text: string }[]): void {
		this.tfidf.build(corpus);
		this.bm25.build(corpus);
	}

	search(query: string, k = 10, minScore = 0.3): { id: string; score: number }[] {
		const bm25Results = this.bm25.search(query, 50);
		const tfidfResults = this.tfidf.search(query, 50);

		// Fuse scores
		const scores = new Map<string, { bm25: number; tfidf: number }>();
		for (const r of bm25Results) {
			scores.set(r.id, { bm25: r.score, tfidf: 0 });
		}
		for (const r of tfidfResults) {
			const existing = scores.get(r.id);
			if (existing) {
				existing.tfidf = r.score;
			} else {
				scores.set(r.id, { bm25: 0, tfidf: r.score });
			}
		}

		const fused: { id: string; score: number }[] = [];
		for (const [id, s] of scores) {
			const score = HYBRID_ALPHA * s.bm25 + (1 - HYBRID_ALPHA) * s.tfidf;
			if (score >= minScore) fused.push({ id, score });
		}

		fused.sort((a, b) => b.score - a.score);
		return fused.slice(0, k);
	}
}

// ---------------------------------------------------------------------------
// Index management
// ---------------------------------------------------------------------------

export function buildIndex(allTools: Map<string, any>): void {
	index = new HybridIndex();
	indexedTools = new Map(allTools);

	const corpus = Array.from(allTools.entries()).map(([key, tool]) => {
		const parts = tool.name.split(/[-_]/);
		const integration = parts[0];
		const actionTypes = ["create", "update", "delete", "get", "list", "search"];
		const actions = parts.filter((p: string) => actionTypes.includes(p));

		// Weight the name heavily (same strategy as @stackone/ai)
		const text = [
			`${tool.name} ${tool.name} ${tool.name}`,
			`${integration} ${actions.join(" ")}`,
			tool.description || "",
			parts.join(" "),
		].join(" ");

		return { id: key, text };
	});

	index.build(corpus);
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export function toggle(
	allTools: Map<string, any>,
	renderDashboard: () => void,
): void {
	if (allTools.size === 0 && !enabled) {
		p.log.warn("No tools loaded. Use /add <provider> first.");
		return;
	}
	enabled = !enabled;
	if (enabled) {
		buildIndex(allTools);
		p.log.success(`Search mode ON — ${allTools.size} tools indexed (BM25 + TF-IDF)`);
	} else {
		index = null;
		indexedTools.clear();
		p.log.info("Search mode OFF — all tools loaded in context");
	}
	renderDashboard();
}

// ---------------------------------------------------------------------------
// Anthropic tool definitions — the two meta-tools Claude sees
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
// Tool execution handlers
// ---------------------------------------------------------------------------

export function handleSearch(input: {
	query: string;
	limit?: number;
}): { tools: { name: string; provider: string; description: string; score: number }[] } {
	if (!index) return { tools: [] };
	const results = index.search(input.query, input.limit || 5);
	return {
		tools: results.map((r) => {
			const tool = indexedTools.get(r.id);
			return {
				name: tool?.name || r.id,
				provider: tool?.provider || "unknown",
				description: (tool?.description || "").slice(0, 200),
				parameters: tool?.inputSchema || { type: "object", properties: {} },
				score: Math.round(r.score * 100) / 100,
			};
		}),
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
	index = null;
	indexedTools.clear();
}
