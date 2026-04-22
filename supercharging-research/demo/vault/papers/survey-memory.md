# Memory Mechanisms and Multi-Agent Coordination for Autonomous Research Systems (2022--2026)

**Task T3 -- Literature Survey Draft**

---

## 1. Introduction

Memory and coordination are the twin pillars that separate a stateless LLM prompt from an autonomous research agent. A single inference call can answer a question, but conducting a literature review, designing an experiment, iterating on results, and writing up findings demands the ability to (i) accumulate and retrieve knowledge over time, and (ii) divide labour across specialized sub-agents. This survey covers the primary mechanisms proposed between 2022 and 2026, organized into six thematic clusters: generative-agent memory streams, agentic Zettelkasten-style memory, cognitive memory taxonomies, multi-agent conversation frameworks, orchestration protocols, and the specific role of memory in long-horizon research tasks.

---

## 2. Generative Agents and Memory Streams

### 2.1 Foundational Architecture

**Park et al. (2023) -- Generative Agents: Interactive Simulacra of Human Behavior** (arXiv:2304.03442)

- **Key idea.** Twenty-five LLM-powered agents inhabit a sandbox world, producing believable individual and emergent social behaviours (e.g., autonomously organizing a Valentine's Day party) by fusing perception, planning, and reflection over a natural-language memory stream.
- **Mechanism.** Three-component architecture: (1) *observation* -- a complete record of experiences stored as natural-language entries; (2) *reflection* -- periodic synthesis of observations into higher-level abstractions; (3) *retrieval* -- recency-, importance-, and relevance-weighted lookup to condition the next action.
- **Relevance to autonomous research.** This architecture established the template that virtually all subsequent agent-memory systems build upon. The observation-reflection-retrieval loop maps directly onto the research cycle: collect evidence (observation), form hypotheses (reflection), and ground new decisions in prior findings (retrieval). The ablation study confirmed that removing any single component significantly degrades agent coherence, underscoring the necessity of a full memory pipeline for sustained, goal-directed behaviour.

### 2.2 Scaled and Cost-Efficient Variants

**Lyfe Agents (2023)** (arXiv:2310.02172) introduced a Summarize-and-Forget memory mechanism that prioritizes critical items at 10-100x lower computational cost than Park et al., demonstrating that memory can be made efficient enough for real-time interaction.

**Forgetful but Faithful (FiFA) Benchmark (2025)** (arXiv:2512.12856) formalized privacy-aware memory management with six forgetting policies. Their hybrid policy achieves a composite score of 0.911 while maintaining computational tractability, addressing a practical concern for any research agent handling sensitive data or operating under regulatory constraints.

---

## 3. A-MEM and Agentic Memory Systems

### 3.1 A-MEM: Zettelkasten for LLM Agents

**Xu et al. (2025) -- A-MEM: Agentic Memory for LLM Agents** (arXiv:2502.12110)

- **Key idea.** Memory organization should be dynamic and self-organizing, not static. Inspired by the Zettelkasten (slip-box) method, A-MEM creates interconnected knowledge networks through dynamic indexing and linking.
- **Mechanism.** When a new memory is added, the system generates a structured note with contextual descriptions, keywords, and tags, then analyzes historical memories to discover relevant connections and establish links. Crucially, new memories can trigger *evolution* of existing notes -- updating their contextual representations and attributes -- so the network continuously refines its understanding.
- **Relevance to autonomous research.** The Zettelkasten analogy is directly apt for research: each insight, paper note, or experimental result becomes a card whose connections to the rest of the knowledge base are maintained dynamically. This mirrors how human researchers maintain and cross-reference a literature base. Empirical results on six foundation models show superior improvement over static baselines.

### 3.2 Follow-on Agentic Memory Systems

The A-MEM design spawned a rapid lineage of improvements:

- **D-MEM (2026)** (arXiv:2603.14597) -- Introduces dopamine-gated routing: a lightweight Critic Router evaluates stimuli for Surprise and Utility (via Reward Prediction Error), bypassing routine inputs to an O(1) buffer while sending novel inputs through the O(N) evolution pipeline. Reduces A-MEM's O(N^2) write latency and cuts token consumption by over 80%.
- **SwiftMem (2026)** (arXiv:2601.08160) -- Achieves sub-linear retrieval via temporal indexing (logarithmic-time range queries) and a semantic DAG-Tag index. 47x faster search than state-of-the-art baselines while maintaining competitive accuracy.
- **MAGMA (2026)** (arXiv:2601.03236) -- Represents each memory item across orthogonal semantic, temporal, causal, and entity graphs, with retrieval formulated as policy-guided traversal. Decoupling representation from retrieval enables transparent reasoning paths.
- **DeltaMem (2026)** (arXiv:2604.01560) -- Formulates persona-centric memory management as an end-to-end RL task using a novel Memory-based Levenshtein Distance reward.
- **GAM: General Agentic Memory (2025)** (arXiv:2511.18423) -- Follows a just-in-time (JIT) compilation principle: offline stage stores lightweight highlights, while a Researcher component integrates information from a universal page-store at runtime. Enables end-to-end optimization through reinforcement learning.

---

## 4. Memory Taxonomies: Episodic, Semantic, Procedural, Working Memory

### 4.1 Cognitive-Science-Grounded Frameworks

**Pink et al. (2025) -- Episodic Memory is the Missing Piece for Long-Term LLM Agents** (arXiv:2502.06975)

- **Key idea.** Position paper arguing that episodic memory -- supporting single-shot learning of instance-specific contexts -- is the critical missing component for long-term agents. Presents five key properties of episodic memory and a roadmap for integrated development.
- **Relevance.** For research agents, episodic memory is what allows an agent to recall *this specific experiment failed because of X* rather than only retaining a generalized rule. The paper unites several scattered research directions under a single episodic-memory agenda.

**Guo et al. (2023) -- Empowering Working Memory for LLM Agents** (arXiv:2312.17259)

- **Key idea.** Proposes a centralized Working Memory Hub and Episodic Buffer to retain memories across dialogue episodes, analogous to Baddeley's working memory model from cognitive psychology.
- **Mechanism.** Addresses the isolation of distinct dialogue episodes in standard LLMs by creating persistent memory links across sessions.
- **Relevance.** Working memory is the bottleneck for in-context reasoning. For a research agent juggling multiple sub-tasks (literature search, code generation, analysis), a working memory hub prevents catastrophic context loss.

**Liang et al. (2025) -- AI Meets Brain: Memory Systems from Cognitive Neuroscience to Autonomous Agents** (arXiv:2512.23343)

- **Key idea.** Comprehensive survey bridging cognitive neuroscience and LLM agent memory. Provides comparative analysis of memory taxonomy (episodic, semantic, procedural), storage mechanisms, and the full management lifecycle from both biological and artificial perspectives.
- **Relevance.** Establishes the definitive cross-disciplinary reference for mapping human memory categories onto agent architectures. Covers multimodal memory systems and skill acquisition as future directions.

### 4.2 Procedural Memory

**MACLA (2025) -- Learning Hierarchical Procedural Memory** (arXiv:2512.18950)

- **Key idea.** Decouples reasoning from learning by maintaining a frozen LLM while performing all adaptation in external hierarchical procedural memory.
- **Mechanism.** Extracts reusable procedures from trajectories, tracks reliability via Bayesian posteriors, selects actions through expected-utility scoring, and refines procedures by contrasting successes and failures. Compresses 2,851 trajectories into 187 procedures in 56 seconds (2,800x faster than parameter-training baselines).
- **Relevance.** For research agents, procedural memory captures reusable workflows (e.g., "how to set up a controlled experiment in domain X"). The Bayesian reliability tracking ensures that unreliable procedures are deprioritized -- critical for scientific rigour.

### 4.3 Unified and Compression-Oriented Taxonomies

**Experience Compression Spectrum (2026)** (arXiv:2604.15877)

- **Key idea.** Positions memory, skills, and rules as points along a single compression axis: episodic memory (5-20x compression), procedural skills (50-500x), and declarative rules (1,000x+). Reveals that every existing system operates at a fixed compression level; none supports adaptive cross-level compression (the "missing diagonal").
- **Relevance.** Provides a unifying lens for understanding which memory type is appropriate at which stage of a research workflow. Early-stage exploration needs low-compression episodic memory; mature insights should be compressed into reusable rules.

**Du (2026) -- Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers** (arXiv:2603.07670)

- **Key idea.** Comprehensive survey formalizing agent memory as a write-manage-read loop. Three-dimensional taxonomy spanning temporal scope, representational substrate, and control policy. Covers five mechanism families: context-resident compression, retrieval-augmented stores, reflective self-improvement, hierarchical virtual context, and policy-learned management.
- **Relevance.** The most current (early 2026) panoramic survey of the field, serving as the taxonomic backbone for understanding memory mechanisms in research agents.

**Anatomy of Agentic Memory (2026)** (arXiv:2602.19320)

- **Key idea.** Taxonomy of Memory-Augmented Generation (MAG) systems based on four memory structures. Identifies empirical pain points: benchmark saturation, metric misalignment, backbone-dependent accuracy, and overlooked latency/throughput overhead.
- **Relevance.** Critical reality check: many agentic memory systems underperform their theoretical promise in practice. Research agents must be designed with these limitations in mind.

---

## 5. Multi-Agent Conversation: AutoGen and Beyond

### 5.1 AutoGen

**Wu et al. (2023) -- AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation** (arXiv:2308.08155)

- **Key idea.** Open-source framework where developers build LLM applications via multiple agents that converse to accomplish tasks. Agents are customizable, conversable, and operate in modes combining LLMs, human inputs, and tools.
- **Mechanism.** Both natural language and code can program flexible conversation patterns. Agents can be assigned distinct roles (e.g., coder, critic, planner) and interact through structured message passing. The framework supports human-in-the-loop at any point.
- **Relevance to autonomous research.** AutoGen's conversation-based coordination is a natural fit for the research process: one agent conducts literature search, another writes code, a third reviews results, and a human researcher provides high-level guidance. Empirical demonstrations span mathematics, coding, question answering, and operations research. The framework established the paradigm that research systems like Agent Laboratory later built upon.

### 5.2 MetaGPT

**Hong et al. (2023) -- MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework** (arXiv:2308.00352)

- **Key idea.** Encodes Standardized Operating Procedures (SOPs) into prompt sequences, enabling agents with domain expertise to verify intermediate results and reduce cascading hallucinations.
- **Mechanism.** Assembly-line paradigm assigns diverse roles to agents; complex tasks are decomposed into subtasks where each agent contributes specialized output. SOPs enforce structured handoffs between agents.
- **Relevance.** The SOP-encoded workflow is particularly valuable for research: it prevents the kind of cascading errors where a flawed literature interpretation propagates through hypothesis generation, experimental design, and analysis. MetaGPT's verification step at each handoff mirrors peer review within a research team.

### 5.3 LangGraph + CrewAI

**Duan & Wang (2024) -- Exploration of LLM Multi-Agent Application Implementation Based on LangGraph+CrewAI** (arXiv:2411.18241)

- **Key idea.** LangGraph provides graph-based workflow orchestration with precise state control; CrewAI adds intelligent task allocation and resource management for team collaboration.
- **Mechanism.** LangGraph's graph architecture improves information transmission efficiency with explicit state management. CrewAI enhances team collaboration through role assignment and capability-aware task routing.
- **Relevance.** These frameworks represent the practical infrastructure layer that research agent systems are increasingly built on. The graph-based state management is particularly suited to the branching, iterative nature of research workflows.

---

## 6. Multi-Agent Orchestration Protocols

### 6.1 Coordination and Routing

**Shu et al. (2024) -- Towards Effective GenAI Multi-Agent Collaboration** (arXiv:2412.05449)

- **Key idea.** Evaluates two operational modes: (1) coordination mode for parallel communication and payload referencing; (2) routing mode for efficient message forwarding. Multi-agent collaboration enhances goal success rates by up to 70% over single-agent approaches.
- **Mechanism.** Inter-agent communication with payload referencing enables agents to share structured data (not just text). Routing selectively bypasses orchestration overhead for simple tasks, reducing latency.
- **Relevance.** Demonstrates that agent collaboration is not merely additive but multiplicative: the 70% improvement over single-agent approaches on enterprise tasks suggests similar gains for research tasks requiring diverse expertise.

### 6.2 Orchestration Quality and Determinism

**Drammeh (2025) -- Multi-Agent LLM Orchestration Achieves Deterministic, High-Quality Decision Support** (arXiv:2511.15755)

- **Key idea.** Multi-agent orchestration achieves 100% actionable recommendation rate vs. 1.7% for single-agent approaches -- an 80x improvement in specificity and 140x in correctness, with zero quality variance.
- **Relevance.** The zero-variance finding is critical for research applications where reproducibility matters. If a research agent's recommendations are non-deterministic, its scientific utility is undermined.

### 6.3 Benchmark-Driven Evaluation

**Orogat et al. (2026) -- Understanding Multi-Agent LLM Frameworks: A Unified Benchmark** (arXiv:2602.03128)

- **Key idea.** Introduces MAFBench, a unified evaluation suite for multi-agent frameworks. Framework-level design choices alone can increase latency by 100x, reduce planning accuracy by 30%, and lower coordination success from 90% to below 30%.
- **Relevance.** Quantifies the cost of poor architectural choices in multi-agent systems -- essential guidance for anyone building research agent infrastructure.

### 6.4 Consensus and Voting Protocols

**Tian et al. (2025) -- Beyond the Strongest LLM: Multi-Turn Multi-Agent Orchestration** (arXiv:2509.23537)

- **Key idea.** Multi-turn consensus among GPT-5, Gemini 2.5 Pro, Grok 4, and Claude Sonnet 4 matches or exceeds the strongest single model on GPQA-Diamond, IFEval, and MuSR. Reveals risks of herding (premature consensus when vote visibility is enabled).
- **Relevance.** For research agents that must make judgement calls (e.g., is this hypothesis worth pursuing?), multi-model consensus provides a form of epistemic diversity analogous to a research committee. The herding finding warns against naive voting schemes.

### 6.5 Externalization Framework

**Zhou et al. (2026) -- Externalization in LLM Agents: A Unified Review of Memory, Skills, Protocols and Harness Engineering** (arXiv:2604.08224)

- **Key idea.** Agent capabilities increasingly reside not in model weights but in the external infrastructure: memory externalizes state across time, skills externalize procedural expertise, protocols externalize interaction structure, and the harness coordinates them. Traces the historical progression from weights to context to harness.
- **Relevance.** Provides the theoretical framing for why autonomous research agents need sophisticated external scaffolding rather than just larger models. The "cognitive artifacts" lens explains each component's role in reducing the cognitive burden on the LLM.

---

## 7. Memory Enabling Long-Horizon Research Tasks

### 7.1 Autonomous Research Systems

**Schmidgall et al. (2025) -- Agent Laboratory: Using LLM Agents as Research Assistants** (arXiv:2501.04227)

- **Key idea.** Fully autonomous framework that accepts a research idea and progresses through literature review, experimentation, and report writing. Human feedback at each stage significantly improves quality. Achieves 84% cost reduction over previous autonomous research methods.
- **Relevance.** Demonstrates that memory (in the form of accumulated literature notes, experimental results, and iterative feedback) is the connective tissue that makes end-to-end research automation possible.

**Tang et al. (2025) -- AI-Researcher: Autonomous Scientific Innovation** (arXiv:2505.18705)

- **Key idea.** Orchestrates the complete research pipeline -- literature review, hypothesis generation, implementation, and manuscript preparation -- with minimal human intervention. Introduces Scientist-Bench for evaluation across diverse AI research domains.

**Wei et al. (2025) -- From AI for Science to Agentic Science** (arXiv:2508.14111)

- **Key idea.** Positions Agentic Science as a paradigm where AI systems progress from partial assistance to full scientific agency. Identifies five core capabilities underpinning scientific agency and models discovery as a four-stage workflow.
- **Relevance.** The most comprehensive survey connecting agent architectures to the full scientific discovery cycle. Memory appears as a cross-cutting enabler across all five core capabilities.

**Gao et al. (2026) -- Camyla: Scaling Autonomous Research in Medical Image Segmentation** (arXiv:2604.10696)

- **Key idea.** Combines Quality-Weighted Branch Exploration, Layered Reflective Memory, and Divergent Diagnostic Feedback. Over 28 days on an 8-GPU cluster, generates 2,700+ novel model implementations and 40 complete manuscripts, surpassing nnU-Net on 24/31 datasets.
- **Mechanism.** *Layered Reflective Memory* retains and compresses cross-trial knowledge at multiple granularities -- exactly the kind of multi-resolution memory needed for sustained research campaigns.
- **Relevance.** The strongest empirical demonstration to date that memory-enabled agents can conduct domain-scale autonomous research.

### 7.2 Long-Horizon Memory Optimization

**Chen et al. (2025) -- IterResearch: Rethinking Long-Horizon Agents with Interaction Scaling** (arXiv:2511.07327)

- **Key idea.** Replaces the mono-contextual paradigm (accumulating everything in one context window) with an MDP-inspired architecture featuring strategic workspace reconstruction. Maintains an evolving report as memory and periodically synthesizes insights.
- **Mechanism.** Efficiency-Aware Policy Optimization (EAPO) incentivizes efficient exploration. Scales to 2,048 interactions with dramatic performance gains (3.5% to 42.5%).
- **Relevance.** Directly addresses the context suffocation problem that limits research agents operating over many hours or days of interaction.

**Zhang et al. (2025) -- Memory as Action (MemAct)** (arXiv:2510.12635)

- **Key idea.** Treats working memory management as learnable policy actions (deletion, insertion). Joint optimization of information retention and task performance through end-to-end RL.
- **Mechanism.** Dynamic Context Policy Optimization enables a 14B-parameter model to match the accuracy of models 16x larger while reducing context length by 51%.
- **Relevance.** Shows that learned memory management can substitute for raw model scale -- a practical consideration for research teams with limited compute budgets.

**Yu et al. (2026) -- Agentic Memory (AgeMem)** (arXiv:2601.01885)

- **Key idea.** Unified framework integrating long-term and short-term memory management directly into the agent's policy. Memory operations exposed as tool-based actions (store, retrieve, update, summarize, discard).
- **Mechanism.** Three-stage progressive reinforcement learning with step-wise GRPO to handle sparse rewards from memory operations.

**MIA: Memory Intelligence Agent (2026)** (arXiv:2604.04503)

- **Key idea.** Manager-Planner-Executor architecture for deep research agents. Non-parametric Memory Manager stores compressed trajectories; parametric Planner produces search plans; Executor searches guided by those plans. Bidirectional conversion between parametric and non-parametric memories enables continuous evolution during test time.
- **Relevance.** Specifically designed for deep research agents, with demonstrated superiority across eleven benchmarks.

### 7.3 Benchmarking Long-Horizon Memory

**Zhao et al. (2026) -- AMA-Bench: Evaluating Long-Horizon Memory for Agentic Applications** (arXiv:2602.22769)

- **Key idea.** Existing benchmarks focus on dialogue-centric memory; real agent memory is a continuous stream of agent-environment interactions. AMA-Bench provides real-world agentic trajectories with expert-curated QA and synthetic trajectories scaling to arbitrary horizons.
- **Mechanism.** Proposes AMA-Agent with a causality graph and tool-augmented retrieval, achieving 57.22% average accuracy (11.16% above strongest baseline).

**Luo et al. (2025) -- UltraHorizon** (arXiv:2509.21766)

- **Key idea.** Benchmark with trajectories averaging 200k+ tokens and 400+ tool calls. LLM-agents consistently underperform humans, revealing eight error types attributed to in-context locking and fundamental capability gaps.
- **Relevance.** Sobering reality check: current agents still struggle with truly long-horizon tasks, underscoring the importance of continued memory research.

---

## 8. Synthesis: Memory Architecture for Autonomous Research

Drawing across the surveyed work, the memory requirements for autonomous research agents can be organized along four dimensions:

| Memory Type | Research Function | Key Systems |
|---|---|---|
| **Episodic** | Recall specific experimental outcomes, failed approaches, reviewer feedback | Park et al. (2304.03442), Pink et al. (2502.06975), AriGraph (2407.04363) |
| **Semantic** | Accumulated domain knowledge, concept relationships, literature synthesis | A-MEM (2502.12110), MAGMA (2601.03236), knowledge graphs |
| **Procedural** | Reusable workflows, experimental protocols, tool-use patterns | MACLA (2512.18950), Experience Compression Spectrum (2604.15877) |
| **Working** | Active context for current sub-task, intermediate reasoning state | Guo et al. (2312.17259), MemAct (2510.12635), AgeMem (2601.01885) |

For multi-agent coordination, the critical design choices are:

1. **Conversation vs. SOP enforcement**: AutoGen (2308.08155) allows free-form agent conversation; MetaGPT (2308.00352) enforces structured handoffs. Research tasks benefit from a hybrid: structured pipelines for well-understood stages, free-form discussion for creative hypothesis generation.
2. **Shared vs. isolated memory**: DAMCS (2502.05453) uses hierarchical knowledge graphs shared across agents; AgentSys (2602.07398) enforces process-level memory isolation for security. Research agents need shared episodic memory (what experiments were tried) but isolated working memory (each agent's current reasoning state).
3. **Compression vs. fidelity**: The Experience Compression Spectrum (2604.15877) reveals an inherent tradeoff. Early-stage research exploration needs high-fidelity episodic memory; mature findings should be compressed into reusable procedural knowledge and declarative rules.

---

## 9. Open Problems

1. **Continual consolidation**: No system yet supports the full sleep-like consolidation cycle where episodic memories are gradually absorbed into semantic knowledge (Liang et al., 2512.23343).
2. **Causally grounded retrieval**: Most retrieval remains similarity-based; AMA-Bench (2602.22769) shows that the absence of causal information is a primary failure mode.
3. **The missing diagonal**: No system adaptively moves knowledge across compression levels (2604.15877). A research agent should automatically promote a repeated experimental finding from episodic trace to procedural skill to declarative rule.
4. **Evaluation alignment**: Current benchmarks are saturated or misaligned with real agentic workloads (2602.19320). Research-specific benchmarks like Scientist-Bench (2505.18705) and CamylaBench (2604.10696) are emerging but remain narrow.
5. **Memory governance**: As agents accumulate knowledge over weeks-long research campaigns, semantic drift, contradiction accumulation, and privacy risks become non-trivial (SSGM framework, 2603.11768).

---

## References

| ID | Title | Year |
|---|---|---|
| 2304.03442 | Generative Agents: Interactive Simulacra of Human Behavior | 2023 |
| 2308.08155 | AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation | 2023 |
| 2308.00352 | MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework | 2023 |
| 2310.02172 | Lyfe Agents: Generative agents for low-cost real-time social interactions | 2023 |
| 2312.17259 | Empowering Working Memory for Large Language Model Agents | 2023 |
| 2407.04363 | AriGraph: Learning Knowledge Graph World Models with Episodic Memory | 2024 |
| 2411.18241 | LangGraph+CrewAI Multi-Agent Application | 2024 |
| 2412.05449 | Towards Effective GenAI Multi-Agent Collaboration | 2024 |
| 2502.05453 | DAMCS: Decentralized Adaptive Knowledge Graph Memory | 2025 |
| 2502.06975 | Episodic Memory is the Missing Piece for Long-Term LLM Agents | 2025 |
| 2502.12110 | A-MEM: Agentic Memory for LLM Agents | 2025 |
| 2503.21760 | MemInsight: Autonomous Memory Augmentation for LLM Agents | 2025 |
| 2505.18705 | AI-Researcher: Autonomous Scientific Innovation | 2025 |
| 2508.14111 | From AI for Science to Agentic Science | 2025 |
| 2509.21766 | UltraHorizon: Benchmarking Ultra Long-Horizon Scenarios | 2025 |
| 2509.23537 | Beyond the Strongest LLM: Multi-Turn Multi-Agent Orchestration | 2025 |
| 2510.08002 | MUSE: Learning on the Job for Long-Horizon Tasks | 2025 |
| 2510.12635 | Memory as Action (MemAct) | 2025 |
| 2511.07327 | IterResearch: Long-Horizon Agents with Interaction Scaling | 2025 |
| 2511.15755 | Multi-Agent LLM Orchestration for Deterministic Decision Support | 2025 |
| 2511.18423 | GAM: General Agentic Memory Via Deep Research | 2025 |
| 2512.06688 | PersonaMem-v2: Personalized Intelligence via Agentic Memory | 2025 |
| 2512.12856 | Forgetful but Faithful (FiFA): Privacy-Aware Generative Agents | 2025 |
| 2512.18950 | MACLA: Learning Hierarchical Procedural Memory | 2025 |
| 2512.23343 | AI Meets Brain: Memory Systems from Cognitive Neuroscience to Agents | 2025 |
| 2501.04227 | Agent Laboratory: Using LLM Agents as Research Assistants | 2025 |
| 2601.01885 | AgeMem: Unified Long-Term and Short-Term Memory Management | 2026 |
| 2601.02553 | SimpleMem: Efficient Lifelong Memory for LLM Agents | 2026 |
| 2601.03236 | MAGMA: Multi-Graph based Agentic Memory Architecture | 2026 |
| 2601.08160 | SwiftMem: Fast Agentic Memory via Query-aware Indexing | 2026 |
| 2601.08323 | AtomMem: Learnable Dynamic Agentic Memory | 2026 |
| 2601.21714 | E-mem: Multi-agent based Episodic Context Reconstruction | 2026 |
| 2601.23014 | Mem-T: Densifying Rewards for Long-Horizon Memory Agents | 2026 |
| 2602.03128 | MAFBench: Understanding Multi-Agent LLM Frameworks | 2026 |
| 2602.07398 | AgentSys: Secure Memory Management for LLM Agents | 2026 |
| 2602.13855 | From Fluent to Verifiable: Claim-Level Auditability for Deep Research | 2026 |
| 2602.19320 | Anatomy of Agentic Memory: Taxonomy and Empirical Analysis | 2026 |
| 2602.22406 | U-Mem: Towards Autonomous Memory Agents | 2026 |
| 2602.22769 | AMA-Bench: Evaluating Long-Horizon Memory | 2026 |
| 2603.00680 | MemPO: Self-Memory Policy Optimization | 2026 |
| 2603.03296 | PlugMem: Task-Agnostic Plugin Memory Module | 2026 |
| 2603.07670 | Memory for Autonomous LLM Agents: Mechanisms and Frontiers | 2026 |
| 2603.11768 | SSGM: Stability and Safety Governed Memory Framework | 2026 |
| 2603.14597 | D-MEM: Dopamine-Gated Agentic Memory | 2026 |
| 2604.01560 | DeltaMem: Agentic Memory Management via RL | 2026 |
| 2604.04503 | MIA: Memory Intelligence Agent | 2026 |
| 2604.08224 | Externalization in LLM Agents: Memory, Skills, Protocols | 2026 |
| 2604.10696 | Camyla: Scaling Autonomous Research | 2026 |
| 2604.15877 | Experience Compression Spectrum | 2026 |
