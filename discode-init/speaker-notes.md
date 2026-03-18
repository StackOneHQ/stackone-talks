# Disco: Speaker Notes & Demo Commands

**Speaker:** Will Leeney
**Topic:** Tool Search & Response Optimisation for MCP

---

## 1 - Title


- "I'm Will, I've got a PhD from Bristol, I work at StackOne as an ML engineer."


## 2 - StackOne
- Q - who knows what MCP is
- Q - who's used MCP 
- Q - who's used MCP in production

- "StackOne does integrations. 200+ connectors, all accessible via MCP, A2A. We make it so you can connect to anything without building it yourself."
- Each connected account exposes that provider's full set of tools (Salesforce = 370 tools, Workday = 186, Oracle Fusion = 1,506).


## 3 - Normal tool calling
- connect a couple of accounts
- A few tools, Claude picks the right one.
- still looking at a lot of bloat

## 4 - Tool Schema bloat and why it happens

Q - who's faced this problem of having too many tools 

"This is what a real enterprise agent looks like. Not 3 tools. Not 20. Over a thousand. 
- Enterprise wants one agent that can do everything — HR, CRM, project management, comms.
- we want to know about customer data, where employee records at. we want to do stuff like find the latest deal in salesforce and which is the account owner has PTO next week. 


## 5 - Building tool search (don't preload, dynamically fetch what you want)

Q - who knows what dynamic loading is in this case

- Claude Code already does this, auto-activates at 10% context. But not all agent harnesses support it yet. gemini and windsurf are no
- it's diffucult building an enterprise agent via API without this functionality 


## 6 Search methods — BM25 / semantic / LLMs

Q - whos heard of these

claude uses BM25 + regex, we want to do a embeddings based approach, versus having the LLM search. semantic router (+ other alternatives)

- **BM25** — Classic lexical search; scores docs by term frequency with diminishing returns (Okapi weighting). Fast but misses synonyms.
- **Baseline Embedding** — Encode query + tool descriptions with MiniLM-L6-v2, rank by cosine similarity. Simple nearest-neighbour search.
- **StackOne Action Search** — Baseline embedding enriched with verb synonyms and domain/category context before encoding.
- **Semantic Router** — Generates 3-5 synthetic utterances per tool, averages them into a centroid embedding, routes queries to the nearest centroid (Aurelio Labs).
- **Tool2Vec** — Creates a synthetic "ideal query" embedding for each tool offline, then matches real queries against those (UC Berkeley).
- **Toolshed RAG** — Expands the query with an LLM, retrieves candidates with embeddings, then reranks with a cross-encoder.
- **bge-base-en-v1.5** — Same as baseline but swaps in a larger 109M-param model (768d) to test whether more capacity helps off-the-shelf.
- **LLM Direct / LangGraph BigTool** — Dumps the full tool list into the LLM context and asks it to pick. Accurate but ~2.5s per query.
- **Fine-Tuned Bi-Encoder** — MiniLM/bge fine-tuned on synthetic query-tool pairs with same-connector hard negatives. The big lever (+30pp Hit@1).


## 7 Benchmark dataset - mock connectors


- Mock connectors generated at ~/Documents/mock-connectors
- Our benchmark covers both individual tool routing AND multi-step workflow tasks (e.g. "create a Jira ticket from the latest Slack thread")
- This matters because real enterprise use-cases are workflow-heavy, not just single tool calls

## 8 baseline results - comparison table

- Semantic Router leads the baselines at 62.7% Hit@1 — synthetic utterances per tool, nearest centroid matching
- StackOne Action Search is close behind — same embedding with synonym enrichment
- Toolshed RAG gets similar accuracy but 20x slower due to LLM query expansion + cross-encoder rerank
- Tool2Vec is comparable to baseline — synthetic "ideal query" per tool, not much gain
- bge swaps in a larger model (109M params, 768d) — better Hit@3/10 but lower Hit@1 than semantic router
- BM-25 is fastest (1,880 QPS) but worst accuracy — lexical matching misses synonyms
- LLM Direct / LangGraph BigTool — dump everything into context, ~2.5s per query, not scalable

right so we want improve upon this

## 9 Fine-tuning — training data + Modal boxes

Q - who knows what contrastive learning 

- 100+ mock connectors used for training data generation
- complex workflow with queries that require multiple-tools

## 10 finetuned results

yay

## 11 DEMO - tool search working

Just run the search demo.

## 12 - it works until you have a massive response

Response Bloat 

## 13 Code Mode

architecture flow: Agent writes code → Sandbox executes → MCP client → API → filter data before returning to LLM

mcp makes it easy to use tools that require complex backends. 
with mcp you can have access via oauth rather than with keys 

## 14 Benchmarking Code Mode

Code mode vs naive — highlight the pass rate improvement. Mock connectors benchmark.

- **No Compression** — Baseline pass-through; dump the full raw tool response into the LLM context. Accuracy ceiling in theory, noise floor in practice.
- **Discode Dynamic** — LLM sets a `max_chars_returned` budget per call; response is truncated to fit. Compression *improves* accuracy by cutting noise (79.5% vs 71% no-compression).
- **Observation Masking** — Replace all prior tool outputs with `[observation masked]`, forcing the LLM to reason from accumulated state instead of re-reading old results.
- **Selective Context** — Entropy-based sentence pruning: score each sentence by self-information, drop the lowest-entropy 50%. Modest compression but retains too much filler.
- **LLMLingua-2** — Token-level keep/drop classifier (XLM-RoBERTa); predicts which tokens to prune. Worst performer here — the heuristic approximation without a proper ONNX model actively removes important tokens.

## 15 Dynamic Truncation

Raw response → LLM generated code filter → truncation → compact response

## 16 MCP Atlas and more benchmarks



## 17 MCP Primitives — listservers, searchtools, getinputschema


## 18 Shipping It

Cloudflare Workers / Credential Injection / No Downloads boxes diagram
concerns like we just wanted an mcp

## 19 full discode demo

still in active dev


## 20 Thanks — placeholder for QR codes + social links
