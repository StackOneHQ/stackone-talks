# Speaker Notes — Building Advanced Agents That Can Act with StackOne and ADK

## Slide 1: Title
- Set the stage: this is a demo-first talk
- "We're going to build an agent from scratch, and upgrade it 4 times"
- Emphasize "Act" — this is about agents that DO things, not just suggest

## Slide 2: About Me
- Quick intro, keep it under 30 seconds
- Mention StackOne briefly — "we make it easy for AI agents to connect to and act inside business systems"
- Google Labs PM background gives credibility on the AI side

## Slide 3: StackOne Overview
- Three pillars: Connect, Optimize, Secure
- Connect = 200+ integrations, one unified API
- Optimize = search, code mode, dynamic tool discovery
- Secure = Defender blocks prompt injections in real-time
- Point to the provider logos — "these are the systems your agents need to work with"

## Slide 4: V0 — No Tools
- "Here's our starting point. We have a Google ADK agent with zero tools."
- Point to the grayed-out tool boxes — "all these systems exist, but our agent can't reach them"
- "Your agent can reason beautifully about what to do, but it can't DO any of it"
- Transition: "So how do we connect it to the real world?"

## Slide 5: V1 — Curated Tools
- SWITCH TO DEMO: Show the V1 code running
- "StackOneToolSet fetches tools, we filter to ~15 read-only ones, wrap with StackOneAdkTool"
- Show the daily briefing working — Shopify orders, Salesforce deals, Snowflake risk scores
- "This is great for reporting. Fast, clean, no tool discovery overhead."
- But...

## Slide 6: V1 Limitation
- "662 tools available but we're only using 15"
- "What happens when the user asks to SEND an email? Or CREATE a Salesforce task?"
- "We have to know at build time exactly what tools they'll need. That doesn't scale."
- Three problems: no writes, static selection, context window pressure
- Transition: "We need dynamic tool discovery."

## Slide 7: V2 — Search & Execute
- SWITCH TO DEMO: Show V2 running
- "Now we have just 2 meta-tools. tool_search finds what you need, tool_execute runs it."
- "The agent can now discover and use ANY of the 662 tools"
- Show the code — it's dramatically simpler than V1
- "Search first, then execute. Read AND write."

## Slide 8: V2 Capabilities
- Show example actions working in the demo
- "Email the contact at Cox Intelligence" — actually sends the email
- "Create a Salesforce task" — actually creates it
- Show the daily briefing structure — richer now with write capabilities
- "The agent is now a real copilot, not just a reporter"

## Slide 9: V3 — Code Mode
- SWITCH TO DEMO: Show V3 running
- "Now the agent writes TypeScript code that executes in a sandbox"
- "No StackOne SDK at all — just 4 MCP tools from Discode"
- "list_servers, search_tools, get_input_schema, execute_code"
- Show complex multi-step operations happening in a single code block
- "This is the most powerful approach — the agent can chain operations, transform data, run things in parallel"

## Slide 10: V3+ — Defender
- "But there's a problem. When your agent reads emails, order notes, support tickets — any user-authored content — an attacker can embed prompt injection instructions."
- Show the attack scenario: malicious content in an email
- "Defender scans every tool result before it reaches the LLM"
- "Tier 1: regex patterns, ~1ms. Tier 2: ONNX classifier, ~10ms. Together they catch injection attempts in real-time."
- DEMO: Show the attack being blocked
- "The agent sees 'SECURITY ALERT' instead of the malicious instructions"

## Slide 11: Evolution Summary
- Walk through all 5 versions side by side
- "V0: no tools. V1: curated via StackOne Connect. V2: dynamic via Optimize. V3: code mode, Optimize+. V3+: secured with Defender."
- Map to the three pillars: Connect, Optimize, Secure
- "This is the progression every production agent needs to go through"

## Slide 12: CTA
- "If you want to build this yourself, scan the QR code"
- "Free access — you can have this running in an afternoon"
- "Come talk to me after — I'd love to see what you're building"
- Leave email up on screen
