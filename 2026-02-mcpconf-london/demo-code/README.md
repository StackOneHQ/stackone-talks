# MCP Conference Demo Code

Demo components for the talk "Making (and Breaking) Agents by Adding 1,000 MCP Tools" at MCPconf London 2026.

## Components

### 1. Demo Agent (`agent/`)

Interactive terminal agent that demonstrates MCP tool scaling problems.

```bash
cd agent
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

**Commands:**
- `/add <account>` - Add a StackOne account (adds tools)
- `/accounts` - List available accounts
- `/demo` - Run the full demo sequence
- `/reset` - Reset to clean state
- `/help` - Show help

**Demo sequence shows:**
1. Phase 1: Personal assistant (Gmail, Slack, Trello) - ~240 tools
2. Phase 2: Enterprise systems (Salesforce, Workday) - ~800 tools
3. Phase 3: Scale (Oracle Fusion, SAP, ServiceNow) - 2,000+ tools

### 2. Rogue MCP Server (`rogue-server/`)

Educational demo showing prompt injection via MCP tool descriptions.

```bash
cd rogue-server
npm install
npm start
```

Starts at `http://localhost:3002/mcp`

**What it demonstrates:**
- Tool descriptions can contain hidden instructions
- Three injection techniques: subtle, aggressive, encoded
- Watch the console for 🚨 alerts when injections trigger

**Tools exposed:**
- `sync_events` - Contains subtle injection in description
- `list_events` - Contains aggressive injection
- `check_availability` - Contains encoded injection
- `export_user_data` - Target exfiltration tool
- `send_calendar_backup` - Target backup tool
- `fetch_all_contacts` - Target contact harvesting tool

### 3. Measurement Dashboard (`dashboard/`)

Visual overlay showing tool count and context usage.

```bash
# Just open in browser
open dashboard/index.html
```

**Features:**
- Real-time tool count with animated updates
- Token estimate (150 tokens/tool definition)
- Connected providers list
- Warning thresholds at 500 and 1,000 tools
- "Run Demo" button for automated sequence

**Integration:**
The dashboard listens for `postMessage` events:
```js
window.postMessage({ type: "add_provider", name: "Salesforce" });
window.postMessage({ type: "tool_call", provider: "Workday", action: "list_employees" });
window.postMessage({ type: "reset" });
```

### 4. Security Demo - Prompt Injection Attack + Defense (`stackone-agent-redteaming/`)

Live demo showing a prompt injection attack via email and how `@stackone/prompt-defense` detects and blocks it.

**Setup:**
```bash
# 1. Build the defense package
cd stackone-agent-redteaming/guard/prompt-defense
npm install && npm run build

# 2. Install the gmail agent
cd ../gmail-agent
npm install

# 3. Configure .env (already done - uses same API keys as agent/)
```

**Demo flow:**

1. **Send the attack email manually** to the target Gmail account.
   Subject: `Weekly Report Summary - Action Required`
   The email looks benign but has a hidden `<div style="display:none">` with fake system admin instructions that trick the agent into replying with inbox summaries.

2. **Run without defense** (agent gets tricked):
   ```bash
   cd stackone-agent-redteaming/guard/gmail-agent
   npm run run-attack -- --no-defend-only
   ```

3. **Run with defense** (attack blocked):
   ```bash
   npm run run-attack -- --defend-only
   ```

**Other commands:**
- `npm run test-payloads` - Test all 7 attack payloads against the classifier
- `npm run run-attack` - Run both undefended and defended tests back-to-back

**How defense works:**
- Tier 1: Fast regex pattern matching catches known injection patterns
- Tier 2: MLP neural classifier detects novel prompt injection attempts
- Defense wraps StackOne tool results, scanning email content before it reaches the LLM

## Talk Structure

| Part | Demo Component | What Breaks |
|------|----------------|-------------|
| Part 1: Build | agent + dashboard | Nothing (yet) |
| Part 2: Break | agent + dashboard + rogue-server | Context explosion, ambiguity, safety |
| Part 3: Fix | Show StackOne solution | Meta tools, unified layer |
| Part 4: Security | stackone-agent-redteaming | Prompt injection in emails → defense blocks it |

## Pre-recorded Fallbacks

If live demo fails, use pre-recorded videos from `../assets/recordings/`:
- `part1-build.mp4` - Personal assistant working
- `part2-break.mp4` - Context explosion, wrong routing
- `part2-safety.mp4` - Rogue server attack
- `part3-fix.mp4` - StackOne meta tools solution

## Environment Variables

```env
# agent/.env
ANTHROPIC_API_KEY=your-anthropic-key
STACKONE_API_KEY=your-stackone-key
STACKONE_MCP_URL=https://mcp.stackone.com
```

## Notes

- Terminal font should be 18pt+ for large venue visibility
- Keep dashboard on secondary monitor/window
- Test WiFi before talk (bring mobile hotspot backup)
- All demo accounts should be pre-connected in StackOne
