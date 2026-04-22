# Single-Agent Architectural Patterns for Autonomous Research (2022--2026)

*Literature survey for: AI Agent Architectures for Autonomous Research*
*Task T1: Core single-agent architectural patterns*
*Date: 2026-04-21*

---

## 1. Overview

This survey covers the foundational single-agent architectural patterns that underpin LLM-based autonomous agents, with emphasis on their applicability to autonomous research tasks. We trace the lineage from ReAct's interleaved reasoning-acting loop (2022) through tree-structured search, decoupled planning, verbal self-improvement, lifelong skill acquisition, and the latest self-evolving and full-pipeline research agents of 2025--2026.

The patterns are organized chronologically and by architectural principle. For each, we note the key idea, mechanism, strengths, limitations, and relevance to autonomous research.

---

## 2. Foundational Patterns (2022--2023)

### 2.1 ReAct: Synergizing Reasoning and Acting

**Paper:** Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models," 2022. arXiv:[2210.03629](https://arxiv.org/abs/2210.03629)

**Key idea:** Interleave chain-of-thought reasoning traces with task-specific actions in a single prompt, so that reasoning informs action selection and actions ground reasoning in real observations.

**How it works:** At each step the LLM generates a Thought (free-form reasoning), then an Action (e.g., API call, search query), then receives an Observation from the environment. The loop repeats until the task is solved or a maximum number of steps is reached. The full trajectory is kept in the context window.

**Strengths:**
- Simple, general-purpose, and easy to implement via prompting alone.
- Reduces hallucination compared to pure chain-of-thought by grounding in external observations.
- Produces human-interpretable reasoning traces, aiding auditability.
- Strong results on QA (HotpotQA), fact verification (FEVER), and interactive decision-making (ALFWorld, WebShop).

**Limitations:**
- Linear, greedy execution with no backtracking or exploration of alternatives.
- Context window fills quickly with accumulated thought-action-observation triples, leading to redundant token consumption.
- No persistent memory across episodes; each run starts fresh.
- Fragile under tool failures -- a single bad observation can derail the chain.

**Relevance to autonomous research:** ReAct is the de facto backbone of most research agents. Its thought-action-observation loop maps naturally onto the research cycle: formulate hypothesis (thought), run experiment or search literature (action), interpret result (observation). However, its linear, non-backtracking nature limits it for research tasks requiring exploration of multiple hypotheses. Nearly every subsequent pattern in this survey either extends or reacts against ReAct's design.

---

### 2.2 Reflexion: Language Agents with Verbal Reinforcement Learning

**Paper:** Shinn et al., "Reflexion: Language Agents with Verbal Reinforcement Learning," 2023. arXiv:[2303.11366](https://arxiv.org/abs/2303.11366)

**Key idea:** Replace weight updates with verbal self-reflection. After a failed attempt, the agent generates a natural-language critique of what went wrong and stores it in an episodic memory buffer, which is injected into subsequent trials to improve decisions.

**How it works:** The agent operates in a trial loop. After each episode, a feedback signal (scalar reward or free-form language) is provided. A self-reflection module generates textual analysis of failure causes. This reflection is appended to an episodic memory buffer that persists across trials. On the next attempt, the agent reads its prior reflections and adjusts its strategy accordingly.

**Strengths:**
- Achieves learning and self-improvement without any gradient-based training or fine-tuning.
- Flexible feedback: works with scalar rewards, binary success/fail, or rich language feedback.
- Achieved 91% pass@1 on HumanEval (coding), surpassing GPT-4's 80% at the time.
- Memory is interpretable -- you can read what the agent learned from each failure.

**Limitations:**
- Relies on a fixed context window for episodic memory; older reflections may be pushed out.
- Self-reflection quality depends heavily on the base model's introspective capability.
- No mechanism for generalizing reflections across different tasks -- learning is task-instance-specific.
- Risk of reinforcing incorrect self-diagnoses (the agent may misidentify failure causes).

**Relevance to autonomous research:** Reflexion directly models the iterative debugging cycle central to experimental research: run experiment, analyze failure, form corrective hypothesis, re-run. Its verbal memory is analogous to a lab notebook. The pattern is foundational for research agents that must learn from failed experiments without retraining.

---

### 2.3 Tree of Thoughts (ToT): Deliberate Problem Solving

**Paper:** Yao et al., "Tree of Thoughts: Deliberate Problem Solving with Large Language Models," 2023. arXiv:[2305.10601](https://arxiv.org/abs/2305.10601)

**Key idea:** Generalize chain-of-thought from a single linear sequence to a tree of reasoning paths. The LLM explores multiple candidate "thoughts" at each step, self-evaluates them, and uses search algorithms (BFS/DFS) to navigate the tree, including backtracking.

**How it works:** Each problem is decomposed into intermediate thought steps. At each node, the LLM generates multiple candidate next-thoughts. A self-evaluation function (also LLM-based) scores or votes on candidates. A tree search algorithm (BFS or DFS with pruning) selects which branches to expand. Backtracking is possible when a path is evaluated as unpromising.

**Strengths:**
- Dramatically improves performance on tasks requiring exploration and strategic lookahead (Game of 24: 4% with CoT vs. 74% with ToT using GPT-4).
- Enables global reasoning -- the agent can reconsider early decisions.
- Modular: the thought decomposition, generation, evaluation, and search components are independently configurable.

**Limitations:**
- Computationally expensive -- multiple LLM calls per step, multiplied across tree branches.
- Requires careful problem-specific design of thought decomposition and evaluation heuristics.
- Primarily demonstrated on well-structured puzzles; less clear how to apply to open-ended tasks.
- No integration with external tools or environments (purely internal reasoning).

**Relevance to autonomous research:** ToT models the branching nature of research exploration -- generating multiple hypotheses, evaluating their promise, and pruning dead ends. However, it operates purely on internal reasoning without tool use, so it is best understood as a reasoning backbone that needs to be combined with action capabilities (as LATS does).

---

### 2.4 ReWOO: Decoupling Reasoning from Observations

**Paper:** Xu et al., "ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models," 2023. arXiv:[2305.18323](https://arxiv.org/abs/2305.18323)

**Key idea:** Instead of interleaving reasoning and tool calls (as in ReAct), generate the full reasoning plan upfront before executing any tools. This eliminates redundant prompt tokens and allows the reasoning module to be distilled into a smaller model.

**How it works:** Three phases: (1) **Planner** -- the LLM generates a complete plan of all reasoning steps and tool calls needed, with placeholder variables for future tool outputs. (2) **Worker** -- tools are called in sequence to fill in the placeholders. (3) **Solver** -- the LLM synthesizes the collected evidence into a final answer. Crucially, the planner operates without seeing any tool outputs, producing the entire plan in one pass.

**Strengths:**
- Achieves 5x token efficiency over ReAct on HotpotQA while improving accuracy by 4%.
- Robust under tool failures -- since the plan is pre-generated, a failed tool call does not corrupt the reasoning chain.
- Enables distillation: the planning capability from GPT-3.5 (175B) was successfully transferred to LLaMA (7B).
- Clean separation of concerns between parametric reasoning and non-parametric tool use.

**Limitations:**
- The plan is generated without any observations, so it cannot adapt to unexpected intermediate results.
- Works best for tasks where the required information-gathering steps can be anticipated upfront.
- Poorly suited for exploratory tasks where the next step depends on what was just discovered.

**Relevance to autonomous research:** ReWOO is well suited for structured research tasks (e.g., "collect data from these 5 sources, then synthesize") but poorly suited for open-ended exploration where findings at each step change the direction of inquiry. Its efficiency gains are valuable when running many parallel research queries. The plan-then-execute paradigm it introduces has become a major architectural theme (see Section 3).

---

### 2.5 Voyager: Open-Ended Embodied Lifelong Learning

**Paper:** Wang et al., "Voyager: An Open-Ended Embodied Agent with Large Language Models," 2023. arXiv:[2305.16291](https://arxiv.org/abs/2305.16291)

**Key idea:** Build an LLM-powered agent that continuously explores, acquires skills, and accumulates a reusable code library -- enabling lifelong learning without parameter updates in an open-ended environment (Minecraft).

**How it works:** Three components: (1) **Automatic Curriculum** -- an LLM-generated progression of tasks that maximizes exploration. (2) **Skill Library** -- executable code programs (skills) are stored and indexed by description; new tasks first check if a relevant skill already exists. (3) **Iterative Prompting** -- environment feedback, execution errors, and self-verification are fed back to iteratively refine programs until they work.

**Strengths:**
- First demonstration of LLM-based lifelong learning in an open-ended environment.
- Skills are temporally extended, interpretable, and compositional -- compounding capability over time.
- Obtains 3.3x more unique items and unlocks milestones up to 15.3x faster than prior SOTA.
- Skill library transfers to new worlds -- the agent can solve novel tasks from scratch using its accumulated library.
- No fine-tuning required; operates entirely through GPT-4 black-box queries.

**Limitations:**
- Minecraft-specific; the automatic curriculum and skill verification are tightly coupled to the game's API.
- Skill library grows without curation; no mechanism for forgetting or consolidating skills.
- Relies on an environment with programmatic feedback (execution errors, game state); harder to apply where feedback is ambiguous.

**Relevance to autonomous research:** Voyager's architecture is a template for research agents that must accumulate methodological knowledge over time. The skill library maps onto a library of reusable research procedures (data-cleaning scripts, analysis pipelines, plotting routines). The automatic curriculum maps onto a research agenda generator. The key insight -- that agents should build and reuse a growing library of capabilities rather than solving each problem from scratch -- is directly applicable to building autonomous research systems.

---

### 2.6 LATS: Language Agent Tree Search

**Paper:** Zhou et al., "Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models," 2023. arXiv:[2310.04406](https://arxiv.org/abs/2310.04406)

**Key idea:** Unify reasoning, acting, and planning by embedding Monte Carlo Tree Search (MCTS) into the LLM agent loop, using the LLM itself as both the policy (action proposer) and value function (state evaluator), with self-reflection for learning from failed trajectories.

**How it works:** The search tree is built over action sequences, not just thoughts (unlike ToT). At each node: (1) the LLM generates multiple candidate actions, (2) an LLM-based value function evaluates the resulting states, (3) MCTS (with UCT selection) balances exploration and exploitation, (4) environment feedback provides external grounding, and (5) failed trajectories trigger self-reflection that updates future evaluations.

**Strengths:**
- Achieves SOTA pass@1 on HumanEval (92.7% with GPT-4) for code generation.
- Gradient-free: competitive with fine-tuned methods on WebShop (score 75.9 with GPT-3.5).
- Generalizes across diverse domains: programming, QA, web navigation, math.
- Principled exploration through MCTS avoids the greedy limitations of ReAct.

**Limitations:**
- Very high computational cost -- MCTS requires many LLM evaluations per decision.
- Requires an environment that can be "rolled back" or provides consistent re-evaluation, which is not always available.
- The LLM-based value function may be miscalibrated, leading MCTS astray.
- Latency is high, making it unsuitable for real-time applications.

**Relevance to autonomous research:** LATS is the most principled approach to combining reasoning with systematic exploration. For research, this maps to: generate multiple experimental approaches, evaluate their promise, systematically explore the most promising while learning from dead ends. Its main barrier for research use is cost -- but for high-stakes research decisions, the thoroughness may be justified.

---

## 3. Emerging Architectural Themes (2025--2026)

### 3.1 Plan-then-Execute and Dual-Agent Architectures

The clean separation of planning from execution, first introduced by ReWOO (2023), has become a dominant paradigm by 2025--2026. Multiple papers formalize this as a distinct architectural pattern, often with two separate agents or modules.

**Key papers:**
- Del Rosario et al., "Architecting Resilient LLM Agents: A Guide to Secure Plan-then-Execute Implementations," 2025. arXiv:[2509.08646](https://arxiv.org/abs/2509.08646)
- GeoAgentBench introduces "Plan-and-React" -- decoupling global orchestration from step-wise reactive execution (2026, arXiv:[2604.13888](https://arxiv.org/abs/2604.13888))
- Bui, "Building Effective AI Coding Agents for the Terminal: OPENDEV," 2026. arXiv:[2603.05344](https://arxiv.org/abs/2603.05344)

**How it works:** A Planner agent generates a high-level plan (often as a DAG of subtasks). An Executor agent carries out each subtask, with optional re-planning if execution deviates from expectations. The planner and executor may use different models optimized for their respective roles.

**Advantages over ReAct:** Greater predictability, security (control-flow integrity against prompt injection), cost efficiency (smaller executor model), and cleaner error recovery. Del Rosario et al. explicitly argue P-t-E provides "inherent resilience to indirect prompt injection attacks."

**Relevance to autonomous research:** Research naturally decomposes into planning ("what experiments to run, in what order") and execution ("run the experiment, collect results"). Dual-agent architectures mirror how human research teams work -- a PI plans, a student executes -- and enable using more powerful (expensive) models for planning and cheaper models for routine execution.

---

### 3.2 Self-Evolving Agent Architectures

A major 2025--2026 trend is agents that improve their own capabilities through experience, without retraining the base model.

**Key papers:**
- Zhu et al., "EvoMaster: A Foundational Agent Framework for Building Evolving Autonomous Scientific Agents at Scale," 2026. arXiv:[2604.17406](https://arxiv.org/abs/2604.17406)
- Liang et al., "GenericAgent: A Token-Efficient Self-Evolving LLM Agent via Contextual Information Density Maximization," 2026. arXiv:[2604.17091](https://arxiv.org/abs/2604.17091)
- Zhang et al., "Training LLM Agents for Spontaneous, Reward-Free Self-Evolution via World Knowledge Exploration," 2026. arXiv:[2604.18131](https://arxiv.org/abs/2604.18131)
- Dong et al., "Agent-World: Scaling Real-World Environment Synthesis for Evolving General Agent Intelligence," 2026. arXiv:[2604.18292](https://arxiv.org/abs/2604.18292)

**Key idea:** The agent accumulates experience (successful trajectories, discovered procedures, environment knowledge) and distills it into reusable artifacts -- standard operating procedures, code libraries, or updated harness prompts -- that improve future performance without weight updates.

**EvoMaster** specifically targets scientific agents: it implements continuous self-evolution where agents iteratively refine hypotheses, self-critique, and accumulate knowledge across experimental cycles. Evaluated across Humanity's Last Exam, MLE-Bench Lite, BrowseComp, and FrontierScience, it achieves SOTA scores (41.1%, 75.8%, 73.3%, 53.3% respectively), with +159% to +316% improvement over general-purpose baselines.

**GenericAgent** contributes the principle of *contextual information density maximization* -- rather than expanding context windows, maintaining the highest density of decision-relevant information within a fixed budget. It uses hierarchical on-demand memory and self-evolution that turns verified trajectories into reusable SOPs and executable code.

**Relevance to autonomous research:** Self-evolution is arguably the most important capability for research agents, as research inherently requires learning from experience. These architectures directly implement the scientific learning loop: hypothesize, experiment, learn, improve methodology.

---

### 3.3 MCTS-Embedded Cognitive Architectures (SPIRAL)

**Paper:** Zhang et al., "SPIRAL: Symbolic LLM Planning via Grounded and Reflective Search," 2025. arXiv:[2512.23167](https://arxiv.org/abs/2512.23167)

**Key idea:** Embed a three-agent cognitive architecture (Planner, Simulator, Critic) into an MCTS loop. The Simulator grounds search by predicting realistic outcomes, and the Critic provides dense reward through reflection, transforming MCTS from brute-force search into guided, self-correcting reasoning.

**How it works:** Within each MCTS node expansion: (1) a Planner agent proposes creative next steps, (2) a Simulator agent predicts realistic outcomes of those steps (grounding), (3) a Critic agent evaluates proposals via reflection and provides dense reward signals. This replaces the sparse environmental rewards that limit standard MCTS.

**Strengths:** Achieves 83.6% accuracy on DailyLifeAPIs (16+ points above next-best search framework) with superior token efficiency. Outperforms both standard LATS and chain-of-thought planning.

**Relevance to autonomous research:** SPIRAL addresses a key limitation of LATS for research -- the sparsity of feedback. In research, you often cannot get clear success/failure signals at each step. By using a Simulator to predict outcomes and a Critic to provide dense evaluation, SPIRAL enables principled exploration even when environmental feedback is delayed or ambiguous.

---

### 3.4 Full-Pipeline Autonomous Research Agents

The most research-relevant development of 2024--2026 is the emergence of end-to-end autonomous research agents that execute the entire scientific workflow.

**Key papers:**
- Lu et al., "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery," 2024. arXiv:[2408.06292](https://arxiv.org/abs/2408.06292)
- Yu et al., "AlphaResearch: Accelerating New Algorithm Discovery with Language Models," 2025. arXiv:[2511.08522](https://arxiv.org/abs/2511.08522)
- Kulkarni, "Algorithmist I: Promise of Provable Algorithm Synthesis at Scale," 2026. arXiv:[2603.22363](https://arxiv.org/abs/2603.22363)
- Li et al., "AutoSOTA: An End-to-End Automated Research System for SOTA AI Model Discovery," 2026. arXiv:[2604.05550](https://arxiv.org/abs/2604.05550)

**The AI Scientist** was the first comprehensive framework: it generates ideas, writes code, runs experiments, visualizes results, writes full papers, and runs simulated peer review -- all at under $15 per paper. Applied to diffusion modeling, transformer LM, and learning dynamics.

**AlphaResearch** introduces a dual-environment approach combining execution-based verifiable rewards with simulated peer review for idea evaluation. It discovered the best-known solution to the "packing circles" problem, surpassing human researchers.

**Algorithmist** emphasizes proof-first synthesis: a multi-agent research-and-review loop generates provably sound algorithms with research-style writeups. It discovered improved algorithms and even found a proof bug in prior published work.

**AutoSOTA** employs 8 specialized agents across three stages (resource preparation, experiment evaluation, reflection/ideation) and discovered 105 new SOTA models across 8 top-tier AI conferences, averaging ~5 hours per paper.

**Common architectural elements:** All use multi-stage pipelines with specialized roles (ideation, implementation, execution, evaluation, writing). All incorporate some form of iterative refinement. All separate idea generation from verification.

**Limitations identified:** Gupta & Pruthi ([2502.16487](https://arxiv.org/abs/2502.16487)) found 24% of AI-generated research documents are "smartly plagiarized" from existing work without attribution. Luo et al. ([2509.08713](https://arxiv.org/abs/2509.08713)) identified four failure modes in AI scientist systems: inappropriate benchmark selection, data leakage, metric misuse, and post-hoc selection bias.

---

### 3.5 Agentic RAG as Autonomous Reasoning Architecture

**Paper:** Mishra et al., "SoK: Agentic RAG: Taxonomy, Architectures, Evaluation, and Research Directions," 2026. arXiv:[2603.07379](https://arxiv.org/abs/2603.07379)

**Key idea:** Formalize agentic retrieval-generation loops as finite-horizon partially observable Markov decision processes (POMDPs), explicitly modeling control policies and state transitions for autonomous retrieval, reasoning, and action.

**How it works:** The agent autonomously coordinates multi-step reasoning, dynamic memory management, and iterative retrieval strategies. The SoK paper identifies planning mechanisms, retrieval orchestration, memory paradigms, and tool-invocation behaviors as the key architectural axes.

**Risks identified:** Compounding hallucination propagation, memory poisoning, retrieval misalignment, and cascading tool-execution vulnerabilities.

**Relevance to autonomous research:** Literature search and synthesis is a core research activity. Agentic RAG architectures formalize how an agent should iteratively search, retrieve, evaluate, and synthesize information -- precisely the workflow needed for literature reviews and evidence gathering.

---

### 3.6 Workflow Optimization and Computation Graphs

**Paper:** Yue et al., "From Static Templates to Dynamic Runtime Graphs: A Survey of Workflow Optimization for LLM Agents," 2026. arXiv:[2603.22386](https://arxiv.org/abs/2603.22386)

**Key idea:** Treat agent workflows as *agentic computation graphs* (ACGs) and optimize their structure. Distinguishes static methods (fixed scaffold before deployment) from dynamic methods (structure generated or revised per run).

**How it works:** Organizes optimization along three dimensions: when structure is determined, what is optimized, and which evaluation signals guide optimization (task metrics, verifier signals, preferences, trace-derived feedback). Surveys 70+ systems.

**Relevance to autonomous research:** Research workflows are inherently dynamic -- the next experiment depends on prior results. This framework provides vocabulary for designing research agent architectures that adapt their execution graphs to findings in real time, rather than following a rigid pipeline.

---

## 4. Comparative Summary

| Pattern | Year | Core Mechanism | Exploration | Memory | Tool Use | Research Fit |
|---------|------|---------------|-------------|--------|----------|-------------|
| ReAct | 2022 | Thought-Action-Obs loop | None (greedy) | Context only | Yes | Backbone |
| Reflexion | 2023 | Verbal self-reflection | Trial-and-error | Episodic buffer | Yes | Debugging loop |
| ToT | 2023 | Tree search over thoughts | BFS/DFS | None | No | Hypothesis branching |
| ReWOO | 2023 | Plan-then-execute | None | None | Yes | Structured queries |
| Voyager | 2023 | Curriculum + skill library | Automatic curriculum | Skill library | Yes (code) | Lifelong methods |
| LATS | 2023 | MCTS + LLM value function | MCTS (principled) | Self-reflection | Yes | Systematic search |
| SPIRAL | 2025 | MCTS + Planner/Simulator/Critic | Guided MCTS | Reflection | Yes | Dense-feedback search |
| P-t-E/Dual-Agent | 2025 | Separate planner + executor | Plan-level | Plan state | Yes | PI-student model |
| Self-Evolving | 2026 | Experience distillation | Autonomous | SOPs, code, knowledge | Yes | Scientific method |
| AI Scientist | 2024 | Full pipeline multi-agent | Iterative refinement | Per-paper context | Yes | End-to-end research |

---

## 5. Synthesis: Toward Architectures for Autonomous Research

The trajectory from 2022 to 2026 reveals a clear progression:

1. **Grounding reasoning in action** (ReAct) -- establishing that LLMs can interleave thinking with tool use.

2. **Adding exploration** (ToT, LATS) -- moving from greedy single-path reasoning to systematic search over multiple strategies.

3. **Adding learning from failure** (Reflexion) -- enabling agents to improve across episodes through verbal self-critique.

4. **Decoupling planning from execution** (ReWOO, Plan-then-Execute) -- for efficiency, security, and modularity.

5. **Accumulating reusable capabilities** (Voyager, self-evolving agents) -- building a growing library of methods and knowledge.

6. **Composing full research pipelines** (AI Scientist, AutoSOTA, EvoMaster) -- orchestrating multiple specialized capabilities into end-to-end research workflows.

For autonomous research specifically, the ideal architecture likely combines: a Plan-then-Execute backbone for structured workflow management, MCTS-style exploration for hypothesis search, Reflexion-style learning for iterative experimental refinement, Voyager-style skill accumulation for methodological growth, and self-evolving harness updates for long-term improvement. The major open challenges remain: reliable self-evaluation (avoiding reinforcing errors), efficient exploration under computational constraints, and maintaining scientific integrity (avoiding plagiarism and benchmark gaming).

---

## References

1. Yao et al. (2022). "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv:2210.03629
2. Shinn et al. (2023). "Reflexion: Language Agents with Verbal Reinforcement Learning." arXiv:2303.11366
3. Yao et al. (2023). "Tree of Thoughts: Deliberate Problem Solving with Large Language Models." arXiv:2305.10601
4. Xu et al. (2023). "ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models." arXiv:2305.18323
5. Wang et al. (2023). "Voyager: An Open-Ended Embodied Agent with Large Language Models." arXiv:2305.16291
6. Zhou et al. (2023). "Language Agent Tree Search Unifies Reasoning, Acting and Planning in Language Models." arXiv:2310.04406
7. Lu et al. (2024). "The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery." arXiv:2408.06292
8. Zhang et al. (2025). "SPIRAL: Symbolic LLM Planning via Grounded and Reflective Search." arXiv:2512.23167
9. Del Rosario et al. (2025). "Architecting Resilient LLM Agents: A Guide to Secure Plan-then-Execute Implementations." arXiv:2509.08646
10. Yu et al. (2025). "AlphaResearch: Accelerating New Algorithm Discovery with Language Models." arXiv:2511.08522
11. Zhu et al. (2026). "EvoMaster: A Foundational Agent Framework for Building Evolving Autonomous Scientific Agents at Scale." arXiv:2604.17406
12. Liang et al. (2026). "GenericAgent: A Token-Efficient Self-Evolving LLM Agent via Contextual Information Density Maximization." arXiv:2604.17091
13. Zhang et al. (2026). "Training LLM Agents for Spontaneous, Reward-Free Self-Evolution via World Knowledge Exploration." arXiv:2604.18131
14. Dong et al. (2026). "Agent-World: Scaling Real-World Environment Synthesis for Evolving General Agent Intelligence." arXiv:2604.18292
15. Kulkarni (2026). "Algorithmist I: Promise of Provable Algorithm Synthesis at Scale." arXiv:2603.22363
16. Li et al. (2026). "AutoSOTA: An End-to-End Automated Research System for SOTA AI Model Discovery." arXiv:2604.05550
17. Mishra et al. (2026). "SoK: Agentic RAG: Taxonomy, Architectures, Evaluation, and Research Directions." arXiv:2603.07379
18. Yue et al. (2026). "From Static Templates to Dynamic Runtime Graphs: A Survey of Workflow Optimization for LLM Agents." arXiv:2603.22386
19. Bui (2026). "Building Effective AI Coding Agents for the Terminal: OPENDEV." arXiv:2603.05344
20. GeoAgentBench (2026). arXiv:2604.13888
21. Gupta & Pruthi (2025). "All That Glitters is Not Novel: Plagiarism in AI Generated Research." arXiv:2502.16487
22. Luo et al. (2025). "The More You Automate, the Less You See: Hidden Pitfalls of AI Scientist Systems." arXiv:2509.08713
23. Huang et al. (2025). "Idea2Plan: Exploring AI-Powered Research Planning." arXiv:2510.24891
24. Shen et al. (2026). "An Empirical Study of Multi-Agent Collaboration for Automated Research." arXiv:2603.29632
