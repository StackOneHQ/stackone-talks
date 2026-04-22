---
title: "A-MEM: Agentic Memory for LLM Agents"
authors:
  - "Wujiang Xu"
  - "Zujie Liang"
  - "Kai Mei"
  - "Hang Gao"
  - "Juntao Tan"
  - "Yongfeng Zhang"
date: 2025-02-17
tags: [paper, arxiv, neurips, memory, zettelkasten, knowledge-graph, llm-agents, ai-agents]
source: https://arxiv.org/abs/2502.12110
abstract: "A-MEM introduces a memory system for LLM agents that can dynamically organize memories in an agentic way, implementing principles from the Zettelkasten method to establish interconnected knowledge networks through dynamic indexing and linking. The system generates structured notes with contextual descriptions, keywords, and tags, automatically identifies meaningful connections between memories, and enables memory evolution where new information triggers updates to existing memory representations."
---

## Summary

A-MEM introduces a memory architecture for LLM agents inspired by the **Zettelkasten method** — the note-taking system that emphasises interconnected atomic notes over hierarchical organisation. Rather than treating memory as a flat store or rigid database, A-MEM lets the agent itself dynamically organise its memories through structured note generation, automatic linking, and continuous evolution.

Each memory is stored as a structured note with contextual descriptions, keywords, and tags. The system automatically identifies meaningful connections between memories, building an interconnected knowledge network that grows and refines itself as new information arrives. Critically, new memories can trigger updates to existing representations — a form of **memory evolution** that mirrors how human understanding consolidates over time.

Published at NeurIPS 2025, A-MEM demonstrated superior performance across six foundation models, particularly doubling performance on complex multi-hop reasoning tasks compared to baselines. The approach maintains cost-effective resource utilisation while scaling to realistic agent workloads.

## Key Contributions

- **Agentic memory organisation**: the agent itself decides how to structure and link memories, rather than relying on fixed operations
- **Zettelkasten-inspired architecture**: interconnected knowledge networks through dynamic indexing and linking of atomic notes
- **Automated connection discovery**: identifies meaningful relationships between memories without explicit human curation
- **Memory evolution**: new information triggers updates to existing memories, enabling continuous knowledge refinement
- **Strong empirical results**: 2x performance on multi-hop reasoning tasks across six foundation models

## Methodology

A-MEM implements a three-phase memory pipeline: (1) **structured note generation** converting raw information into notes with contextual descriptions, keywords, and tags; (2) **connection identification** automatically discovering and establishing links between related memories; (3) **memory evolution** where incoming information can update existing memory representations. The architecture is evaluated across six foundation models on tasks requiring multi-hop reasoning, demonstrating consistent improvements, with particular gains on complex queries that require traversing multiple memory connections.

## Connections

- [[memory-for-autonomous-llm-agents]] — This survey categorises A-MEM within its taxonomy of agent memory mechanisms
- [[generative-agents-simulacra]] — Generative agents used a reflection-based memory architecture; A-MEM advances this with dynamic Zettelkasten-style linking
- [[reflexion-verbal-reinforcement]] — Reflexion's episodic memory of self-reflections is a simpler instance of the memory evolution concept A-MEM formalises
- [[voyager-open-ended-embodied-agent]] — Voyager's skill library is a specialised memory system; A-MEM provides a general-purpose alternative
