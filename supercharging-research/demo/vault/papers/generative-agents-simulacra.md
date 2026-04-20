---
title: "Generative Agents: Interactive Simulacra of Human Behavior"
authors:
  - "Joon Sung Park"
  - "Joseph C. O'Brien"
  - "Carrie J. Cai"
  - "Meredith Ringel Morris"
  - "Percy Liang"
  - "Michael S. Bernstein"
date: 2023-04-07
tags: [paper, arxiv, ai-agents, memory, simulation, agent-architecture, social-agents]
source: https://arxiv.org/abs/2304.03442
abstract: "Believable proxies of human behavior can empower interactive applications ranging from immersive environments to rehearsal spaces for interpersonal communication to prototyping tools. In this paper, we introduce generative agents -- computational software agents that simulate believable human behavior. Generative agents wake up, cook breakfast, and head to work; artists paint, while authors write; they form opinions, notice each other, and initiate conversations; they remember and reflect on days past as they plan the next day. To enable generative agents, we describe an architecture that extends a large language model to store a complete record of the agent's experiences using natural language, synthesize those memories over time into higher-level reflections, and retrieve them dynamically to plan behavior."
---

## Summary

This paper introduces generative agents -- software entities that simulate believable human behavior using LLMs as their cognitive backbone. Set in a Sims-inspired sandbox town of 25 agents, the system demonstrates that LLMs can power agents with coherent daily routines, social relationships, memory, and planning. The architecture is notable for its memory system: agents maintain a complete stream of experiences in natural language, synthesize memories into higher-level reflections, and dynamically retrieve relevant memories to plan actions.

The most striking result is emergent social behavior: starting from a single seed -- one agent wanting to throw a Valentine's Day party -- agents autonomously spread invitations through social networks, coordinate logistics, form new relationships, and show up at the right time and place. None of this was explicitly programmed; it emerged from the memory and planning architecture.

## Key Contributions

- **Three-layer memory architecture**: (1) Observation -- recording events as they happen, (2) Reflection -- periodically synthesizing observations into higher-level insights, (3) Planning -- using reflections and observations to create daily plans and react to events
- **Emergent social behavior**: Starting from a single seed (one agent wants to throw a Valentine's Day party), agents autonomously spread invitations, form relationships, coordinate attendance, and show up at the right time
- **Believability evaluation**: Human evaluators rated generative agents as more believable than human-authored NPC behaviors
- **Ablation study**: Each component (observation, reflection, planning) is shown to be critical; removing any one significantly degrades behavioral believability

## Methodology

Each agent maintains:
- **Memory stream**: A chronological record of all observations and actions, stored as natural language with timestamps and importance scores
- **Retrieval function**: Combines recency, importance, and relevance (embedding similarity to current context) to surface the most useful memories
- **Reflection mechanism**: Periodically triggered when accumulated importance exceeds a threshold; the agent asks itself "what are the key takeaways?" and generates higher-level summary statements
- **Planning**: Each morning, agents generate a daily plan; plans are recursively decomposed into hourly and then minute-level actions; plans adapt in real-time based on new observations

## Connections

Related work in this vault:
- [[reflexion-verbal-reinforcement]] -- The memory architecture is foundational; Reflexion uses episodic memory buffers with a similar philosophy
- [[lats-language-agent-tree-search]] -- The planning component relates to LATS but operates at a longer time horizon (daily plans vs. immediate decisions)
- [[tree-of-thoughts-deliberate-problem-solving]] -- Both involve structured planning, though ToT focuses on reasoning search rather than social behavior
- [[autogen-multi-agent-conversation]] -- The multi-agent social dynamics complement AutoGen's multi-agent framework
- [[voyager-open-ended-embodied-agent]] -- The skill and experience accumulation parallels Voyager's skill library
- [[react-synergizing-reasoning-and-acting]] -- Unlike ReAct which focuses on task completion, generative agents focus on open-ended believable behavior
