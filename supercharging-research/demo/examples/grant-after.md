# Grant Application: AI Agent Architectures (After)

## The Agent-Assisted Way

Same grant, but this time the research agent does the legwork.

---

### Step 1: One command

```bash
uv run python scripts/full_pipeline.py "AI agent architectures tool use"
```

The pipeline searches arXiv for the 10 most recent papers, summarises each one,
collects relevant discourse from X/Twitter, and rebuilds the vault index.

**Time: 3 minutes.**

### Step 2: Vault is populated

```
vault/papers/
  2026-04-18-toolformer-v2-scaling-tool-use-in-llms.md
  2026-04-15-react-plus-planning-with-reflection-loops.md
  2026-04-12-multi-agent-orchestration-patterns.md
  ...

vault/tweets/
  20260420-tweet-ai-agents-tool-use-01.md
  20260420-tweet-ai-agents-tool-use-02.md
  ...
```

Each note has YAML frontmatter with authors, dates, tags, and source URLs.
Cross-references are wikilinked: [[2026-04-18-toolformer-v2-scaling-tool-use-in-llms]].

### Step 3: Ask the agent to draft the literature review

> /summarize the 5 most recent papers on tool-use in agent architectures,
> highlighting methodological differences and open problems.

The agent produces a structured review with inline citations:

> Recent work on tool-augmented agents has diverged into two camps. The
> *embedded tool-use* approach fine-tunes models on tool-call traces
> [Chen et al., 2026], while the *prompting-based* approach relies on
> in-context demonstrations and reflection [Yao et al., 2026; Shinn et al., 2025].
> Both achieve strong results on API-calling benchmarks, but neither handles
> multi-step planning with fallback reliably [Park et al., 2026].

Every claim links to a vault note. Every vault note links to the source paper.

### Step 4: Connect meeting context

The Fireflies MCP integration pulls the transcript from last week's advisor call.
The agent extracts the key decision:

> "Focus the proposal on the planning gap -- reviewers will want to see
> how your approach handles tool failures gracefully." -- Prof. Martinez, 2026-04-14

This gets linked into the methodology section with a proper reference.

### Step 5: Knowledge graph

```
/graphify vault/papers/
```

Generates an interactive HTML graph showing how papers cluster around
sub-topics: tool selection, error recovery, multi-agent coordination.
Reveals a gap in the literature around *dynamic tool discovery at runtime* --
a perfect angle for the proposal.

---

## Time spent: ~2 hours (mostly writing, not searching)

## Citations: 14 confirmed, all linked to source

## Confidence level: High

## Will the PI read this and say "looks great"? Yes.
