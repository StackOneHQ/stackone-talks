# MCP Conference Demo Code

Demo components for the talk "Making (and Breaking) Agents by Adding 1,000 MCP Tools" at MCPconf London 2026.

## Components

### 1. Demo Agent (`agent/`)

Interactive terminal agent that demonstrates MCP tool scaling problems and solutions.

```bash
cd agent
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

**Commands:**

| Command | What it does |
|---------|-------------|
| `/add <provider>` | Connect a StackOne account |
| `/accounts` | List all available accounts |
| `/connected` | Show connected accounts |
| `/tools` | List all loaded tools by provider |
| `/usage` | Show context window usage (baseline or actual after a run) |
| `/code` | Toggle code mode (1 tool sandbox) / MCP mode (all tools) |
| `/discover` | Toggle discovery mode (Anthropic Tool Search, deferred loading) |
| `/search` | Toggle search mode (client-side BM25 + TF-IDF) |
| `/reset` | Disconnect all accounts + stop sandbox |
| `/help` | Show command help |
| `/quit` | Exit |

**Available providers (20 total, ~914 MCP tools):**
Gmail (42), Trello (109), Gong (16), GitHub (74), HubSpot (65), Ashby (108), Zendesk (45), Range (22), Browserbase (18), Jira (158), Humaans (51), Datadog (26), Google Docs (3), Google Drive (47), Google Calendar (37), Fireflies (4), Notion (27), Google Sheets (?), Slack (32), Chrome DevTools (26, local MCP)

**Four modes:**
- **MCP mode** (default): All tools loaded into Claude's context. Shows the scaling problem.
- **Discovery mode** (`/discover`): All tools sent with `defer_loading: true`. Claude uses Anthropic's Tool Search Tool to find relevant tools server-side. Anthropic-specific.
- **Search mode** (`/search`): 2 meta-tools (`meta_search_tools` + `meta_execute_tool`). Client-side hybrid BM25 + TF-IDF ranking. Model-agnostic. See below.
- **Code mode** (`/code`): Single `execute_code` tool. Claude writes TypeScript that runs in a sandbox with pre-configured MCP tool wrappers.

### How search mode works

Search mode replaces 914 tool schemas with 2 meta-tools. When Claude needs a tool, it calls `meta_search_tools` with a natural language query (e.g. "list emails"). A client-side index ranks all tools and returns the top matches with their schemas. Claude then calls `meta_execute_tool` to invoke the one it wants.

The ranking uses two algorithms in combination:

**TF-IDF** (Term Frequency-Inverse Document Frequency) converts each tool's name + description into a sparse vector. The query becomes a vector too. Scoring is cosine similarity between the two vectors. Terms that are rare across all tools (like "gmail" or "jira") get high weight; common terms (like "list" or "get") get low weight. Good at matching conceptual overlap but blind to document length differences.

**BM25** (Best Match 25) is the algorithm behind most search engines. It adds two things TF-IDF lacks: (1) **term frequency saturation** — the 5th mention of "email" matters much less than the 1st, so verbose descriptions don't dominate; (2) **length normalization** — shorter, focused tool names get a boost over long descriptions that dilute signal.

**Hybrid fusion** combines them: `score = 0.2 × BM25 + 0.8 × TF-IDF`. TF-IDF dominates because cosine similarity already handles length well. BM25's 20% contribution breaks ties where TF-IDF scores two tools equally. This 0.2 alpha was tuned in `@stackone/ai`'s evaluation suite, producing 10.8% better accuracy than either algorithm alone.

The implementation is ~200 lines of TypeScript with zero dependencies. A minimal suffix stemmer handles plurals ("emails" → "email") and gerunds ("creating" → "creat"). Stopwords ("the", "my", "is") are stripped before indexing.

### 2. Security Demo (`agent/gmail-agent/` + `agent/prompt-defense/`)

Prompt injection attack + defense demo using a Gmail agent. Shows an email with hidden instructions tricking an agent, then `@stackone/prompt-defense` blocking it.

```bash
# Build the defense package
cd agent/prompt-defense
npm install && npm run build

# Install and run the gmail agent
cd ../gmail-agent
npm install
npm run run-attack
```

**What it demonstrates:**
- An email with a hidden `<div style="display:none">` containing fake system instructions
- Undefended agent follows the injection (forwards inbox data)
- Defense layer (regex + MLP classifier) blocks the attack before it reaches the agent

## Talk Structure

| Part | Component | What happens |
|------|-----------|-------------|
| Part 1: Build | agent | Start small (3 providers), first query works great |
| Part 2: Break | agent | Scale to 20 providers (~916 tools), context explosion, ambiguity |
| Part 3: Fix | agent + slides | Dynamic discovery, code mode, content sanitization |
| Security | agent/gmail-agent | Prompt injection via email, defense blocks it |

## Environment Variables

```env
# agent/.env
ANTHROPIC_API_KEY=your-anthropic-key
STACKONE_API_KEY=your-stackone-key
```

## Notes

- Terminal font should be 18pt+ for venue visibility
- Test WiFi before talk (bring mobile hotspot backup)
- All demo accounts are pre-connected in StackOne
- If live demo fails, slides have static terminal mockups of every step
