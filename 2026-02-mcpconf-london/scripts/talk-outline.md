# Making (and Breaking) Agents by Adding 1,000 MCP Tools

**MCPconference @ ContainerDays London — Feb 11-12, 2026**
**Duration:** 35 minutes
**Speaker:** Guillaume Lebedel, CTO @ StackOne

---

## Opening (2 min)

- Quick intro: "I'm Guillaume, CTO at StackOne. We build infrastructure that connects AI agents to enterprise software — 300+ APIs, all accessible via MCP."
- Set the frame: "I'm not here to pitch you a product. I'm here to talk about what actually happens when you try to build a real agent — one that has access to as many tools as a person in your company would."
- Hook: "So I'm going to build an agent on stage, give it 1,000 MCP tools, and we'll see what breaks."

---

## Part 1: The Build (8 min)

> Goal: Build a useful agent live, using real tools the audience recognizes. StackOne appears naturally in every tool call but is never the subject. Each connected account exposes that provider's full set of tools (Salesforce = 370 tools, Workday = 186, Oracle Fusion = 1,506). A handful of accounts gets you to 1,000+ tools fast.

### Start small — a personal assistant agent
- Live code: spin up an agent using Claude Agent SDK / Vercel AI SDK
- Connect a few StackOne accounts (each account = one provider, dozens to hundreds of tools)
  - Google (Calendar, Gmail, Drive) — ~30-50 tools. "My actual workflow."
  - Slack — ~50 tools
  - Fireflies — meeting notes
- Already at ~100+ tools across 3 providers
- Demo it working: "Summarize my last meeting and post the action items to Slack"
- It works great. Fast. Clean. The audience nods — they've seen this before.

### Add enterprise systems
- "But I don't just use Slack and Google. Let me add some real systems."
- Add Salesforce — 370 tools. "CRM, where all our customer data lives"
- Add Workday — 186 tools. "HR, where employee records live"
- Now at 600+ tools from just 5 providers. Still works.
- Demo: "Find me the latest deal in Salesforce and check if the account owner is on PTO in Workday"
- Audience thinks: "Okay, that's actually useful."
- Subtle point lands: each of these is a StackOne connected account. One line of config per provider. The tools come for free.

### Keep going — the tool count climbs
- "A real enterprise has more than 5 systems."
- Add more accounts: Ashby (ATS), ServiceNow (ticketing), Oracle Fusion (1,506 tools), SAP SuccessFactors, BambooHR, Greenhouse
- Tool count on screen: 600... 800... 1,000... past 1,000 with just 8-10 providers
- Audience watches it climb. "Each account I add is one line of config. But each provider exposes hundreds of actions."
- "This is what a real enterprise agent looks like. Not 3 tools. Not 20. Over a thousand. And this is what StackOne gives you out of the box — 200+ connectors, 11,000+ actions."

---

## Part 2: The Break (10 min)

> Goal: Show three real problems that emerge at scale. These are problems the audience has hit or will hit. This is the meat of the talk.

### Problem 1: Context explosion
- Tool count hits 500+. Show token count / context usage visually.
- "My agent now has to read the description of every single tool before it can do anything."
- Demo: ask the agent something simple. Watch the latency spike.
- "The agent is spending more time reading tool descriptions than doing work."
- If you've tried to add more than a handful of MCP servers to Claude Code or Cursor, you've felt this. Your agent gets slower. It makes worse decisions. It starts hallucinating tool names.
- The audience of people who have built agents is nodding. The rest are learning why this matters.

### Problem 2: Ambiguity and wrong routing
- "I have Salesforce and HubSpot. Both have a 'list_contacts' tool. I have 3 Workday accounts — US, EU, staging."
- Ask the agent: "List my contacts." Which tool does it pick? Which account?
- Demo: it picks wrong. Or it picks randomly. Or it calls all of them.
- "This is the routing problem. When you have 5 tools, the model picks the right one. When you have 500, it guesses."
- Enterprise angle: "In your company, calling the wrong Workday instance isn't a demo bug. It's a compliance incident."

### Problem 3: Safety — the one they're all thinking about
- "One more problem. And this one keeps your security team up at night."
- Add a third-party MCP server — looks legitimate (e.g., "calendar-sync" or "analytics-dashboard")
- This server has a malicious tool description: hidden instructions that tell the agent to exfiltrate data
- Demo: agent reads the tool list, picks up the injection, follows the hidden instructions
- Pause. Let it land.
- "Every MCP server you connect is a trust boundary. Every tool description is a prompt injection surface. When you add 20 different MCP servers from 20 different vendors, you have 20 different trust models."
- For the enterprise audience: "This is why your security team says no."

---

## Part 3: The Fix (10 min)

> Goal: Show solutions to each problem. Concepts first, StackOne as the implementation. The audience learns patterns they can apply — and sees that StackOne already has them built.

### Fix 1: Tool discovery / search (fixes upfront context cost + ambiguity)
- "When you have 1,000 tools, you don't load all of them into context. You search."
- Introduce the concept: **meta tools**. Instead of listing every tool definition, the agent gets 2-3 meta tools: `search_tools`, `execute_tool`
- Demo: agent has ~1,000 tools available but only 2-3 tool definitions in context
- "Find me tools for managing employee time off" → returns 3 relevant tools out of 1,000+
- Agent calls the right Workday endpoint, right account, right action
- "The agent went from 1,000 tool definitions in its context window to 3. That's the fix for upfront context explosion."
- Also fixes ambiguity: search is intent-based, so it returns the right provider and account — no more guessing between 5 versions of "list_contacts"
- "We built this as meta tools in our AI SDK. The concept applies to any agent framework — don't load tools, discover them."
- "But discovery only fixes the upfront cost. Every tool call still dumps raw API responses into the conversation history — that's the per-turn cost that compounds."

### Fix 2: Code mode / sandboxed execution (fixes per-turn response bloat)
- "Discovery fixed the upfront cost. But each tool call returns 10-50k tokens of raw JSON into the message history. After a few turns, that dwarfs the tool definitions."
- Introduce the concept: instead of calling pre-defined tools, the agent writes and executes code in a sandbox
- Raw API data stays in the sandbox. Only a filtered summary reaches the LLM.
- Demo: agent handles a request that doesn't map to any pre-defined tool — it writes the code on the fly
- "This is the difference between a menu and a kitchen. Pre-defined tools are the menu. Code mode is having a chef."
- Bridges the gap for long-tail actions that aren't covered by standard tool definitions

### Fix 3: Safety — defending against indirect prompt injection
- "Remember that attack email?"
- Same scenario, but now with `@stackone/prompt-defense` wrapping the Gmail tool results
- Tier 1 regex patterns catch known injection signals, Tier 2 MLP classifier scores content at the sentence level
- Demo (brief, 2-3 min): agent reads the same malicious email, but defense blocks the tool result before it reaches the LLM. The agent never sees the hidden instructions.
- "Every piece of untrusted content your agent reads — emails, documents, tickets — is a prompt injection surface. If you're not scanning tool results, you're trusting every email sender."
- Enterprise kicker: "This is the answer you give your security team when they ask why you're connecting AI agents to production systems."

### Fix 4 (stretch): RLM — Recursive Language Model patterns
- Brief intro only — not a deep dive, just plant the seed
- "When context windows aren't enough, there's a pattern where agents manage their own context recursively."
- Quick demo or diagram showing the concept
- "I won't go deep on this today — it's a talk on its own. But if you're hitting context limits even with tool discovery, this is where the field is heading."
- Points to blog post for those who want to dig in

---

## Closing (5 min)

### Recap
- Context explosion + ambiguity → tool discovery / meta tools
- Long-tail actions → code mode / execute
- Safety → prompt injection defense on tool descriptions
- (Stretch) Context limits → RLM patterns
- "MCP is the protocol. It's great. But protocols don't solve what happens when you actually use them at scale."

### The StackOne pitch (honest, brief)
- "Everything you saw today — every tool call, every provider, the search, the safety layer — that's StackOne. 200+ connectors, 11,000+ actions, all accessible via MCP."
- "If you want to build agents that can actually do things — for yourself, for your company, or as a software vendor shipping agents to your customers — that's what we do. Come talk to us."

### QR code slide
- "Scan this for free access. We validate requests manually so you won't get an email in 10 seconds, but you'll be set up shortly."
- "What you don't get by default is our AI builder toolkit — if you want to build your own connectors for any system, come find me or the team at the booth."

### Close
- "And if StackOne isn't the right fit — I still want to hear about the problems you're facing. I genuinely enjoy talking about this stuff. Come find me for a coffee."
- "Some of the concepts I covered today — context optimization, tool discovery, RLM — I write about on my blog."
- Final slide links:
  - Blog: https://www.multiarmedyield.com/
  - StackOne docs: docs.stackone.com
  - QR code for free access
- "Thanks. Questions?"

---

## Backup & Logistics

### Pre-recorded fallback
- Record each part (Build, Break, Fix) as separate screen captures
- If live demo fails at any point, switch to video seamlessly
- Also usable at the booth and for the blog post version

### What's on screen during the talk
- Left: terminal / code editor (the agent, the code)
- Right (or overlay): tool count, token usage, active provider (optional dashboard)
- Font: 18pt+ in terminal. Large venue.

### Reusability
- Parts 2 + 3 (Break + Fix) work as a standalone 15-min talk
- Part 2 alone works as a 10-min lightning talk
- Full version (35 min) for this conference

### Systems to demo
- Safe: Google, Slack, Fireflies, Salesforce, Workday
- Avoid: HubSpot (connector issues)
- Rogue server: purpose-built for the safety demo

### Things to coordinate with team
- [ ] Safety layer demo feasibility — check with engineering
- [ ] Rogue MCP server — build or pre-record
- [ ] Falcon demo video for booth (separate from talk)
- [ ] QR code landing page
- [ ] Check if talk is recorded by organizers → blog post + video
