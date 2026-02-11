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
| `/add-defaults` | Load agent built-in tools (web search, file ops, bash, etc.) |
| `/add <provider>` | Connect a StackOne account |
| `/accounts` | List all available accounts |
| `/connected` | Show connected accounts |
| `/tools` | List all loaded tools by provider |
| `/context` | Show real token cost via Anthropic's count_tokens API |
| `/code` | Toggle code mode (1 tool sandbox) / MCP mode (all tools) |
| `/demo` | Run the full demo sequence automatically |
| `/reset` | Disconnect all accounts + stop sandbox |
| `/help` | Show command help |
| `/quit` | Exit |

**Available providers (18 total, ~880 MCP tools):**
Gmail (42), Trello (109), Gong (16), GitHub (74), HubSpot (65), Ashby (108), Zendesk (45), Honeycomb (28), Range (22), Browserbase (18), Jira (158), Humaans (51), Datadog (26), Google Docs (3), Google Drive (47), Google Calendar (37), Fireflies (4), Notion (27)

**Two modes:**
- **MCP mode** (default): All tools loaded into Claude's context. Shows the scaling problem.
- **Code mode** (`/code`): Single `execute_code` tool. Claude writes TypeScript that runs in a sandbox with pre-configured MCP tool wrappers.

### 2. Security Demo (`stackone-agent-redteaming/`)

Prompt injection attack + defense demo using a Gmail agent. Shows an email with hidden instructions tricking an agent, then `@stackone/prompt-defense` blocking it.

```bash
# Build the defense package
cd stackone-agent-redteaming/guard/prompt-defense
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
| Part 2: Break | agent | Scale to 18 providers (~895 tools), context explosion, ambiguity |
| Part 3: Fix | agent + slides | Dynamic discovery, code mode, content sanitization |
| Security | stackone-agent-redteaming | Prompt injection via email, defense blocks it |

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
