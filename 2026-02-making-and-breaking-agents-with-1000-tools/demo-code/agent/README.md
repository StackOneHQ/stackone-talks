# MCP Demo Agent

Demo agent for the talk **"Making and Breaking Agents with 1000 Tools"** (MCPconf London 2026).

Shows what breaks when you connect an LLM to hundreds of MCP tools, and how to fix it with dynamic tool discovery via meta-tools.

## Quick Start

```bash
npm install
npm start
```

Commands inside the agent:

| Command | What it does |
|---------|-------------|
| `/add <provider>` | Connect a StackOne provider (e.g. `/add github`) |
| `/discover` | Toggle search: Anthropic server-side BM25 (beta) |
| `/search` | Toggle search: client-side Orama BM25 + TF-IDF |
| `/code` | Toggle code mode (sandboxed execution) |
| `/defend` | Toggle prompt injection defense on tool results |
| `/usage` | Show context window usage breakdown |
| `/reset` | Clear conversation and providers |

## Tool Discovery Strategies

The agent supports two built-in search strategies (plus a third for reference). Both replace 845+ tool definitions with a smaller footprint, avoiding context window overflow.

| Strategy | Command | File | How it works |
|----------|---------|------|-------------|
| Anthropic BM25 | `/discover` | `search-anthropic.ts` | Server-side: tools sent with `defer_loading: true`, Anthropic searches them |
| BM25 + TF-IDF | `/search` | `search-bm25-tfidf.ts` | Client-side: 2 meta-tools, hybrid Orama BM25 + TF-IDF index |

The question is: **how do you rank search results?** Three strategies, each with different tradeoffs:

### Strategy 1: BM25 Only (`/discover` — `search-anthropic.ts`)

Anthropic's server-side tool search beta. All tools are sent with `defer_loading: true` and Anthropic's BM25 ranks them server-side before Claude sees them. Alternatively, use a client-side library like [Orama](https://orama.com) for BM25.

```
Accuracy: ~83% (39/47 test queries, measured client-side with Orama)
```

**Pros:**
- Simplest setup: one line to enable (`defer_loading: true`)
- No client-side index to build or maintain
- Built-in stemming and tokenization (Orama) or handled server-side (Anthropic)
- Fast -- sub-millisecond client-side, or zero-cost when server-side

**Cons:**
- Struggles when common action words ("create", "list") dominate the query
- A query like "create a jira ticket" scores `trello_create_card` and `jira_create_issue` similarly because "create" appears in both
- Provider-specific terms get drowned out by action terms
- Server-side: still beta, requires `anthropic-beta` header, limited tuning options

**When to use:** Prototyping, demos, or when you have <100 tools and ambiguity is low. The Anthropic server-side option is the fastest path to get started.

### Strategy 2: BM25 + TF-IDF Hybrid (`/search` — `search-bm25-tfidf.ts`)

Combine Orama's BM25 with a TF-IDF cosine similarity index. Fuse scores with a weighted formula:

```
score = 0.2 x BM25 + 0.8 x TF-IDF
```

```
Accuracy: 98% (46/47 test queries)
```

**Pros:**
- TF-IDF's inverse document frequency naturally weighs rare terms (provider names like "jira", "gmail") more heavily than common ones ("create", "list")
- Cosine similarity provides better discrimination between similar tools
- 10.8% accuracy improvement over BM25 alone (measured in @stackone/ai eval suite)
- No external API calls -- everything runs client-side

**Cons:**
- More code to maintain (~150 lines for TF-IDF index)
- Two indexes to keep in sync
- Alpha parameter (0.2) was tuned empirically -- may need re-tuning for different tool distributions
- Still keyword-based -- can't match "PTO" to "time off" without explicit synonyms

**When to use:** Production systems with 100-1000+ tools where accuracy matters. This is what `@stackone/ai` uses.

### Strategy 3: Semantic Search (Embeddings)

Encode tool descriptions and queries as dense vectors using an embedding model, then find nearest neighbors.

```
Accuracy: ~99%+ (estimated, depends on model)
```

**Pros:**
- Understands meaning, not just keywords -- "PTO request" matches "time off management"
- Handles synonyms, paraphrasing, and multilingual queries naturally
- Best accuracy for ambiguous or natural-language-heavy queries

**Cons:**
- Requires an embedding model (API call or local model)
- Adds latency: 50-200ms per query for API-based, 10-50ms for local models
- Vector storage and similarity search adds complexity
- Model choice affects quality -- need to evaluate which embedding model works best for tool descriptions
- Cold start cost: must embed all tool descriptions on first load

**When to use:** When you need the highest accuracy and can tolerate the latency/complexity. Good for systems where users write natural language queries and tool names don't follow predictable patterns.

### Strategy Comparison

| | Anthropic BM25 (`/discover`) | Client BM25 + TF-IDF (`/search`) | Semantic (not implemented) |
|---|---|---|---|
| **Accuracy** | ~83% | 98% | ~99%+ |
| **Latency** | Server-side (0 client) | <1ms | 10-200ms |
| **Dependencies** | None (Anthropic beta) | Orama + custom TF-IDF | Embedding model |
| **Handles synonyms** | No | No | Yes |
| **Extra API calls** | None | None | Per query (or local) |
| **Complexity** | Very low | Medium | High |
| **File** | `search-anthropic.ts` | `search-bm25-tfidf.ts` | -- |

## Architecture

### `/discover` — Anthropic server-side BM25

```
User prompt
    |
    v
Claude (tool_search_tool + all tools with defer_loading: true)
    |
    +-- Anthropic BM25 ranks tools server-side
    |
    +-- Claude calls top-ranked tools directly via MCP
```

### `/search` — Client-side BM25 + TF-IDF

```
User prompt
    |
    v
Claude (2 tools: meta_search_tools + meta_execute_tool)
    |
    +-- meta_search_tools --> Orama BM25 + TF-IDF hybrid index
    |                              |
    |                              v
    |                         Ranked tool list (name, description, params, score)
    |
    +-- meta_execute_tool --> MCP call_tool (actual API execution)
```

## Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main agent loop, dashboard, command handling |
| `src/search-anthropic.ts` | Anthropic server-side BM25 tool search (beta) |
| `src/search-bm25-tfidf.ts` | Client-side hybrid Orama BM25 + TF-IDF, meta-tool definitions |
| `src/test-search.ts` | 47 search accuracy tests for BM25 + TF-IDF |
| `src/code-mode.ts` | Code mode (sandboxed execution) |
| `src/defense-mode.ts` | Prompt injection defense on tool results |
| `src/sandbox.ts` | Sandbox runtime for code mode |
