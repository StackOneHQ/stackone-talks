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

## Talk Structure (34 slides, ~25 min + Q&A)

### Part 1: The Build (slides 1-8, ~10 min)
**"MCP is great. Let's prove it."**

- Audience warm-up: hands up for who's built agents, connected tools, etc.
- Personal story: Claude Code + 1,000 tools, "that's where agents are going"
- Live demo: boot the agent, add 3 providers (Gmail, Trello, Gong), query "List my recent emails"
- Scale up: add 15 more providers live, watch context bar fill to 57%
- Show `/usage` — real Anthropic count_tokens API, not an estimate

### Part 2: The Break (slides 9-14, ~4 min)
**"This is where it starts falling apart."**

- Problem 1: Context Explosion — tool definitions eat 134k tokens (two thirds of context), then per-turn raw API responses compound it
- Problem 2: Tool Ambiguity — "list my contacts" matches 3+ providers, agent guesses, positional bias compounds
- Cite research: Chroma Context Rot (-30% accuracy), ODSC tool selection bias (+9.5%)

### Let's Fix This (slides 15-22, ~8 min)
**"Two problems. Let's fix them."**

- Fix 1: Dynamic Tool Discovery — 891 tools → 2 meta-tools (`search_tools` + `execute_tool`), 268x context reduction
- Search Strategies: BM25 (83%), BM25+TF-IDF hybrid (98%), Semantic (~99%). We use hybrid, 200 lines, sub-ms.
- Optional live demo: `/search` mode
- Fix 2: Code Mode — agent writes TypeScript, executes in sandbox. Raw data stays in sandbox, only filtered summary reaches LLM. 98.7% token reduction per Anthropic's research.
- Optional live demo: `/code` mode

### Plot Twist: Safety (slides 23-31, ~6 min)
**"But there's a bigger problem..."**

- Problem 3: Indirect Prompt Injection — legitimate tools reading untrusted data (emails, CRM records, web search, call transcripts)
- Injection diagram: Gmail returns email with hidden instructions, agent follows them
- Live demo or static walkthrough of the attack
- Cite research: OWASP #1, ICLR 84% vulnerable, AgentDojo/NIST 81% novel attacks
- Fix 3: Content Sanitization — Tier 1 regex + Tier 2 MLP classifier, sentence-level scoring, blocks before agent sees it
- Same attack with defense: blocked at score 1.0

### Close (slides 32-34, ~5 min)
**"MCP is the protocol. You need infrastructure around it."**

- Recap: problem → fix pairs (Context → Discovery, Ambiguity → Code Mode, Injection → Sanitization)
- Complementary approaches: sub-agents, formal verification, MCP gateways, RLM
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
Self-contained HTML slide deck with 34 slides. Static terminal mockups serve as backup for every live demo segment. Hosted at `talks.stackone.space/2026-02-mcpconf-london/`.

### Fallback Strategy
- Every live demo segment has a matching static slide with terminal mockup
- If API is slow or demo fails, walk through the slides — the audience sees the same output
- No external dependencies needed for the slides (single HTML file)

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
