# T2: Tool Use Patterns and Integration Protocols for AI Agents (2022--2026)

## Overview

Tool use has become the primary mechanism by which LLM-based agents transcend the limits of parametric knowledge. This survey covers the evolution from self-taught tool invocation (Toolformer) to enterprise-scale tool orchestration under standardized protocols (MCP), charting the techniques that make autonomous research agents possible.

---

## 1. Foundational Tool-Use Paradigms

### 1.1 Toolformer: Self-Taught Tool Use

**Key idea.** An LLM can teach *itself* when and how to call APIs by generating candidate API calls, executing them, and retaining only those that improve next-token prediction loss.

**Mechanism.** Fine-tune a language model (GPT-J 6.7B) using a self-supervised pipeline: (i) sample API calls within text, (ii) execute them, (iii) filter by whether the result reduces perplexity. The model learns to invoke a calculator, Q&A system, search engine, translation system, and calendar without task-specific supervision.

**Scale.** 5 tool types; evaluated on a handful of downstream benchmarks; demonstrated that a 6.7B model with tools can match much larger models without tools.

**Relevance to research automation.** Toolformer established the core pattern that every subsequent research agent uses: the LLM decides when to invoke an external capability, what arguments to pass, and how to incorporate results into its generation stream. This is precisely what an autonomous researcher needs when deciding to search arXiv, run a statistical test, or query a database.

> arXiv: [2302.04761](https://arxiv.org/abs/2302.04761) -- Schick et al. (2023)

### 1.2 TALM: Tool Augmented Language Models

**Key idea.** A text-only approach to tool augmentation with an iterative "self-play" bootstrapping technique, requiring only a few tool demonstrations to get started.

**Mechanism.** The model generates a tool call as text, the tool executes and returns a text result, and this is appended to the context. Self-play iteratively generates training data from the model's own successful tool interactions.

**Scale.** Evaluated on knowledge-heavy QA and math reasoning tasks. Demonstrated strong out-of-distribution generalization.

**Relevance to research automation.** TALM's self-play bootstrapping is a precursor to the self-improvement loops used in modern research agents, where agents learn from their own successful research trajectories.

> arXiv: [2205.12255](https://arxiv.org/abs/2205.12255) -- Parisi, Zhao & Fiedel (2022)

### 1.3 ART: Automatic Reasoning and Tool-Use

**Key idea.** Automatically generate multi-step reasoning programs that interleave chain-of-thought steps with tool calls, selecting demonstrations from a task library.

**Mechanism.** Given a new task, ART retrieves demonstrations of multi-step reasoning+tool-use from a library, generates an intermediate program, pauses generation when a tool is needed, executes the tool, and resumes. Fully automatic, no hand-crafted task-specific prompts required.

**Scale.** Evaluated on BigBench and MMLU benchmarks. Matches hand-crafted CoT prompts on a majority of tasks.

**Relevance to research automation.** ART's pattern of automatic tool selection from a library is directly relevant to research agents that must decide whether to search literature, run code, or consult a knowledge base at each reasoning step.

> arXiv: [2303.09014](https://arxiv.org/abs/2303.09014) -- Paranjape et al. (2023)

---

## 2. Tool Embeddings and Scalable Tool Selection

### 2.1 ToolkenGPT: Tools as Token Embeddings

**Key idea.** Represent each tool as a special token ("toolken") in the vocabulary. Learn an embedding for each toolken so the model can trigger a tool call the same way it generates a word.

**Mechanism.** Expand the LLM's vocabulary with toolken tokens; each has a learned embedding trained on demonstration data. When the model generates a toolken during inference, it pauses and the LLM is prompted to fill in tool arguments. After execution, the result is injected back into the generation stream. The frozen LLM backbone is never fine-tuned -- only the toolken embeddings are trained.

**Scale.** Designed to handle an *arbitrary* number of tools by simply adding new toolkens on the fly. Evaluated on numerical reasoning (FuncQA), knowledge-based QA (KAMEL), and embodied plan generation (VirtualHome). Substantially outperforms in-context-learning approaches that fail when the tool set is large.

**Relevance to research automation.** A research agent may need hundreds of specialized tools (literature search, code interpreters, domain databases, statistical packages). ToolkenGPT's embedding-based approach avoids context-window bottlenecks -- the model does not need to see all tool descriptions in-context.

> arXiv: [2305.11554](https://arxiv.org/abs/2305.11554) -- Hao et al. (2023)

### 2.2 Re-Initialization Token Learning (Improving on ToolkenGPT)

**Key idea.** Align tool token embeddings with the pre-existing word embedding space by initializing them from the tool's name or description.

**Mechanism.** Construct prior embeddings for each tool from its natural-language description, use these to initialize and regularize learnable tool token embeddings. This ensures the tool token space is well-aligned with the word token space.

**Scale.** Evaluated on GSM8K-XL, FuncQA, KAMEL, and VirtualHome. Outperforms ToolkenGPT, CoT, ReACT, and ICL baselines.

**Relevance to research automation.** Better tool-word alignment means the agent can more reliably select the right tool from a large set -- critical when a research agent has access to dozens of specialized APIs.

> arXiv: [2506.14248](https://arxiv.org/abs/2506.14248) -- Li et al. (2025)

### 2.3 ToolTok: Tool Tokenization for GUI Agents

**Key idea.** Multi-step pathfinding for GUI agents using learnable tool token embeddings with semantic anchoring.

**Mechanism.** Tools are represented as learnable token embeddings grounded in semantically related concepts. A curriculum of three tasks (token definition QA, text-guided tool selection, visual pathfinding) enables efficient learning from very limited supervision -- less than 1% of training data compared to other post-training approaches.

**Scale.** A 4B-parameter model remains competitive with 235B models. Demonstrates strong generalization across unseen scenarios.

**Relevance to research automation.** Demonstrates that tool tokenization can work at minimal data cost, relevant for research domains where labeled tool-use trajectories are scarce.

> arXiv: [2602.02548](https://arxiv.org/abs/2602.02548) -- Wang et al. (2026)

---

## 3. Dynamic Tool Retrieval and Selection at Scale

The fundamental bottleneck for agents with large toolsets: the LLM's context window cannot hold descriptions of hundreds or thousands of tools. Tool retrieval -- selecting the right subset of tools for a given query -- becomes a first-class problem.

### 3.1 ToolRet: Benchmarking Tool Retrieval

**Key idea.** A heterogeneous tool retrieval benchmark revealing that even strong IR models perform poorly on tool retrieval.

**Mechanism.** 7,600 retrieval tasks over a corpus of 43,000 tools collected from existing datasets. Benchmarks six types of retrieval models. Finds that even models with strong performance on standard IR benchmarks exhibit poor tool retrieval accuracy. Contributes a 200k-instance training dataset that substantially improves tool retrieval.

**Scale.** 43,000 tools -- the largest tool corpus benchmarked at time of publication.

**Relevance to research automation.** A research agent that can access thousands of tools (statistical packages, databases, APIs) needs reliable tool retrieval as a precondition. ToolRet demonstrates the gap and provides training data to close it.

> arXiv: [2503.01763](https://arxiv.org/abs/2503.01763) -- Shi et al. (2025)

### 3.2 Multi-Field Tool Retrieval

**Key idea.** Treat tool retrieval as a multi-aspect matching problem, aligning distinct dimensions of user intent with tool functionality, input constraints, and output formats.

**Mechanism.** Instead of matching a user query against raw tool documentation (which is often incomplete and structurally inconsistent), decompose tool representations into multiple fields. Fine-grained multi-field modeling achieves SOTA on five datasets.

**Scale.** Evaluated across five datasets and a mixed benchmark.

**Relevance to research automation.** Research queries are inherently multi-dimensional (e.g., "find a statistical test that handles non-normal distributions with paired samples and returns a confidence interval"). Multi-field retrieval is a natural fit.

> arXiv: [2602.05366](https://arxiv.org/abs/2602.05366) -- Tang et al. (2026)

### 3.3 ProTIP: Progressive Tool Retrieval Improves Planning

**Key idea.** A lightweight contrastive-learning framework that implicitly decomposes tasks and retrieves tools progressively, handling inter-tool dependencies.

**Mechanism.** Rather than retrieving all tools at once (single-step) or requiring explicit task decomposition labels, ProTIP uses contrastive learning to learn progressive tool retrieval. Outperforms ChatGPT-based task decomposition by 24% in Recall@K=10 for tool retrieval and 41% in tool accuracy for plan generation on ToolBench.

**Scale.** Evaluated on the ToolBench dataset.

**Relevance to research automation.** Research workflows are inherently multi-step with tool dependencies (e.g., search literature -> download paper -> extract data -> run analysis). Progressive retrieval mirrors this sequential dependency structure.

> arXiv: [2312.10332](https://arxiv.org/abs/2312.10332) -- Anantha et al. (2023)

### 3.4 COLT: Collaborative Learning-based Tool Retrieval

**Key idea.** Capture collaborative relationships among tools (which tools tend to be used together) via bipartite graph learning, not just semantic query-tool similarity.

**Mechanism.** Constructs three bipartite graphs (queries-scenes-tools) and applies a dual-view graph collaborative learning framework. BERT-mini (11M parameters) with COLT outperforms BERT-large (340M) -- a 30x parameter advantage from better tool relationship modeling.

**Scale.** Evaluated on an open benchmark and the ToolLens dataset.

**Relevance to research automation.** In research, tools cluster into workflows (e.g., pandas + matplotlib + scipy for data analysis). Collaborative signals can improve tool retrieval beyond what semantic matching alone provides.

> arXiv: [2405.16089](https://arxiv.org/abs/2405.16089) -- Qu et al. (2024)

### 3.5 Tool-DE: Document Expansion for Tool Retrieval

**Key idea.** Tool documentation is chronically under-specified. Use LLMs to systematically enrich tool descriptions with structured fields, dramatically improving retrieval.

**Mechanism.** A scalable document expansion pipeline using both open and closed-source LLMs to generate, validate, and refine enriched tool profiles. Produces 50k instances for embedding-based retrievers and 200k for rerankers. The resulting Tool-Embed (dense retriever) and Tool-Rank (LLM-based reranker) achieve SOTA on both ToolRet and Tool-DE benchmarks.

**Scale.** 50,000 + 200,000 training instances. Tested on corpora of tens of thousands of tools.

**Relevance to research automation.** Many research tools have sparse documentation. Automated documentation enrichment could make the long tail of specialized scientific tools accessible to agent retrieval.

> arXiv: [2510.22670](https://arxiv.org/abs/2510.22670) -- Lu et al. (2025)

### 3.6 Enhancing Tool Retrieval with Iterative LLM Feedback

**Key idea.** Use the tool-using LLM itself to provide feedback to the tool retriever, progressively closing the gap between retrieval and usage.

**Mechanism.** Multi-round feedback loop: the retriever proposes tools, the LLM evaluates whether they are appropriate, provides feedback, and the retriever is updated. This bridges the misalignment between standalone retrieval models and the LLM that will actually use the tools.

**Scale.** Achieves advanced performance in both in-domain and out-of-domain evaluation on a unified benchmark.

> arXiv: [2406.17465](https://arxiv.org/abs/2406.17465) -- Xu et al. (2024)

### 3.7 Tool Retrieval Bridge (TRB) for Vague Instructions

**Key idea.** Real-world instructions are vague; a bridge model rewrites them into specific instructions aligned with retriever preferences.

**Mechanism.** Introduces VGToolBench to simulate vague instructions. TRB uses a bridge model to rewrite vague queries, achieving up to 111% relative improvement in NDCG for BM25.

**Relevance to research automation.** Researchers often issue vague queries ("help me analyze this dataset" rather than "call scipy.stats.ttest_ind"). TRB addresses exactly this gap.

> arXiv: [2604.07816](https://arxiv.org/abs/2604.07816) -- Chen et al. (2026)

---

## 4. Model Context Protocol (MCP) and Standardized Tool Integration

### 4.1 MCP: The De Facto Standard

The Model Context Protocol, introduced by Anthropic in November 2024 and now governed by the Linux Foundation's Agentic AI Foundation, has become the dominant standard for connecting LLM agents to external tools. Key characteristics:

- **Client-server architecture.** An MCP client (embedded in the LLM application) connects to MCP servers, each of which exposes a set of tools via a standardized JSON-RPC interface.
- **Tool discovery.** Agents dynamically discover available tools and their schemas at runtime, rather than having tools hardcoded.
- **Composability.** Multiple MCP servers can run simultaneously, each providing different capabilities (database access, web search, code execution, domain APIs).
- **Scale.** As of early 2026: over 97 million monthly SDK downloads, 177,000+ registered tools (per the MCPSHIELD analysis).

**Relevance to research automation.** MCP enables a research agent to seamlessly connect to arXiv search, code execution environments, Obsidian vaults, Slack, database tools, and more -- all through a single protocol. This is the infrastructure layer that makes tool-rich autonomous research possible.

### 4.2 MCPSHIELD: Security Framework for MCP

**Key idea.** A comprehensive formal security framework identifying 7 threat categories and 23 attack vectors across MCP-based agent ecosystems.

**Mechanism.** Hierarchical threat taxonomy, formal verification model based on labeled transition systems, defense-in-depth reference architecture. Finds no single existing defense covers more than 34% of the threat landscape; their integrated architecture achieves 91% theoretical coverage.

**Scale.** Analysis covers 177,000+ MCP tools.

> arXiv: [2604.05969](https://arxiv.org/abs/2604.05969) -- Acharya & Gupta (2026)

### 4.3 Task2MCP: Task-Oriented MCP Server Recommendation

**Key idea.** Formulate MCP server selection as a structured retrieval-and-ranking problem, because identifying the right MCP server for a development task is itself a search problem at scale.

**Mechanism.** T2MRec models semantic relevance and structural compatibility, uses centroid-based candidate expansion and constrained LLM-based re-ranking. Includes an interactive recommendation agent prototype.

> arXiv: [2604.17234](https://arxiv.org/abs/2604.17234) -- He et al. (2026)

### 4.4 CASCADE: Security for MCP-Based Systems

**Key idea.** Three-tiered cascaded defense architecture for MCP: (i) regex/phrase/entropy pre-filtering, (ii) semantic analysis via embeddings, (iii) pattern-based output filtering. Operates fully locally with no external API calls.

> arXiv: [2604.17125](https://arxiv.org/abs/2604.17125) -- Turgut & Gumus (2026)

### 4.5 MCP Server for Quantum Execution

**Key idea.** Demonstrates MCP's reach beyond text-based tools: an MCP server enables LLM agents to execute quantum computing workflows on QPUs and HPC clusters via natural language.

**Mechanism.** The LLM agent processes natural language prompts and autonomously executes quantum computing workflows by invoking tools via MCP. Includes an OpenQASM interpretation pipeline and async execution on Quantinuum emulators.

> arXiv: [2604.08318](https://arxiv.org/abs/2604.08318) -- Shiraishi et al. (2026)

### 4.6 MCP in Clinical Research (CARIS)

**Key idea.** An MCP-based Clinical Agentic Research Intelligence System that automates the full clinical research workflow -- from study design to IRB documentation to ML model training -- while preserving data privacy.

**Mechanism.** LLMs orchestrate modular tools via MCP. Databases stay within the MCP server; users access only outputs. Achieves 96% completeness on TRIPOD+AI checklist in LLM evaluation.

> arXiv: [2604.12258](https://arxiv.org/abs/2604.12258) -- Kim et al. (2026)

### 4.7 MCP for Multi-Agent HPC Orchestration

**Key idea.** Hierarchical multi-agent framework where executor agents interface with a shared MCP server to orchestrate high-throughput screening campaigns on exascale supercomputers.

**Mechanism.** A planner agent partitions workloads and assigns subtasks to a swarm of parallel executor agents. All share one MCP server backed by the Parsl workflow engine. Demonstrated on the Aurora supercomputer screening 14,000+ metal-organic frameworks.

> arXiv: [2604.07681](https://arxiv.org/abs/2604.07681) -- Pham et al. (2026)

---

## 5. Tool Use at Scale: Enterprise and Large Toolsets

### 5.1 MCPVerse: 550+ Real-World Tools Benchmark

**Key idea.** An expansive benchmark integrating 550+ real-world executable tools creating a 140k+ token action space.

**Mechanism.** Evaluates LLMs across three modes (Oracle, Standard, Max-Scale). Reveals that most models suffer performance degradation with larger tool sets, but agentic models like Claude-4-Sonnet can actually leverage expanded tool spaces to improve accuracy.

**Scale.** 550+ tools, 140,000+ token action space -- an order of magnitude beyond prior benchmarks.

> arXiv: [2508.16260](https://arxiv.org/abs/2508.16260) -- Lei et al. (2025)

### 5.2 EnterpriseOps-Gym: Enterprise-Scale Tool Use

**Key idea.** Evaluate agentic planning in realistic enterprise settings with a massive tool space and persistent state changes.

**Mechanism.** Containerized sandbox with 164 database tables and 512 functional tools. 1,150 expert-curated tasks across 8 enterprise verticals. The top model (Claude Opus 4.5) achieves only 37.4% success, and providing oracle human plans improves performance by 14-35 percentage points, identifying strategic reasoning as the bottleneck.

**Scale.** 512 tools, 164 database tables, 1,150 tasks -- the most enterprise-realistic benchmark.

> arXiv: [2603.13594](https://arxiv.org/abs/2603.13594) -- Malay et al. (2026)

### 5.3 The Evolution of Tool Use: Single-Call to Multi-Tool Orchestration

**Key idea.** A comprehensive survey tracking the shift from isolated single-tool invocation to multi-tool orchestration over long trajectories with intermediate state, execution feedback, and practical constraints.

**Mechanism.** Organizes literature around six dimensions: inference-time planning, training/trajectory construction, safety/control, efficiency under resource constraints, capability completeness, and benchmark design.

> arXiv: [2603.22862](https://arxiv.org/abs/2603.22862) -- Xu et al. (2026)

### 5.4 ToolMind: 160k Trajectories with 20k+ Tools

**Key idea.** Large-scale, high-quality tool-agentic dataset with turn-level filtering to remove error propagation.

**Mechanism.** Constructs a function graph based on parameter correlations, then uses a multi-agent framework to simulate realistic interactions. Fine-grained turn-level filtering (not just trajectory-level) ensures quality.

**Scale.** 160,000 synthetic instances from 20,000+ tools, plus 200,000 augmented open-source instances.

> arXiv: [2511.15718](https://arxiv.org/abs/2511.15718) -- Yang et al. (2025)

### 5.5 Gorilla: LLM Connected with Massive APIs

**Key idea.** A fine-tuned LLaMA model that surpasses GPT-4 on writing API calls, with document-retriever integration for adapting to API version changes.

**Mechanism.** Fine-tuned on APIBench (HuggingFace, TorchHub, TensorHub APIs). When combined with a retriever, adapts to test-time documentation changes and substantially reduces hallucinated API calls.

**Scale.** Evaluated on 1,645 APIs across three major ML hubs.

**Relevance to research automation.** A researcher's tool landscape changes constantly (new package versions, deprecated APIs). Gorilla's retrieval-augmented approach keeps the agent current.

> arXiv: [2305.15334](https://arxiv.org/abs/2305.15334) -- Patil et al. (2023)

### 5.6 Command A: Enterprise Tool Use

**Key idea.** Cohere's agent-optimized enterprise LLM with best-in-class RAG and grounded tool use.

**Mechanism.** Hybrid architecture with decentralized training, self-refinement algorithms, and model merging. Supports 23 languages and is designed for automating complex business processes with tool orchestration.

> arXiv: [2504.00698](https://arxiv.org/abs/2504.00698) -- Team Cohere (2025)

### 5.7 ARC: Learning to Configure Agentic AI Systems

**Key idea.** Treat agent configuration (workflow, tools, token budget, prompts) as a per-query decision problem, not a fixed template.

**Mechanism.** ARC learns a lightweight hierarchical policy via reinforcement learning that dynamically tailors configurations per query. Achieves up to 25% higher task accuracy while reducing token and runtime costs compared to one-size-fits-all designs.

> arXiv: [2602.11574](https://arxiv.org/abs/2602.11574) -- Taparia et al. (2026)

---

## 6. Tools Enabling Autonomous Research

### 6.1 The AI Scientist v2: End-to-End Autonomous Research

**Key idea.** An end-to-end agentic system that formulates hypotheses, designs and runs experiments, analyzes data, and writes scientific manuscripts -- producing the first fully AI-generated peer-review-accepted workshop paper.

**Mechanism.** Progressive agentic tree-search managed by an experiment manager agent. No human-authored code templates required. Integrates a VLM-based feedback loop for figure refinement. Three fully autonomous manuscripts submitted to ICLR workshop; one exceeded the average human acceptance threshold.

**Tools used.** Code execution, file I/O, experiment tracking, figure generation, self-review.

> arXiv: [2504.08066](https://arxiv.org/abs/2504.08066) -- Yamada et al. (2025)

### 6.2 Kosmos: AI Scientist for Autonomous Discovery

**Key idea.** Runs for up to 12 hours performing cycles of parallel data analysis, literature search, and hypothesis generation, then synthesizes discoveries into scientific reports.

**Mechanism.** Uses a structured world model shared between a data analysis agent and a literature search agent. Executes an average of 42,000 lines of code and reads 1,500 papers per run. All statements in reports are cited with code or primary literature.

**Scale.** 200 agent rollouts per run, up to 20 cycles. Collaborators reported that one Kosmos run equaled ~6 months of their own research time on average.

**Tools used.** Literature search, code execution, data analysis, hypothesis testing, report generation.

> arXiv: [2511.02824](https://arxiv.org/abs/2511.02824) -- Mitchener et al. (2025)

### 6.3 DOVA: Deliberation-First Multi-Agent Research Orchestration

**Key idea.** Explicit meta-reasoning before tool invocation, with a persistent user model and entity-aware context.

**Mechanism.** Three innovations: (1) deliberation-first orchestration, (2) hybrid collaborative reasoning (ensemble + blackboard + iterative refinement), (3) adaptive multi-tiered thinking that reduces inference cost 40-60% on simple tasks while preserving deep reasoning.

**Tools used.** Multi-source search, verification tools, personalized delivery.

> arXiv: [2603.13327](https://arxiv.org/abs/2603.13327) -- Shen & Shen (2026)

### 6.4 Cognitive Kernel-Pro: Open-Source Deep Research Agent

**Key idea.** Fully open-source multi-module agent framework for deep research across web, file, code, and reasoning domains.

**Mechanism.** Investigates curation of high-quality training data for Agent Foundation Models. Novel strategies for test-time reflection and voting. An 8B-parameter model surpasses larger closed-source systems on the GAIA benchmark.

**Tools used.** Web browsing, file manipulation, code execution, general reasoning.

> arXiv: [2508.00414](https://arxiv.org/abs/2508.00414) -- Fang et al. (2025)

### 6.5 The Agentic Researcher: Practical AI-Assisted Research

**Key idea.** A practical framework turning CLI coding agents (Claude Code, Codex CLI, OpenCode) into autonomous research assistants via methodological rules formulated as agent prompts.

**Mechanism.** Runs inside a sandboxed container, works with any frontier LLM through existing CLI agents. Five-level taxonomy of AI integration. Longest autonomous session ran 20+ hours dispatching independent experiments across multiple nodes.

**Tools used.** Code execution, experiment management, multi-node GPU orchestration, file I/O.

> arXiv: [2603.15914](https://arxiv.org/abs/2603.15914) -- Zimmer et al. (2026)

### 6.6 Deep Research: Interactive Multi-Agent Scientific Discovery

**Key idea.** Multi-agent system enabling interactive (not just batch) scientific investigation with minutes-long turnaround.

**Mechanism.** Specialized agents for planning, data analysis, literature search, and novelty detection. Unified through a persistent world state. Two modes: semi-autonomous with human checkpoints and fully autonomous.

**Scale.** SOTA on BixBench: 48.8% open response, 64.4% multiple choice -- exceeding baselines by 14-26 percentage points.

> arXiv: [2601.12542](https://arxiv.org/abs/2601.12542) -- Weidener et al. (2026)

### 6.7 From AI for Science to Agentic Science

**Key idea.** A comprehensive survey unifying three perspectives (process-oriented, autonomy-oriented, mechanism-oriented) on autonomous scientific discovery.

**Mechanism.** Identifies five core capabilities underpinning scientific agency and models discovery as a dynamic four-stage workflow. Reviews applications across life sciences, chemistry, materials science, and physics.

> arXiv: [2508.14111](https://arxiv.org/abs/2508.14111) -- Wei et al. (2025)

---

## 7. Surveys and Meta-Analyses

### 7.1 Fast, Slow, and Tool-Augmented Thinking for LLMs

**Key idea.** Taxonomy of LLM reasoning strategies along two knowledge boundaries: fast/slow (intuitive vs. deliberative) and internal/external (parametric vs. tool-augmented).

> arXiv: [2508.12265](https://arxiv.org/abs/2508.12265) -- Jia et al. (2025)

### 7.2 Agentic Reasoning for Large Language Models

**Key idea.** Comprehensive survey organizing agentic reasoning along three dimensions: foundational (single-agent planning, tool use, search), self-evolving (feedback, memory, adaptation), and collective multi-agent reasoning.

> arXiv: [2601.12538](https://arxiv.org/abs/2601.12538) -- Wei et al. (2026)

### 7.3 A Survey of AI Scientists

**Key idea.** Systematic synthesis of the AI Scientist domain using a six-stage framework (Literature Review, Idea Generation, Experimental Preparation, Execution, Writing, Paper Generation). Charts the field's evolution from foundational modules (2022-2023) to closed-loop systems (2024) to scalable human-AI collaboration (2025+).

> arXiv: [2510.23045](https://arxiv.org/abs/2510.23045) -- Tie, Zhou & Sun (2025)

---

## 8. Synthesis: Key Patterns and Implications for Research Automation

### 8.1 Evolution of Tool Integration (2022-2026)

| Period | Paradigm | Representative Work | Scale |
|--------|----------|-------------------|-------|
| 2022 | Self-play bootstrapping | TALM | ~5 tools |
| 2023 | Self-supervised tool learning | Toolformer | ~5 tools |
| 2023 | Tool tokens/embeddings | ToolkenGPT | Arbitrary (expandable) |
| 2023 | Massive API fine-tuning | Gorilla | 1,645 APIs |
| 2023 | Automatic tool selection | ART | Task library |
| 2024 | Collaborative tool retrieval | COLT, ProTIP | Thousands |
| 2024-25 | Standardized protocol | MCP | 177,000+ registered tools |
| 2025-26 | Enterprise orchestration | EnterpriseOps-Gym, MCPVerse | 500+ real tools |
| 2025-26 | Autonomous research agents | AI Scientist v2, Kosmos | Full research workflow |

### 8.2 Critical Observations

1. **The tool retrieval bottleneck is real.** Standard IR models fail on tool retrieval even when they excel at document retrieval (ToolRet, 2503.01763). The gap is being closed through multi-field retrieval, collaborative learning, and document expansion, but remains a limiting factor at 1000+ tool scale.

2. **MCP has won the protocol war (for now).** With 97M+ monthly SDK downloads and 177k+ registered tools, MCP is the dominant standard. Research papers from quantum computing, clinical research, materials science, and HPC all adopt it as their integration layer.

3. **Embedding-based tool selection scales better than in-context.** ToolkenGPT and its successors show that tool tokens/embeddings avoid the context window bottleneck that makes in-context tool descriptions infeasible beyond ~20 tools.

4. **Security is the emerging concern.** MCPSHIELD identifies 23 distinct attack vectors across MCP ecosystems. No single defense covers more than 34% of the threat landscape. As research agents gain access to more powerful tools (code execution, database writes), security becomes paramount.

5. **Autonomous research is real but bounded.** AI Scientist v2 produced a peer-accepted workshop paper; Kosmos equivalences 6 months of human research in 12 hours. But EnterpriseOps-Gym shows the best model achieving only 37.4% success on enterprise tasks, and strategic reasoning remains the primary bottleneck.

6. **The tool-retrieval / tool-use pipeline needs end-to-end optimization.** Iterative feedback from the LLM to the retriever (2406.17465) and progressive retrieval (ProTIP) suggest the field is moving toward unified systems where retrieval and usage are jointly optimized.

### 8.3 Implications for Research Automation Architecture

A well-designed autonomous research agent in 2026 should:

- **Use MCP as the integration layer** for connecting to literature search (arXiv), code execution (sandboxed containers), knowledge bases (Obsidian, databases), and communication tools (Slack, email).
- **Employ embedding-based tool selection** (ToolkenGPT-style) for the core tool set, with retrieval-augmented fallback for the long tail of specialized tools.
- **Implement progressive/iterative tool retrieval** that decomposes complex research queries into sequential tool needs.
- **Include deliberation-first orchestration** (DOVA pattern) where the agent explicitly reasons about what tools to use before invoking them.
- **Adopt multi-agent architecture** with specialized agents for literature search, data analysis, code execution, and synthesis (Kosmos, Deep Research, DOVA patterns).
- **Build in security primitives** (MCPSHIELD recommendations) given the sensitivity of research data and the power of tools like code execution.

---

## References (by arXiv ID)

- 2205.12255 -- TALM: Tool Augmented Language Models (Parisi et al., 2022)
- 2302.04761 -- Toolformer (Schick et al., 2023)
- 2303.09014 -- ART: Automatic Reasoning and Tool-use (Paranjape et al., 2023)
- 2304.08244 -- API-Bank: Benchmark for Tool-Augmented LLMs (Li et al., 2023)
- 2305.11554 -- ToolkenGPT (Hao et al., 2023)
- 2305.15334 -- Gorilla: LLM Connected with Massive APIs (Patil et al., 2023)
- 2312.10332 -- ProTIP: Progressive Tool Retrieval (Anantha et al., 2023)
- 2403.06551 -- ToolRerank: Adaptive Hierarchy-Aware Reranking (Zheng et al., 2024)
- 2405.16089 -- COLT: Collaborative Tool Retrieval (Qu et al., 2024)
- 2406.17465 -- Iterative LLM Feedback for Tool Retrieval (Xu et al., 2024)
- 2410.03212 -- QTA: Data-Efficient Massive Tool Retrieval (Zhang et al., 2024)
- 2412.15495 -- TL-Training: Task-Feature-Based Tool Training (Ye et al., 2024)
- 2503.01763 -- ToolRet: Tool Retrieval Benchmark (Shi et al., 2025)
- 2504.00698 -- Command A: Enterprise LLM (Team Cohere, 2025)
- 2504.08066 -- AI Scientist v2 (Yamada et al., 2025)
- 2506.14248 -- Re-Initialization Token Learning (Li et al., 2025)
- 2508.00414 -- Cognitive Kernel-Pro (Fang et al., 2025)
- 2508.08791 -- Feedback-Driven Tool-Use via Automated Environments (Ye et al., 2025)
- 2508.12265 -- Fast, Slow, and Tool-Augmented Thinking (Jia et al., 2025)
- 2508.14111 -- From AI for Science to Agentic Science (Wei et al., 2025)
- 2508.16260 -- MCPVerse: Real-World Tool Use Benchmark (Lei et al., 2025)
- 2510.01279 -- TUMIX: Multi-Agent Tool-Use Mixture (Chen et al., 2025)
- 2510.04550 -- TRAJECT-Bench: Trajectory-Aware Tool Evaluation (He et al., 2025)
- 2510.22670 -- Tool-DE: Document Expansion for Tool Retrieval (Lu et al., 2025)
- 2510.23045 -- A Survey of AI Scientists (Tie et al., 2025)
- 2511.02824 -- Kosmos: AI Scientist for Autonomous Discovery (Mitchener et al., 2025)
- 2511.04583 -- Jr. AI Scientist (Miyai et al., 2025)
- 2511.15718 -- ToolMind: Large-Scale Tool-Agentic Dataset (Yang et al., 2025)
- 2601.12538 -- Agentic Reasoning for LLMs (Wei et al., 2026)
- 2601.12542 -- Deep Research: Interactive Multi-Agent Scientific Discovery (Weidener et al., 2026)
- 2602.02548 -- ToolTok: Tool Tokenization for GUI Agents (Wang et al., 2026)
- 2602.05366 -- Multi-Field Tool Retrieval (Tang et al., 2026)
- 2602.11574 -- ARC: Learning to Configure Agentic Systems (Taparia et al., 2026)
- 2603.13327 -- DOVA: Deliberation-First Multi-Agent Orchestration (Shen & Shen, 2026)
- 2603.13594 -- EnterpriseOps-Gym (Malay et al., 2026)
- 2603.15914 -- The Agentic Researcher (Zimmer et al., 2026)
- 2603.22862 -- Evolution of Tool Use in LLM Agents (Xu et al., 2026)
- 2604.05969 -- MCPSHIELD: Security Framework for MCP (Acharya & Gupta, 2026)
- 2604.07681 -- Multi-Agent MCP Orchestration on HPC (Pham et al., 2026)
- 2604.07816 -- Tool Retrieval Bridge for Vague Instructions (Chen et al., 2026)
- 2604.08318 -- MCP Server for Quantum Execution (Shiraishi et al., 2026)
- 2604.12258 -- CARIS: MCP-Based Clinical Research System (Kim et al., 2026)
- 2604.17125 -- CASCADE: MCP Defense Architecture (Turgut & Gumus, 2026)
- 2604.17234 -- Task2MCP: MCP Server Recommendation (He et al., 2026)
