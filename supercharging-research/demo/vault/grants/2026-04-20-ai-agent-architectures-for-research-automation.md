---
title: "Literature Review: AI Agent Architectures for Research Automation"
date: 2026-04-20
tags: [grant, literature-review]
topic: "AI agent architectures for research automation"
---

# Literature Review: AI Agent Architectures for Research Automation

## Related Work

The development of autonomous AI agents has accelerated rapidly since the introduction of the ReAct framework ([[react-synergizing-reasoning-and-acting]]), which demonstrated that interleaving reasoning traces with task-specific actions produces more capable and interpretable agents than either reasoning or acting alone. This foundational insight -- that agents benefit from thinking about what they observe and observing what they think about -- has become the standard paradigm for agent design. Building on ReAct, [[reflexion-language-agents-verbal-reinforcement]] introduced verbal self-reflection as a mechanism for agents to learn from failures without weight updates, achieving 91% pass@1 on HumanEval by maintaining an episodic memory of past mistakes.

Tool use is a critical capability for research agents. [[toolformer-language-models-teach-themselves-tools]] showed that language models can learn to call external APIs in a self-supervised manner, while [[toolkengpt-augmenting-frozen-language-models-massive-tools]] proposed representing tools as token embeddings for scalable integration. The efficiency of tool-augmented reasoning has been addressed by [[rewoo-decoupling-reasoning-from-observations]], which decouples the planning phase from tool execution to achieve 5x token efficiency. For a research automation system that must query databases, read papers, and synthesise findings, these approaches to tool integration are directly relevant.

Planning and search capabilities are essential for agents tackling complex research tasks. [[tree-of-thoughts-deliberate-problem-solving]] generalised chain-of-thought prompting into a tree search over reasoning paths, enabling backtracking and lookahead. [[lats-language-agent-tree-search]] unified this with ReAct-style acting, achieving state-of-the-art results in programming and web navigation through Monte Carlo Tree Search over agent trajectories. These planning mechanisms would allow a research agent to explore multiple hypotheses and literature threads systematically.

Multi-agent architectures offer a path to decomposing complex research workflows. [[autogen-enabling-next-gen-llm-applications-multi-agent]] provides a framework where specialised agents (literature searcher, summariser, critic, writer) can converse to accomplish tasks that exceed the capability of any single agent. The social simulation work of [[generative-agents-interactive-simulacra-human-behavior]] demonstrated that agents with rich memory architectures can maintain coherent long-term behavior, a property essential for research agents that must track evolving understanding across many papers and sessions.

Open-ended learning, as demonstrated by [[voyager-open-ended-embodied-agent-large-language-models]] in the Minecraft domain, shows that LLM-powered agents can continuously acquire and compose skills. For research automation, this suggests an architecture where the agent builds a growing library of research skills (literature search strategies, summarisation templates, citation graph analysis) that compound over time.

## Key Findings

- Interleaving reasoning and acting (ReAct pattern) reduces hallucination and improves task completion rates across diverse benchmarks
- Verbal self-reflection enables agents to improve without gradient updates, achieving state-of-the-art on coding benchmarks
- Self-supervised tool learning (Toolformer) and tool embeddings (ToolkenGPT) offer complementary approaches to scalable tool integration
- Decoupling planning from execution (ReWOO) can reduce computational cost by 5x without sacrificing accuracy
- Tree search over reasoning paths (ToT, LATS) dramatically improves performance on tasks requiring exploration and backtracking
- Multi-agent conversation frameworks (AutoGen) enable modular, human-in-the-loop workflows
- Rich memory architectures with observation, reflection, and planning layers produce more coherent long-term agent behavior

## Methodology Suggestions

1. **Retrieval-augmented research agent**: Build an agent that combines ReAct-style reasoning with a retrieval system over an Obsidian vault. The agent would search arXiv, summarise papers, and store structured notes that it can later retrieve for synthesis tasks. Use the ReWOO pattern to plan all searches upfront for efficiency.

2. **Multi-agent literature review pipeline**: Use an AutoGen-style multi-agent system with specialised roles: a Searcher agent that finds relevant papers, a Reader agent that extracts key claims, a Critic agent that identifies methodological weaknesses, and a Writer agent that synthesises findings into coherent prose. Each agent maintains its own memory and expertise.

3. **Reflexive grant writing assistant**: Implement a Reflexion-style feedback loop for grant writing: the agent drafts a section, a critic agent evaluates it against grant review criteria (novelty, feasibility, significance), the writer reflects on the critique, and iterates. Store reflections in the vault for use in future proposals.

4. **Skill library for research tasks**: Inspired by Voyager, build a growing library of research "skills" -- reusable prompt templates and tool chains for common tasks (finding seminal papers, comparing methodologies, identifying research gaps, writing specific sections). New skills are verified before being added to the library.

5. **Knowledge graph construction**: Use the vault's wikilink structure to automatically build a knowledge graph of concepts, papers, and relationships. Apply tree search (ToT/LATS) to identify unexplored regions of the graph that represent research opportunities.

## Identified Gaps

- **Dynamic tool discovery**: No current framework handles discovering and learning new tools at runtime. Research agents need to adapt to new databases, APIs, and data formats as they encounter them.
- **Long-horizon coherence**: While Generative Agents showed promise for long-term behavior, no work has applied similar memory architectures to multi-session research workflows that span weeks or months.
- **Evaluation of research quality**: Current agent benchmarks focus on task completion (pass/fail), not on the quality of research outputs. There is no standard benchmark for evaluating AI-generated literature reviews or research summaries.
- **Citation verification**: Agents can hallucinate citations. None of the surveyed papers address robust verification of generated references against actual publications.
- **Cross-modal research**: Current agent architectures are primarily text-based. Research automation requires processing figures, tables, equations, and code -- a multimodal challenge largely unaddressed.

## Key Citations

- **[[react-synergizing-reasoning-and-acting]]** (Yao et al., 2022) -- Foundational framework for reasoning + acting agents. Essential citation for any agent architecture.
- **[[reflexion-language-agents-verbal-reinforcement]]** (Shinn et al., 2023) -- Verbal reinforcement learning. Key for iterative improvement in research workflows.
- **[[toolformer-language-models-teach-themselves-tools]]** (Schick et al., 2023) -- Self-supervised tool learning. Directly relevant to agents that need to use research APIs.
- **[[lats-language-agent-tree-search]]** (Zhou et al., 2023) -- MCTS for language agents. Important for systematic exploration of research hypotheses.
- **[[autogen-enabling-next-gen-llm-applications-multi-agent]]** (Wu et al., 2023) -- Multi-agent framework. Key reference for decomposing complex research tasks.
- **[[generative-agents-interactive-simulacra-human-behavior]]** (Park et al., 2023) -- Memory architecture. Relevant to long-term agent coherence in research settings.
- **[[voyager-open-ended-embodied-agent-large-language-models]]** (Wang et al., 2023) -- Lifelong learning agent. Relevant to agents that accumulate research skills.
