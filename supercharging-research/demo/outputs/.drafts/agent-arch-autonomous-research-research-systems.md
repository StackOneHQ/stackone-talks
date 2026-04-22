# AI Agent Architectures for Autonomous Research: Systems Survey (2023--2026)

**Task:** T4 -- Survey of systems specifically designed for autonomous research  
**Date:** 2026-04-21  
**Scope:** End-to-end autonomous research systems, benchmarks, code-based research agents, knowledge-management approaches, and the remaining gap to full autonomy

---

## 1. End-to-End Autonomous Research Systems

### 1.1 The AI Scientist (Sakana AI) -- v1 and v2

**What it does.** The first comprehensive framework for fully automatic scientific discovery. Given a research area, it generates novel ideas, writes code, executes experiments, visualizes results, writes a full scientific paper, and runs a simulated peer review -- all without human intervention. Cost: ~$15 per paper.

**Architecture.** v1 (Aug 2024) relied on human-authored code templates as scaffolding and was limited to three ML subfields (diffusion modeling, transformer LMs, learning dynamics). v2 (Apr 2025) eliminates template dependence via a progressive agentic tree-search methodology managed by a dedicated experiment manager agent. A Vision-Language Model feedback loop iteratively refines figures and content. An automated reviewer component evaluates generated manuscripts.

**Results and limitations.**
- v2 submitted three fully autonomous manuscripts to an ICLR 2025 workshop. One paper ("Compositional Regularization: Unexpected Obstacles in Enhancing Neural Network Generalization") received reviewer scores of 6, 7, 6 (avg 6.33), exceeding the acceptance threshold -- the first fully AI-generated paper to pass peer review, though workshop organizers ultimately planned to withdraw it due to unresolved policy questions about AI-authored publications.
- An independent evaluation (arXiv:2502.14297) found that 24% of AI Scientist-generated documents were paraphrased or significantly borrowed from existing work, and automated plagiarism detectors failed to catch these cases.
- A position paper (arXiv:2506.01372) argues the fundamental bottleneck is implementation capability: AI Scientists can ideate but struggle to execute rigorous verification procedures.

**How close to autonomous research:** Covers the full pipeline but quality is inconsistent. Strong at incremental ML experiments; weak at genuinely novel science and rigorous experimental verification.

**Citations:**
- v1: arXiv:2408.06292 -- https://arxiv.org/abs/2408.06292
- v2: arXiv:2504.08066 -- https://arxiv.org/abs/2504.08066
- Plagiarism study: arXiv:2502.16487 -- https://arxiv.org/abs/2502.16487
- Implementation gap: arXiv:2506.01372 -- https://arxiv.org/abs/2506.01372
- GitHub: https://github.com/SakanaAI/AI-Scientist

---

### 1.2 Agent Laboratory

**What it does.** An autonomous LLM-based framework that accepts a human-provided research idea and progresses through three stages -- literature review, experimentation, and report writing -- producing a code repository and research report. Users can provide feedback at each stage (human-in-the-loop optional).

**Architecture.** Multi-stage pipeline with specialized sub-agents for each phase. Supports multiple backend LLMs. Human feedback integration points between stages.

**Results and limitations.**
- o1-preview generates the best research outcomes among tested models.
- Generated ML code achieved state-of-the-art performance on some tasks.
- Human involvement significantly improves output quality.
- 84% cost reduction compared to prior autonomous research methods.

**How close to autonomous research:** Effective as a research assistant rather than an autonomous researcher. Human feedback is critical for quality.

**Citations:**
- arXiv:2501.04227 -- https://arxiv.org/abs/2501.04227

---

### 1.3 AI-Researcher

**What it does.** A fully autonomous research system that orchestrates the complete pipeline -- literature review, hypothesis generation, algorithm implementation, and publication-ready manuscript preparation -- with minimal human intervention.

**Architecture.** Multi-agent pipeline. Includes Scientist-Bench, a benchmark of state-of-the-art papers across diverse AI domains featuring both guided innovation and open-ended exploration tasks.

**Results and limitations.**
- Achieves "remarkable implementation success rates" and produces papers that "approach human-level quality" on their benchmark.
- Limited to AI/ML domain tasks where evaluation is automated.

**Citations:**
- arXiv:2505.18705 -- https://arxiv.org/abs/2505.18705

---

### 1.4 Camyla -- Autonomous Research in Medical Image Segmentation (2026)

**What it does.** Transforms raw datasets into literature-grounded research proposals, executable experiments, and complete manuscripts for medical image segmentation, without human intervention.

**Architecture.** Three coupled mechanisms: (1) Quality-Weighted Branch Exploration for allocating effort across competing proposals; (2) Layered Reflective Memory for retaining and compressing cross-trial knowledge at multiple granularities; (3) Divergent Diagnostic Feedback for diversifying recovery after underperforming trials.

**Results and limitations.**
- Evaluated on CamylaBench (31 contamination-free datasets from 2025 publications), strict zero-intervention protocol, 28 days on an 8-GPU cluster.
- Generated 2,700+ novel model implementations and 40 complete manuscripts.
- Surpassed strongest per-dataset baseline (including nnU-Net) on 24/31 datasets.
- Senior human reviewers scored manuscripts at T1/T2 boundary of medical imaging journals.

**How close to autonomous research:** The most convincing domain-specific autonomous research system to date. Demonstrates that domain-scale autonomy is achievable when the problem space is well-defined with automated evaluation.

**Citations:**
- arXiv:2604.10696 -- https://arxiv.org/abs/2604.10696

---

### 1.5 EvoScientist -- Evolving Multi-Agent AI Scientists (2026)

**What it does.** An evolving multi-agent framework that continuously improves research strategies through persistent memory and self-evolution.

**Architecture.** Three agents: Researcher Agent (idea generation), Engineer Agent (experiment execution), Evolution Manager Agent (distilling insights into reusable knowledge). Two persistent memory modules: ideation memory (feasible directions + failed directions) and experimentation memory (effective strategies from code search trajectories).

**Results and limitations.**
- Outperforms 7 open-source and commercial state-of-the-art systems on idea generation (novelty, feasibility, relevance, clarity).
- Substantially improves code execution success rates through multi-agent evolution.

**How close to autonomous research:** Addresses the key problem of learning from experience. Memory-augmented evolution represents a meaningful step toward genuine research capability.

**Citations:**
- arXiv:2603.08127 -- https://arxiv.org/abs/2603.08127

---

### 1.6 ResearchEVO -- Discover-then-Explain (2026)

**What it does.** An end-to-end framework that computationally instantiates a two-stage scientific paradigm: (1) Evolution Phase -- LLM-guided bi-dimensional co-evolution searching code implementations purely by fitness; (2) Writing Phase -- takes the best algorithm and produces a publication-ready paper via sentence-level RAG with anti-hallucination verification.

**Results and limitations.**
- Validated on quantum error correction (using real Google quantum hardware data) and physics-informed neural networks.
- Discovered human-interpretable algorithmic mechanisms not previously proposed.
- Writing Phase produced compilable LaTeX manuscripts with zero fabricated citations.
- First system to jointly perform principled algorithm evolution and literature-grounded documentation.

**Citations:**
- arXiv:2604.05587 -- https://arxiv.org/abs/2604.05587

---

## 2. Evolutionary / Algorithmic Discovery Agents

### 2.1 AlphaEvolve (Google DeepMind, 2025)

**What it does.** An evolutionary coding agent that pairs Gemini models with automated evaluators in an evolutionary framework to discover and optimize algorithms.

**Architecture.** Ensemble of LLMs: Gemini Flash for breadth of exploration, Gemini Pro for depth of insight. Evolutionary pipeline: propose code changes, evaluate via automated evaluators, select and iterate. Unlike its predecessor FunSearch (which discovered single functions), AlphaEvolve evolves entire codebases and produces programs hundreds of lines long.

**Results and limitations.**
- Found a procedure to multiply 4x4 complex-valued matrices using 48 scalar multiplications -- first improvement over Strassen's algorithm in this setting after 56 years.
- Improved scheduling algorithms for Google data centers, reclaiming 0.7% of stranded compute capacity fleet-wide.
- Produced simplified circuit designs for hardware accelerators.
- Applied by Tao, Georgiev et al. to 67 mathematical problems, rediscovering best-known solutions in most and improving several.
- Limitation: requires well-defined evaluation functions; cannot handle open-ended research where success metrics are ambiguous.

**How close to autonomous research:** Exceptional at closed-form optimization and algorithm discovery. Not a general research agent -- requires human-defined fitness functions and problem framing.

**Citations:**
- AlphaEvolve: arXiv:2506.13131 -- https://arxiv.org/abs/2506.13131
- Mathematical exploration: arXiv:2511.02864 -- https://arxiv.org/abs/2511.02864
- DeepEvolve (integration with deep research): arXiv:2510.06056 -- https://arxiv.org/abs/2510.06056
- Blog: https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/

---

### 2.2 AlphaResearch

**What it does.** An autonomous research agent that discovers new algorithms on open-ended problems by iteratively proposing ideas, programming verification, and optimizing proposals.

**Architecture.** Dual environment combining execution-based verifiable reward and reward from a simulated real-world peer review environment.

**Results and limitations.**
- Achieved best-of-known performance on the "packing circles" problem, surpassing human researchers and AlphaEvolve.
- Outperformed other agentic discovery systems on 6 of 8 open-ended algorithmic problems.

**Citations:**
- arXiv:2511.08522 -- https://arxiv.org/abs/2511.08522

---

### 2.3 Algorithmist I (2026)

**What it does.** An autonomous researcher agent built on GitHub Copilot that runs a multi-agent research-and-review loop for provable algorithm synthesis.

**Architecture.** Separate stages for idea generation, algorithm and proof development, proof-guided implementation, and review of proofs/code alignment.

**Results and limitations.**
- On private data analysis and clustering tasks, produced provably sound and empirically effective algorithms with research-style writeups.
- Found improved algorithms in some settings, explained principled barriers in others.
- Uncovered a subtle proof bug in prior published work.

**How close to autonomous research:** Demonstrates a proof-first code-synthesis paradigm where correctness guarantees are architectural.

**Citations:**
- arXiv:2603.22363 -- https://arxiv.org/abs/2603.22363

---

## 3. Karpathy's AutoResearch Pattern (2026)

**What it does.** An agentic research framework where an AI agent -- powered by an external LLM -- takes a research question, designs experiments, writes code, executes them on a GPU, analyzes results, forms conclusions, and designs follow-up experiments.

**Architecture.** Deliberately minimal: one GPU, one file (train.py), one metric. A high-level prompt in a Markdown file (program.md) defines the research direction. The AI agent autonomously edits the training script. Training always runs for exactly 5 minutes, yielding ~12 experiments/hour, ~100 experiments overnight. Hill-climbing: keep improvements, discard regressions.

**Results and limitations.**
- Released March 7, 2026; 21,000+ GitHub stars, 8.6M views on announcement.
- Over two days, ran ~700 experiments and found ~20 genuine improvements.
- Philosophically positioned as the progression: vibe coding -> agentic engineering -> fully independent research.
- Limitation: purely empirical optimization. No literature review, no hypothesis generation, no paper writing. The "research" is limited to trying code variations and keeping what works.

**How close to autonomous research:** A powerful experiment-running loop, but covers only one slice of research. No synthesis, no writing, no knowledge integration.

**Sources:**
- GitHub: https://github.com/karpathy/autoresearch
- DataCamp guide: https://www.datacamp.com/tutorial/guide-to-autoresearch
- VentureBeat: https://venturebeat.com/technology/andrej-karpathys-new-open-source-autoresearch-lets-you-run-hundreds-of-ai

---

## 4. "Deep Research" Agents (Report-Generation Paradigm)

### 4.1 OpenAI Deep Research

**What it does.** An agentic capability in ChatGPT that independently browses the web for 5--30 minutes, searching, interpreting, and analyzing massive amounts of text, images, and PDFs to compile structured reports with citations.

**Architecture.** Originally powered by a specialized o3 model optimized for web browsing and data analysis; as of Feb 2026, uses a GPT-5.2-based model. Supports MCP connections and domain-restricted search.

**Results and limitations.**
- Analyst-grade report generation across diverse domains.
- As of Feb 2026, can connect to MCP servers and restrict searches to trusted sites.
- Part of OpenAI's roadmap toward intern-level research assistant (Sept 2026 target) and fully automated researcher (2028 target).
- Limitation: generates reports, not experiments. No code execution, no hypothesis testing.

**Sources:**
- https://openai.com/index/introducing-deep-research/

---

### 4.2 Deep Research Ecosystem (2025--2026 Survey)

A comprehensive survey (arXiv:2508.12752) systematizes the deep research pipeline into four stages: planning, question developing, web exploration, and report generation. The landscape has exploded:

| System | Key Innovation | Citation |
|--------|---------------|----------|
| Marco DeepResearch | Verification-centric design at QA, trajectory, and inference levels | arXiv:2603.28376 |
| Mind2Report | Cognitive deep research agent emulating commercial analysts with dynamic memory | arXiv:2601.04879 |
| OffSeeker | Shows expensive online RL is not necessary -- offline training competitive at 8B params | arXiv:2601.18467 |
| InfiAgent | File-centric state externalization for unbounded context; 80-paper lit review task | arXiv:2601.03204 |
| AgentIR | Reasoning-aware retrieval exploiting agent reasoning traces alongside queries | arXiv:2603.04384 |

**Benchmarks for deep research agents:**
- DeepResearch-9K: 9000 questions, three difficulty levels, verifiable answers (arXiv:2603.01152)
- DeepResearch Bench: 100 PhD-level research tasks across 22 fields (arXiv:2506.11763)
- TaxoBench: 72 surveys, 3,815 papers, evaluates retrieval + hierarchical organization (arXiv:2601.12369)
- FINDER: 100 human-curated tasks with 419 structured checklist items (arXiv:2512.01948)
- SurveyLens: First discipline-aware ASG benchmark, 1,000 surveys, 10 disciplines (arXiv:2602.11238)

**Key finding from TaxoBench:** The best deep research agent retrieves only 20.92% of expert-cited papers, and even with perfect input, the best model achieves only 31.24% ARI with substantial structural gaps. This quantifies the gap between current agents and expert-level research.

**Key finding from FINDER:** Current DRAs "struggle not with task comprehension but with evidence integration, verification, and reasoning-resilient planning."

---

## 5. Benchmarks for Research Agent Capability

### 5.1 MLAgentBench (Stanford, 2023)

**What it does.** A suite of 13 ML experimentation tasks where an agent reads/writes files, executes code, and inspects outputs to improve model performance.

**Results:** Claude v3 Opus achieved best success rate at 37.5%. Performance ranged from 100% on established datasets to 0% on recent Kaggle challenges. Key challenges: long-term planning, hallucination reduction.

**Citations:** arXiv:2310.03302 -- https://arxiv.org/abs/2310.03302

### 5.2 MLE-bench (OpenAI, 2024) and MLGym (Meta, 2025)

**MLE-bench:** 75 Kaggle ML engineering competitions. AIDE agent achieved SOTA with 47.7% Kaggle medal success rate via MCTS search.

**MLGym:** 13 open-ended AI research tasks. First Gym environment for ML tasks enabling RL training of research agents. Key finding: frontier models can improve hyperparameters but do not generate novel hypotheses, algorithms, or architectures.

**Citations:**
- MLE-bench: arXiv:2410.07095 -- https://arxiv.org/abs/2410.07095
- MLE-bench agents: arXiv:2507.02554 -- https://arxiv.org/abs/2507.02554
- MLGym: arXiv:2502.14499 -- https://arxiv.org/abs/2502.14499
- AIDE: arXiv:2502.13138 -- https://arxiv.org/abs/2502.13138

### 5.3 SWE-bench Family

**Original SWE-bench (2023):** 2,294 real GitHub issues across 12 Python repos. Initial best: Claude 2 at 1.96%.

**SWE-agent (2024):** Custom agent-computer interface achieving 12.5% on SWE-bench with GPT-4.

**Current state (2026):** Claude 4 Sonnet achieves SOTA on both Lite and Verified leaderboards. However, contamination concerns are serious -- models perform 3x better on SWE-Bench-Verified vs. newer benchmarks, suggesting training data overlap.

**SWE-bench variants:**
- SWE-bench-Live: 1,319 tasks from 2024+ issues, 93 repos, live-updatable (arXiv:2505.23419)
- SWE-bench Pro: 1,865 enterprise-level problems from 41 repos (arXiv:2509.16941)
- Multi-SWE-bench: 1,632 instances across Java, TypeScript, JavaScript, Go, Rust, C, C++ (arXiv:2504.02605)
- AInsteinBench: Scientific computing benchmarks across 6 scientific codebases (arXiv:2512.21373)

**Citations:**
- SWE-bench: arXiv:2310.06770 -- https://arxiv.org/abs/2310.06770
- SWE-agent: arXiv:2405.15793 -- https://arxiv.org/abs/2405.15793
- Agentless: arXiv:2407.01489 -- https://arxiv.org/abs/2407.01489
- OpenHands: arXiv:2407.16741 -- https://arxiv.org/abs/2407.16741

### 5.4 ResearchArena (2024)

**What it does.** Benchmarks LLMs on conducting academic surveys in three stages: information discovery, information selection, and information organization. Built from 12M full-text papers and 7.9K survey papers.

**Key finding:** LLM-based approaches underperform simpler keyword-based retrieval methods for literature discovery. "Significant opportunities for advancing LLMs in autonomous research."

**Citations:** arXiv:2406.10291 -- https://arxiv.org/abs/2406.10291

### 5.5 Turing Tests for AI Scientists (2024)

**What it does.** Proposes seven benchmark tests evaluating AI ability to make groundbreaking discoveries (heliocentric model from observations, laws of motion in simulation, Maxwell's equations from simulations, Huffman coding, sorting algorithms, etc.) -- all without access to human knowledge.

**How close:** No agent has passed a majority of these tests. They represent a high bar for genuine scientific reasoning.

**Citations:** arXiv:2405.13352 -- https://arxiv.org/abs/2405.13352

---

## 6. Research Second Brain / Knowledge Management Approaches

### 6.1 Feynman (Open-Source Research Agent)

**What it does.** A CLI-native, open-source AI research agent specializing in literature synthesis. Discovers, analyzes, and synthesizes scientific literature with multi-agent investigation workflows and research code auditing.

**Architecture.** Multiple researcher agents run in parallel, each tackling a different angle, then findings are synthesized into a single document with consensus views, disagreements, and open questions. Includes a Verifier agent for citation checking and a paper-code audit command.

**Key capabilities:** Continuous investigation cycles, citation verification, paper-code consistency auditing, inspectable/editable pipelines.

**Sources:** https://www.feynman.is/ | https://github.com/getcompanion-ai/feynman

### 6.2 Karpathy's LLM Knowledge Base

Karpathy proposed using LLMs to generate knowledge structure -- shifting from code generation to knowledge structure. An AI-powered personal knowledge management system that builds a self-maintaining wiki from raw research material.

### 6.3 InfiAgent -- File-Centric State for Long-Horizon Research

**What it does.** Keeps the agent's reasoning context strictly bounded regardless of task duration by externalizing persistent state into a file-centric state abstraction. Tested on an 80-paper literature review task.

**Results:** With a 20B open-source model, competitive with larger proprietary systems and maintains substantially higher long-horizon coverage than context-centric baselines.

**Citations:** arXiv:2601.03204 -- https://arxiv.org/abs/2601.03204

### 6.4 OmniScientist -- Scientific Ecosystem Simulation (2025)

**What it does.** Encodes the mechanisms of human research (collaboration, peer review, citation networks) into the AI scientific workflow. Provides end-to-end automation plus infrastructural support: structured knowledge system, collaborative research protocol (OSP), and evaluation platform (ScienceArena).

**Citations:** arXiv:2511.16931 -- https://arxiv.org/abs/2511.16931

### 6.5 aiXiv -- Publication Platform for AI Scientists (2025)

**What it does.** A next-generation open-access platform where research proposals and papers are submitted, reviewed, and iteratively refined by both human and AI scientists. Provides API and MCP interfaces.

**Citations:** arXiv:2508.15126 -- https://arxiv.org/abs/2508.15126

---

## 7. Systems Combining Paper Search + Synthesis + Writing

### 7.1 OpenLens AI -- Health Informatics (2025)

Integrates specialized agents for literature review, data analysis, code generation, and manuscript preparation with vision-language feedback for medical visualization. Produces publication-ready LaTeX manuscripts.

**Citations:** arXiv:2509.14778 -- https://arxiv.org/abs/2509.14778

### 7.2 SciDER -- Data-Centric End-to-End Researcher (2026)

Specialized agents collaboratively parse raw scientific data, generate hypotheses, design experiments, write/execute code. Self-evolving memory and critic-led feedback loop.

**Citations:** arXiv:2603.01421 -- https://arxiv.org/abs/2603.01421

### 7.3 Generating Literature-Driven Scientific Theories at Scale (2026)

Uses 13.7K source papers to synthesize 2.9K theories. Literature-supported method creates theories significantly better at matching existing evidence and predicting results from 4.6K subsequently-written papers compared to parametric LLM memory alone.

**Citations:** arXiv:2601.16282 -- https://arxiv.org/abs/2601.16282

### 7.4 HARPA -- Testability-Driven Hypothesis Generation (2025)

Literature mining to identify emerging trends, explore hypothesis design spaces, and converge on testable hypotheses. Produced 20 successful executions (vs. 11 for baseline) out of 40 tasks when paired with CodeScientist.

**Citations:** arXiv:2510.00620 -- https://arxiv.org/abs/2510.00620

---

## 8. Auditability, Verification, and Failure Modes

### 8.1 Auditable Autonomous Research (AAR) Standard

Proposes claim-level auditability as a first-class design target. Identifies failure modes: objective drift, transient constraints, unverifiable inference. Defines metrics: provenance coverage, provenance soundness, contradiction transparency, audit effort.

**Citations:** arXiv:2602.13855 -- https://arxiv.org/abs/2602.13855

### 8.2 EviBound -- Evidence-Bound Execution

Dual governance gates (pre-execution Approval Gate + post-execution Verification Gate) eliminate false claims. Baseline (prompt-only): 100% hallucination rate. EviBound: 0% hallucination with ~8.3% overhead.

**Citations:** arXiv:2511.05524 -- https://arxiv.org/abs/2511.05524

### 8.3 Hidden Pitfalls of AI Scientist Systems

Identifies four failure modes: inappropriate benchmark selection, data leakage, metric misuse, and post-hoc selection bias. Assessment of two prominent systems reveals failures across a spectrum of severity.

**Citations:** arXiv:2509.08713 -- https://arxiv.org/abs/2509.08713

### 8.4 Plagiarism in AI-Generated Research

13 experts evaluated 50 AI-generated research documents: 24% were paraphrased or significantly borrowed. The remaining 76% showed varying degrees of similarity with only a small fraction appearing completely novel. Automated plagiarism detectors are inadequate.

**Citations:** arXiv:2502.16487 -- https://arxiv.org/abs/2502.16487

---

## 9. The Gap: Current Agents vs. Fully Autonomous Research

### 9.1 Quantitative Gap Measures

| Metric | Current Best | Human Expert | Gap |
|--------|-------------|--------------|-----|
| Paper retrieval (TaxoBench) | 20.92% of expert-cited papers | ~100% | ~80% |
| Taxonomy organization (ARI) | 31.24% | Expert-level | ~69% |
| ML experimentation (MLAgentBench) | 37.5% success rate | -- | Varies 0-100% by task |
| SWE-bench Verified (code repair) | ~60%+ (Claude 4 Sonnet) | ~78% | Closing |
| Multi-step web tasks (WebArena) | ~14% success | 78% | ~64% |
| Scientific reproduction (NanoGPT speedrun) | Struggles even with hints | Human researchers | Large |

### 9.2 Structural Gaps

1. **Implementation capability.** Current AI Scientists ideate plausibly but cannot execute rigorous experimental verification (arXiv:2506.01372). The implementation gap is the fundamental bottleneck.

2. **Novelty vs. recombination.** MLGym found that frontier models improve hyperparameters but do not generate novel hypotheses, algorithms, or architectures (arXiv:2502.14499). AlphaResearch's plagiarism study (arXiv:2502.16487) shows much "novel" output is sophisticated recombination.

3. **Error compounding.** At 85% per-action accuracy, a 10-step workflow succeeds only ~20% of the time. Research workflows routinely require 50--100+ steps.

4. **Evidence integration.** FINDER finds DRAs struggle with "evidence integration, verification, and reasoning-resilient planning" (arXiv:2512.01948).

5. **Long-horizon coherence.** Context degradation, accumulated reasoning errors, and sensitivity to environmental variation remain unsolved without explicit external state management (InfiAgent, arXiv:2601.03204).

6. **Domain grounding.** Generic agents produce fluent but shallow analysis. Domain-specific systems (Camyla, Medical AI Scientist) perform dramatically better but require custom engineering.

7. **Auditability.** As research generation becomes cheap, verifying claim-evidence links becomes the bottleneck (arXiv:2602.13855).

### 9.3 Timeline Estimates

- **OpenAI** targets intern-level research assistant by Sept 2026 and "legitimate AI researcher" by 2028.
- **Karpathy's progression:** vibe coding (2024) -> agentic engineering (2025) -> fully independent research (2026+). AutoResearch demonstrates the experiment-running slice.
- **Academic consensus (survey arXiv:2507.23276):** A human-level AI Scientist "may soon become a reality" based on ICLR workshop acceptances, but "substantial headroom remains" and "critical gaps must be addressed."

---

## 10. Synthesis: Landscape Map

```
                        AUTONOMY LEVEL
                   Low ──────────────────── High
                    |                        |
  SCOPE:            |                        |
  Single task    SWE-agent    AlphaEvolve    Camyla
  (code/math)    Agentless    AlphaResearch  Algorithmist
                    |                        |
  Full pipeline  OpenAI DR    Agent Lab      AI Scientist v2
  (lit + exp     Feynman      AI-Researcher  EvoScientist
   + writing)    InfiAgent    ResearchEVO    OmniScientist
                    |                        |
  Meta-level     ResearchArena MLAgentBench  AutoResearch
  (benchmarks/   SWE-bench    MLE-bench     (loop only)
   loops)        TaxoBench    MLGym
```

**Key insight:** No system yet combines all of: (a) genuine novelty in ideation, (b) rigorous experimental execution, (c) literature-grounded synthesis, (d) long-horizon coherence, and (e) auditable provenance. The systems that come closest (Camyla, ResearchEVO) succeed by constraining the domain and automating evaluation. The gap is narrowing rapidly -- the 2023-2026 trajectory shows order-of-magnitude improvements -- but fully autonomous open-ended research remains beyond current capabilities.

---

## References (Consolidated)

| ID | Title | Year |
|----|-------|------|
| 2408.06292 | The AI Scientist v1 (Sakana) | 2024 |
| 2504.08066 | The AI Scientist v2 | 2025 |
| 2501.04227 | Agent Laboratory | 2025 |
| 2505.18705 | AI-Researcher | 2025 |
| 2604.10696 | Camyla | 2026 |
| 2603.08127 | EvoScientist | 2026 |
| 2604.05587 | ResearchEVO | 2026 |
| 2506.13131 | AlphaEvolve | 2025 |
| 2511.02864 | AlphaEvolve Mathematical Exploration | 2025 |
| 2511.08522 | AlphaResearch | 2025 |
| 2603.22363 | Algorithmist I | 2026 |
| 2310.03302 | MLAgentBench | 2023 |
| 2410.07095 | MLE-bench | 2024 |
| 2502.14499 | MLGym | 2025 |
| 2502.13138 | AIDE | 2025 |
| 2507.02554 | AI Research Agents for MLE-bench | 2025 |
| 2310.06770 | SWE-bench | 2023 |
| 2405.15793 | SWE-agent | 2024 |
| 2407.01489 | Agentless | 2024 |
| 2407.16741 | OpenHands | 2024 |
| 2505.23419 | SWE-bench-Live | 2025 |
| 2509.16941 | SWE-bench Pro | 2025 |
| 2504.02605 | Multi-SWE-bench | 2025 |
| 2512.21373 | AInsteinBench | 2025 |
| 2406.10291 | ResearchArena | 2024 |
| 2405.13352 | Turing Tests for AI Scientists | 2024 |
| 2508.12752 | Deep Research Survey | 2025 |
| 2603.28376 | Marco DeepResearch | 2026 |
| 2601.04879 | Mind2Report | 2026 |
| 2601.18467 | OffSeeker | 2026 |
| 2601.03204 | InfiAgent | 2026 |
| 2603.04384 | AgentIR | 2026 |
| 2603.01152 | DeepResearch-9K | 2026 |
| 2506.11763 | DeepResearch Bench | 2025 |
| 2601.12369 | TaxoBench | 2026 |
| 2512.01948 | FINDER | 2025 |
| 2602.11238 | SurveyLens | 2026 |
| 2509.14778 | OpenLens AI | 2025 |
| 2603.01421 | SciDER | 2026 |
| 2601.16282 | Literature-Driven Theories at Scale | 2026 |
| 2510.00620 | HARPA | 2025 |
| 2602.13855 | Auditable Autonomous Research | 2026 |
| 2511.05524 | EviBound | 2025 |
| 2509.08713 | Hidden Pitfalls of AI Scientists | 2025 |
| 2502.16487 | Plagiarism in AI-Generated Research | 2025 |
| 2506.01372 | AI Scientists Fail Without Implementation | 2025 |
| 2507.23276 | How Far Are AI Scientists | 2025 |
| 2511.16931 | OmniScientist | 2025 |
| 2508.15126 | aiXiv | 2025 |
| 2409.05258 | Towards Automated ML Research | 2024 |
| 2510.06056 | DeepEvolve | 2025 |
| 2601.12542 | Deep Research Multi-Agent System | 2026 |
