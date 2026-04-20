# Supercharging Research with Agents: Speaker Notes & Demo Commands

**Speaker:** Will Leeney
**Topic:** Building a research system with AI agents, MCP, and Claude Code

---

## 1 - Title

- "I'm Will, PhD from Bristol, ML engineer at StackOne."
- "Today we're building a research system live. Everything you see me do, you can do right now."

## 2 - Assumptions of Knowledge

- "Zero. None. Can you use a computer? Great. You're overqualified."
- Get a laugh, set the tone — this is accessible.

## 3 - What You'll Need

- GitHub account (free), Python, an agent (Claude Code, Cursor, whatever)
- "That's the whole setup. Seriously."

## 4 - Working with Claude (Severance section header)

- Transition: "Right, let's talk about how to actually work with these things."
- Severance vibe — play it deadpan: "Your work here is mysterious and important."
- Don't explain the Severance reference. If they get it, they get it.

## 5 - Protocol 01: Version Management

- Don't linger. 20 seconds max.
- "git commit = save. git push = upload. That's it."
- "If you already know git, I apologize for the next 10 seconds."

## 6 - Protocol 02: The Handbook

- "This is just a file your agent reads. Your preferences, your rules."
- "Claude calls it CLAUDE.md, Cursor calls it .cursorrules — same concept."
- "The name is irrelevant. The knowledge within is not." (stay in character)

## 7 - Protocol 03: Skills & Routines

- Skills: "Write once, run whenever. /graphify, /research — we'll see these live."
- Routines: "This is the new thing. Scheduled tasks. Your agent runs them on autopilot."
- "Set it up once: every morning, check arXiv for new papers. You wake up to a research brief."
- This is the slide that gets people excited — pause here.

## 8 - Protocol 04: The Protocol

- "MCP. Model Context Protocol. USB for AI."
- "One standard that lets your agent talk to Jira, Fireflies, GitHub, Slack — anything."
- Drop the Severance voice now. Back to normal.

## 9 - Building a Second Brain

- "Here's what we're building today."
- "One system that pulls research from everywhere, connects it, and dumps it into an Obsidian vault."
- Point at the diagram. Sources → Agent → Vault.

## 10 - Resources Live Everywhere

- "This is the problem. Your research is scattered across 5 different tools."
- "All disconnected. All manual. All painful."
- Quick — don't dwell.

## 11 - DEMO: Graphify

- Press 'D' to enter demo mode (slides shrink left, terminal right)
- Run: `claude /graphify` on a research paper or document
- Show the knowledge graph HTML output
- "Any input — paper, docs, code — becomes a connected graph."

## 12 - DEMO: AutoResearcher

- Run: `uv run python scripts/auto_research.py "AI agent architectures"`
- Show it searching arXiv, summarizing papers, writing to vault/papers/
- "This is doing in 2 minutes what used to take me a full afternoon."
- Karpathy's AutoResearch Hub was the inspiration.

## 13 - DEMO: Browser Automation

- Run: `uv run python scripts/collect_tweets.py "MCP protocol"`
- Show Playwright opening a browser, collecting tweets
- "Your agent can browse the web, collect context, save it to your vault."

## 14 - The Obsidian Vault

- Show the vault structure in the terminal: `ls vault/papers/ vault/tweets/`
- Show a note with YAML frontmatter
- "Open this in Obsidian and you get the graph view for free."
- "Everything is connected by tags and links."

## 15 - Notifications & Continuity

- "Your routine runs at 7am. Checks arXiv. Summarizes papers. Saves to vault."
- "You get a push notification on your phone: 3 new papers on agent architectures."
- "Open Claude on your phone. Read the summaries. Reply to dig deeper."
- "Get to your desk. Open Claude Code. Full context preserved. Keep going."

## 16 - Grant Writing: Before & After

- Show the before: manual, painful, scattered
- Show the after: agent-assisted, cited, connected
- "Same person, same topic. One has a research agent. Guess which is better."
- Optional: show examples/grant-before.md vs examples/grant-after.md

## 17 - DEMO: Full End-to-End

- Run: `uv run python scripts/full_pipeline.py "AI agent architectures"`
- Show the full pipeline: collect → graph → vault → synthesize
- "This is everything working together."

## 18 - Take It Home

- "Everything I showed you today is in one repo."
- "git clone, uv sync, done. You have a research agent."
- Show the QR code.
- "The slides, the scripts, the vault template, the MCP configs — everything."

## 19 - Thanks

- QR codes for repo, LinkedIn, willleeney.com
- "Questions? Come find me after."

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Right / Space | Next slide (animated) |
| Left | Previous slide (animated) |
| Down | Jump forward (instant) |
| Up | Jump backward (instant) |
| D | Toggle demo mode (slides left, terminal right) |
