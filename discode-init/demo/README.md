# Disco Search Demo

Demonstrates the context scaling problem with MCP tools — and how Disco solves it.

## Setup

```bash
cd search-demo
bun install
bun run fetch-tools            # fetches 1,058 tools from 20 StackOne accounts
# Add your Anthropic API key to .env
```

---

## Demo Flow

### Step 1: A few tools — works fine

```bash
bun run few "List all the conversations in slack"
```

3 accounts (HubSpot, Slack, Jira) → 238 tools, 508 KB of schemas.
Claude picks the right tool.

### Step 2: All tools — breaks

```bash
bun run all "List all the conversations in slack"
```

20 accounts → **1,058 tools, 2.5 MB of schemas** → 502 Bad Gateway.
Too many tools for the API to even accept.

### Step 3: Disco search — works instantly

```bash
bun run search "List all the conversations in slack"
```

Fine-tuned MiniLM routes to the right tool in **<5ms**, sends only
2-5 tools (4 KB) to Claude. Correct answer every time.

---

## The Numbers

|  | Few accounts | All 20 accounts | Disco Search |
|---|---|---|---|
| **Tools** | 238 | 1,058 | 2-5 |
| **Schema size** | 508 KB | 2,592 KB | ~4 KB |
| **Result** | Works | 502 — too large | Works |
| **Search latency** | — | — | <5ms |
| **Model** | — | — | MiniLM-L6-v2, 22M params, 22 MB |

92.4% Hit@1 on held-out connectors never seen during training.
