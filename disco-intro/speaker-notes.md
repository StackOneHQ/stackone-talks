# Disco: Speaker Notes & Demo Commands

**Speaker:** Will Leeney
**Topic:** Tool Search & Response Optimisation for MCP

---

## Slide 1 — Title
Just the title card. Let it breathe.

## Slide 2 — Hi, I'm Will
- "I'm Will, I've got a PhD from Bristol, I work at StackOne as an ML engineer."
- Keep it quick, 30 seconds max.

## Slide 3 — StackOne
- "StackOne does integrations. 200+ connectors, unified API, all accessible via MCP. We make it so you can connect to anything without building it yourself."
- Don't oversell — just context for why we have 1,000+ tools.

## Slide 4 — What is a tool
- "When you connect something to an AI agent, it gets tools — functions it can call. Each one has a name, description, and a JSON schema."
- Brief. This is just setup for the problem.

## Slide 5 — THE PROBLEM (section divider)
- Pause. Let "context suicide" land.

## Slide 6 — Tool Blow
- "Every tool you load goes into the context window. The schema, the description, all of it. Before you've even asked a question."
- Gesture at the numbers. Let them sink in.

## Slide 7 — Load 1,000 tools
- "Here's what happens when you actually load a thousand tools. 74% of your context is gone before you've said hello."

## Slide 8 — DEMO: Blow the context

```bash
# Run the demo agent with all tools loaded
# [PLACEHOLDER: actual command to start demo agent]
# [PLACEHOLDER: command to load all tools]
# [PLACEHOLDER: try asking something — show it failing/struggling]
```

- Show it's bad. Don't linger. The point is obvious.

## Slide 9 — Performance problem
- "I don't want to manage which tools to load. I want everything available. I want it fast. Right now, that's not possible."
- This is the framing for why we need search.

## Slide 10 — BUILDING TOOL SEARCH (section divider)
- Transition energy shift — we're building now.

## Slide 11 — We need search
- "Instead of loading all schemas upfront, search for the right tool at query time."
- Walk through the flow diagram.

## Slide 12 — Search methods
- "BM25 — keyword matching. Fast, simple. Semantic — embedding similarity, understands intent. LLM — ask a model to pick. Smart but slow."
- "We're vibing. But vibing isn't always enough."

## Slide 13 — We need to measure
- "We need actual numbers. A benchmark."

## Slide 14 — Competitors
- [PLACEHOLDER: name the competitor approaches you pulled in]

## Slide 15 — Mock connectors
- "We've mocked every connector we have. Fake data, no live connections, fully testable. This is the foundation of the benchmark."

## Slide 16 — The dataset
- Walk through the examples. Emphasise the hard ones — workflow tasks that need multiple tools.

## Slide 17 — Baseline results
- [PLACEHOLDER: fill in actual numbers]
- "BM25 is fast but not great. Off-the-shelf embeddings are okay. LLM search is good but too slow."

## Slide 18 — Fine-tuning
- "So we fine-tune. Training data from our dataset. Runs on Modal."
- [PLACEHOLDER: mention bias considerations — serving other vendors' tools too]

## Slide 19 — Fine-tuned results
- [PLACEHOLDER: fill in actual numbers]
- "Fast and good. This is what we ship."

## Slide 20 — DEMO: Tool search working

```bash
# [PLACEHOLDER: start agent with search mode enabled]
# [PLACEHOLDER: kill all pre-loaded tools]
# [PLACEHOLDER: ask a query that triggers search]
# [PLACEHOLDER: show it finding the right tool]
```

- Show it working. Let the audience see the search → schema load → execution flow.

## Slide 21 — Cool, it works — but wait
- Build energy. "Sick, it works. Right tool, fast, minimal context."
- Pause.
- "...until the response comes back."

## Slide 22 — RESPONSE BLOW (section divider)
- Let "the tool worked, the response killed the context" land.

## Slide 23 — Tool responses are massive
- "A Jira query returns 47k tokens. Chain two calls and you're done."
- Maybe mention: "It's like asking someone for directions and they read you the entire A-Z."

## Slide 24 — Code mode
- "Don't dump raw responses into context. Let the agent write code to extract what it needs."
- Walk through the flow: query → write code → execute in sandbox → return summary.
- "The raw data stays in the sandbox. Only what matters comes back."

## Slide 25 — Truncation iterations
- "First version: no truncation. Raw responses. Context dies."
- "Static truncation: cap at 5k chars. Sometimes too little, sometimes too much. I was treating this as a hyperparameter."
- "Then I thought: why am I tuning this? Let Claude decide."
- Dynamic truncation — the model decides how much to return per call.

## Slide 26 — Benchmarking code mode

```bash
# [PLACEHOLDER: navigate to eval directory]
# cd ~/Documents/stackone/code/eval
# [PLACEHOLDER: run benchmark comparison]
```

- [PLACEHOLDER: mention MCP Atlas and MCP Universe as benchmarks]
- Walk through what you're comparing.

## Slide 27 — Results
- [PLACEHOLDER: fill in actual numbers — token savings, accuracy]
- "It works. Context stays manageable. Agent stays useful."

## Slide 28 — SHIPPING IT (section divider)

## Slide 29 — Infrastructure
- "Cloudflare dynamic workers. Credentials injected via UI, not via the LLM. No downloads — connect to an MCP endpoint."

## Slide 30 — DEMO: Disco live

```bash
# [PLACEHOLDER: connect to Disco MCP endpoint]
# [PLACEHOLDER: show the full flow — search, execute, dynamic truncation]
# [PLACEHOLDER: show it in Claude Code / Cursor / whatever client]
```

- This is the big demo. Take your time. Show it actually working end to end.

## Slide 31 — Access
- "Disco is in alpha. Self-serve setup, then you're good to go."
- [PLACEHOLDER: share URL or instructions]

## Slide 32 — Thanks
- "That's it. Thanks. QR codes if you want to connect."
- Stay for questions.

---

## Pre-talk checklist

- [ ] Demo agent running and tested
- [ ] Mock connectors running
- [ ] Disco MCP endpoint accessible
- [ ] Screen resolution set for projector
- [ ] Font size large enough for back of room
- [ ] Backup: screen recordings of each demo in case of failure
