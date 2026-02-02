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

## Talk Structure (35 minutes)

### Act 1: The Promise (5 min)
**"MCP is great. Let's prove it."**

- Open with a live demo: coding agent (Claude Code or Cursor) connected to 3-4 MCP servers
- Show it working well: Slack, GitHub, a database — clean, fast, useful
- Establish credibility: "We've been building MCP infrastructure at StackOne. We connect agents to 300+ enterprise APIs."
- Set the hook: "But what happens when you actually try to use this in production?"

### Act 2: The Breakdown (12 min)
**"Now let's add the rest of the enterprise."**

This is the core demo. Progressively add MCP servers and show what breaks:

#### Phase 1: 10 MCP servers → Things slow down
- Add Salesforce, Workday, SAP, ServiceNow, BambooHR, etc.
- Show context window filling up with tool definitions
- Agent starts getting confused about which tool to use
- Latency increases visibly

#### Phase 2: 20+ servers with multiple accounts → Chaos
- Same tool (e.g., "list_employees") exists across 5 different providers
- Multiple account IDs for the same provider (prod, staging, different regions)
- Agent picks the wrong account, calls the wrong API
- Show the actual token count / context usage — the audience sees the problem numerically

#### Phase 3: The safety nightmare (enterprise kicker)
- Add a "rogue" third-party MCP server (pre-built for the demo)
- Show it injecting malicious instructions via tool descriptions
- Agent follows the injection — exfiltrates data or takes unauthorized action
- Pause. Let the audience absorb this. "This is what your security team is worried about."

### Act 3: The Solution (12 min)
**"Here's how we actually solve this."**

Rebuild the demo using StackOne's approach:

#### Solution 1: Unified Tool Layer
- Replace 20 MCP servers with 1 StackOne MCP endpoint
- Same capabilities, fraction of the context
- Show the before/after token count — dramatic reduction
- Demo: agent correctly routes "list employees" to the right provider + account

#### Solution 2: Dynamic Tool Discovery (Meta Tools)
- Show `meta_search_tools` — agent searches for tools by intent instead of loading all
- "Find me tools for managing employee time off" → returns 3 relevant tools out of 1,000+
- Agent operates with surgical precision instead of context overload

#### Solution 3: Enterprise Safety
- Show StackOne's tool descriptions are clean — no injection surface
- Unified auth layer — agent never sees raw credentials
- Audit trail — every tool call logged with account, provider, action
- Contrast: "20 third-party MCP servers with 20 different trust models vs. 1 verified layer"

### Act 4: Close (6 min)
**"The future isn't more tools. It's smarter tool access."**

- Recap the 3 problems: context explosion, ambiguity, safety
- Recap the 3 solutions: unification, discovery, trust
- Key message: "MCP is the protocol. But protocols don't solve operational problems — infrastructure does."
- QR code: free StackOne access for conference attendees
- "Come to our booth for a deeper dive" (if applicable)

---

## Technical Demo Components

### What Needs to Be Built

#### 1. "Naive" Multi-MCP Setup (Act 2)
```
Purpose: Show the problem
Components:
  - 15-20 MCP server configs (can be mix of real and mock)
  - Real servers: Slack, GitHub, Notion (already have these)
  - Mock servers: Workday, SAP, ServiceNow (return dummy data)
  - "Rogue" server: injects prompt via tool description
  - Script to progressively enable servers during live demo
```

#### 2. StackOne Unified Setup (Act 3)
```
Purpose: Show the solution
Components:
  - Single StackOne MCP endpoint
  - Connected accounts: mix of HR, CRM, ATS providers
  - Meta tools enabled (search + execute)
  - Pre-configured with multiple accounts per provider
```

#### 3. Measurement Dashboard (Visual Aid)
```
Purpose: Make the problem visible to the audience
Shows:
  - Token count / context usage (real-time or simulated)
  - Number of active tools
  - API call routing (which provider/account was selected)
  - Safety score (clean vs. potentially injected descriptions)
```

#### 4. Safety Demo Server (Act 2, Phase 3)
```
Purpose: Show MCP tool description injection
Implementation:
  - MCP server that looks legitimate (e.g., "calendar-sync")
  - Tool descriptions contain hidden instructions
  - When agent reads the tool list, injection activates
  - Pre-recorded backup in case live demo is risky
```

### Fallback Strategy
- **Pre-record every segment** as high-quality screen capture
- Keep recordings in `assets/` folder, labeled by act
- If live demo fails at any point, seamlessly cut to recording
- Presentation software (Keynote/Slides) should have video embeds ready
- "Demo gods" contingency: have a rehearsed narrative for showing screenshots

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
mcp-conference-demo/
├── DEMO-PLAN.md              ← This file
├── transcripts/              ← Meeting notes, planning calls
├── scripts/                  ← Talk script, speaker notes
├── demo-code/                ← All demo source code
│   ├── naive-multi-mcp/      ← Act 2: the broken setup
│   ├── stackone-unified/     ← Act 3: the solution
│   ├── rogue-server/         ← Safety demo MCP server
│   └── dashboard/            ← Measurement visualization
├── assets/                   ← Recordings, images, QR codes
└── slides-notes/             ← Slide deck and speaker notes
```

---

## Open Questions

1. **Safety demo feasibility** — Can we safely demo a rogue MCP server live, or should this always be pre-recorded? Need to coordinate with team.
2. **Which enterprise systems to demo?** — Workday + Salesforce are the most recognizable to this audience. SAP and ServiceNow are also strong choices given the enterprise tilt.
3. **Booth strategy** — Do we have a booth? If so, the Falcon demo video could run on loop there, and the full demo could be done 1:1 with prospects.
4. **Audience interaction** — Consider a live poll at the start: "How many MCP servers are you running today?" Sets the stage and gets engagement.
