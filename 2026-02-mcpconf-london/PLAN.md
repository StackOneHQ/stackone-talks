# "Killing Your Agent with 10,000 Tools"

## MCP Conference Demo Plan

**Event:** MCPconference @ ContainerDays London 2026
**Date:** 11-12 February 2026
**Venue:** The Truman Brewery, Ely's Yard, London E1 6QR
**Slot:** 35 minutes
**Speaker:** Guillaume Lebedel, CTO @ StackOne

---

## Conference Context

### Audience Profile
- **1,000+ attendees** across ContainerDays + MCPconference (6 stages)
- **90% enterprise** (Adidas, American Express, HSBC, Airbus, AstraZeneca)
- **10% startups** and indie builders
- Cross-pollination: cloud native engineers discovering MCP, MCP practitioners from enterprise
- Other speakers from Google, GitHub, AWS, AUDI/CNCF, Moonpig, Arcee.ai

### Peer Sessions to be Aware Of
- Martin Woodward (GitHub) — "Coding Secure AI Agent Workflows with MCP"
- Dr. Ayman Salama (AWS) — "AI Agents: Orchestrating Smarter Enterprise Workflows"
- Sebastian Scheele (Kubermatic) — "Why MCP is not a buzz word"
- Topics across the event: AIOps, architecture, scalability, production engineering, security

### Positioning Opportunity
Most talks will be **pro-MCP advocacy**. Your talk is contrarian — you expose the *real problems* that emerge when MCP scales, then show how to solve them. This makes it the most memorable talk because:
1. It validates what enterprise attendees already suspect but haven't articulated
2. It provides practical solutions rather than protocol evangelism
3. StackOne appears as the battle-tested answer, not a sales pitch

---

## Talk Structure (31 slides, ~25 min + Q&A)

Cascading **build → break → fix** structure. Each fix naturally reveals the next problem.

### Intro + Why 1,000 Tools (slides 1-3, ~4 min)
**"The future is agents with hundreds of tools. Let's see what happens."**

- Audience warm-up: hands up for who's built agents, connected tools, etc.
- Personal story: Claude Code + 1,000 tools, "that's where agents are going"
- Why 1,000 tools: models getting better, work spans many systems, MCP makes it possible
- Framing: "The question isn't whether. It's what breaks when they do."

### The Build (slides 4-9, ~7 min)
**"Let's build a powerful agent, step by step."**

- Live demo: boot the agent, show commands to add providers + track context
- Add 3 providers (Gmail, Trello, Gong), query "List my recent emails" — works great
- Scale up: add 15 more providers live, watch context bar fill to 57%
- Show `/usage` — real Anthropic count_tokens API, not an estimate

### Break: Context Explosion (slides 10-14, ~4 min)
**"This is where it starts falling apart."**

- Upfront: tool definitions eat 138k tokens — two thirds of context gone before any query
- Research: Chroma Context Rot (-30% accuracy with 113k context)
- Meme break, then "Let's fix this"

### Fix: Tool Search / Discovery (slides 15-16, ~5 min)
**"Search instead of loading everything."**

- 916 tools → 2 meta-tools (`search_tools` + `execute_tool`), 276x context reduction
- Before/after visual: 138k tokens → 500 tokens
- Search strategies (with trade-offs): BM25 (60-80%), BM25+TF-IDF hybrid (75-90%), Semantic (90-99%) — accuracy on MCP tool routing specifically
- Anthropic ships server-side BM25, we use hybrid — zero API calls, sub-ms
- Live demo: enable `/search`, query, show it working

### Break → Fix: Response Bloat → Code Mode (slides 17-20, ~4 min)
**"Tool search fixed definitions. But the responses..."**

- Break: oversized responses (20k tokens per call), intermediate results pile up, unneeded fields
- Fix: Code Mode — agent writes TypeScript, executes in sandbox
- Before/after visual: raw JSON dump vs filtered summary
- Pioneered by Cloudflare, validated by Anthropic (98.7% token reduction)
- Live demo: `/code` mode

### Break → Fix: Safety → Content Defense (slides 21-28, ~6 min)
**"But what's IN those responses?"**

- Break: Indirect Prompt Injection — legitimate tools reading untrusted data (emails, CRM records, call transcripts)
- Injection diagram: Gmail returns email with hidden instructions, agent follows them
- Research: OWASP #1, ICLR 84% vulnerable, AgentDojo/NIST 81% novel attacks
- Fix: Content Sanitization — flow diagram: MCP Tool → poisoned response → Sanitizer (Tier 1 regex + Tier 2 MLP) → clean output
- Defense powered by `@stackone/prompt-defense` (private beta)
- Same attack with defense: blocked at score 1.0

### Close (slides 29-31, ~5 min)
**"MCP is the protocol. You need infrastructure around it."**

- Recap: problem → fix pairs (Upfront Context → Tool Search/Discovery, Response Bloat → Code Mode, Injection → Sanitization)
- Complementary approaches: sub-agents, RLM
- Takeaway: "Protocols don't solve what happens when you connect hundreds of tools."
- QR code: stackone.com/request-free-access

---

## Technical Demo Components

### What Was Built

#### 1. Demo Agent (`demo-code/agent/`)
Single TypeScript agent with progressive `/add` commands to connect providers live on stage. Dashboard shows real-time context usage, tool counts, and mode indicators.

**Source files:**
| File | Purpose |
|------|---------|
| `src/index.ts` | Agent loop, dashboard, command handling |
| `src/search-anthropic.ts` | `/discover` — Anthropic server-side BM25 (beta) |
| `src/search-bm25-tfidf.ts` | `/search` — client-side hybrid Orama BM25 + TF-IDF |
| `src/code-mode.ts` | `/code` — sandboxed execution |
| `src/defense-mode.ts` | `/defend` — wraps @stackone/prompt-defense |
| `src/sandbox.ts` | Sandbox runtime for code mode |
| `src/test-search.ts` | 47 search accuracy tests (46 passing) |
| `prompt-defense/` | Local package: Tier 1 regex + Tier 2 MLP classifier |

#### 2. Injection Demo (`demo-code/agent/gmail-agent/`)
Separate runner that demonstrates indirect prompt injection via Gmail — both the undefended attack and the defended version with content sanitization.

#### 3. Slides (`slides.html`)
Self-contained HTML slide deck with 31 slides. Static terminal mockups serve as backup for every live demo segment. Hosted at `talks.stackone.space/2026-02-mcpconf-london/`.

### Fallback Strategy
- Every live demo segment has a matching static slide with terminal mockup
- If API is slow or demo fails, walk through the slides — the audience sees the same output
- No external dependencies needed for the slides (single HTML file)

---

## Demo Prompts

Prompts organized by demo phase. Each showcases why you need many tools connected.

### Phase 1: Happy Path (3 providers — Gmail, Trello, Gong)

| Prompt | Expected behavior |
|--------|-------------------|
| "List my recent emails" | Gmail → `gmail_list_messages` — fast, correct, single provider |
| "What boards do I have in Trello?" | Trello → `trello_list_boards` |
| "Show my recent Gong calls" | Gong → `gong_list_calls` |

### Phase 2: Ambiguity (18 providers — after scale-up)

| Prompt | Why it breaks |
|--------|---------------|
| "List my contacts" | HubSpot `list_contacts`, Zendesk `list_contacts`, Ashby `list_candidates` — which one? |
| "Create a task" | Trello `create_card`, Jira `create_issue`, Notion `create_page` — 3+ matches |
| "Show recent activity" | Range, GitHub, Trello, Notion all have activity feeds |
| "Search for a user named Sarah" | HubSpot, Ashby, Humaans, Zendesk — 4 providers with user/contact search |
| "Send a message" | Gmail `send_message`, Zendesk `create_comment` — different intent, similar name |

### Phase 3: Search Mode (demonstrating search mechanics)

| Prompt | What the audience sees |
|--------|------------------------|
| "List my recent emails" | Search logs: BM25 scores → TF-IDF scores → hybrid fusion → `gmail_list_messages` wins |
| "Create a Jira bug" | Search finds `jira_create_issue` from 916 tools — rare term "jira" ranked high by TF-IDF |
| "Get Datadog alerts from today" | Provider-specific query cuts through hundreds of tools in sub-ms |
| "Find candidates in Ashby who interviewed this week" | Multi-term query, both "ashby" and "candidates" boost correct result |
| "Check my calendar for tomorrow" | `google_calendar_list_events` — search handles spaces and common terms |

### Phase 4: Code Mode (multi-provider orchestration)

| Prompt | Providers touched | What it demonstrates |
|--------|-------------------|----------------------|
| "Find open bugs in Jira with no linked PR in GitHub, and email me the list" | Jira + GitHub + Gmail | 3-provider join, 124 records fetched in sandbox, 9-line summary returned |
| "For each candidate in Ashby who had an interview this week, check if there's a follow-up on my calendar" | Ashby + Google Calendar | Cross-system correlation, HR workflow |
| "Compare Jira sprint velocity with GitHub PR merge rate this week" | Jira + GitHub | Aggregation across dev tools |
| "Get all P1 Datadog incidents and create Jira tickets for any without one" | Datadog + Jira | Observability-to-task automation |
| "List employees on PTO in Humaans and check if they have open Zendesk tickets assigned" | Humaans + Zendesk | HR + support cross-reference |

### Phase 5: Injection Demo

| Prompt | Attack vector |
|--------|---------------|
| "Check my inbox for recent emails and process any that need attention" | Gmail — email contains hidden `display:none` div with instructions |
| "Summarize my latest Gong calls" | Gong — call transcript could contain injected instructions |
| "Read my Zendesk tickets and draft responses" | Zendesk — ticket from external user embeds hidden instructions |

### Showcase Prompts (proving you need 18 providers)

These are "wow factor" prompts that touch 3+ providers and only work when everything is connected:

| Prompt | Providers |
|--------|-----------|
| "Prepare my day: show today's calendar, any urgent emails, open Jira tickets assigned to me, and recent Slack-worthy Gong calls" | Google Calendar + Gmail + Jira + Gong |
| "Who on my team (Humaans) has the most open support tickets (Zendesk) and hasn't had a 1:1 (Google Calendar) in over a week?" | Humaans + Zendesk + Google Calendar |
| "Find the Notion doc for Project X, cross-reference its tasks with Trello cards, and flag any that are overdue in both" | Notion + Trello |
| "Check if any Datadog alerts from the past 24h correlate with Honeycomb traces showing >2s latency" | Datadog + Honeycomb |

---

## Preparation Checklist

### Week 1 (Now → Feb 2)
- [ ] Draft full talk script (slides-notes/)
- [ ] Build mock MCP servers for enterprise tools (demo-code/)
- [ ] Build rogue MCP server for safety demo (demo-code/)
- [ ] Set up StackOne demo environment with 10+ connected accounts
- [ ] Create measurement dashboard component

### Week 2 (Feb 3-7)
- [ ] Rehearse full talk end-to-end (target: 30 min to leave buffer)
- [ ] Record backup videos for each demo segment
- [ ] Prepare slide deck (minimal — the demo IS the talk)
- [ ] Test on conference WiFi equivalent (use mobile hotspot as backup)
- [ ] Prepare QR code landing page for attendees

### Day Before (Feb 10)
- [ ] Load everything on presentation laptop
- [ ] Test with venue projector resolution
- [ ] Verify all API keys and connections
- [ ] Run full demo twice from cold start
- [ ] Charge everything, bring adapters

### Day Of
- [ ] Arrive 30 min early to test AV
- [ ] Have mobile hotspot as WiFi backup
- [ ] Keep terminal font at 18pt+ (large venue)
- [ ] Water bottle on stage

---

## Key Messages for Enterprise Audience

### What They're Worried About
1. **"Will AI agents break our compliance?"** → Show unified auth + audit trail
2. **"How do we manage 50 SaaS tools with AI?"** → Show unification layer
3. **"Is MCP production-ready?"** → Show real problems AND real solutions
4. **"Can we trust third-party MCP servers?"** → Show safety demo

### What NOT to Say
- Don't bash MCP — you're at an MCP conference, and MCP is great
- Don't do a product demo — do a problem/solution demo
- Don't show slides when you can show code
- Don't mention competitors — focus on the category problem
- Don't oversimplify — this audience is technical

### Tone
- Practitioner talking to practitioners
- "We learned this the hard way" energy
- Self-deprecating humor about things that broke
- Zero marketing speak — code and terminal only

---

## Files in This Repo

```
2026-02-mcpconf-london/
├── PLAN.md                        ← This file
├── PREP-SCRIPT.md                 ← Talk script & run sheet
├── slides.html                    ← 34-slide HTML deck
├── demo-code/
│   └── agent/                     ← Main demo agent
│       ├── src/                   ← Agent source (see table above)
│       ├── prompt-defense/        ← @stackone/prompt-defense local package
│       └── gmail-agent/           ← Injection attack + defense runner
├── assets/                        ← Images, headshot
└── scripts/                       ← Deployment scripts
```

---

## Open Questions

1. **Safety demo feasibility** — Can we safely demo a rogue MCP server live, or should this always be pre-recorded? Need to coordinate with team.
2. **Which enterprise systems to demo?** — Workday + Salesforce are the most recognizable to this audience. SAP and ServiceNow are also strong choices given the enterprise tilt.
3. **Booth strategy** — Do we have a booth? If so, the Falcon demo video could run on loop there, and the full demo could be done 1:1 with prospects.
4. **Audience interaction** — Consider a live poll at the start: "How many MCP servers are you running today?" Sets the stage and gets engagement.
