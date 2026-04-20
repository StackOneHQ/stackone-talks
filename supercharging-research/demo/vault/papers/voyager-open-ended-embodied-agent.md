---
title: "Voyager: An Open-Ended Embodied Agent with Large Language Models"
authors:
  - "Guanzhi Wang"
  - "Yuqi Xie"
  - "Yunfan Jiang"
  - "Ajay Mandlekar"
  - "Chaowei Xiao"
  - "Yuke Zhu"
  - "Linxi Fan"
  - "Anima Anandkumar"
date: 2023-05-25
tags: [paper, arxiv, ai-agents, embodied-agents, lifelong-learning, skill-library, minecraft]
source: https://arxiv.org/abs/2305.16291
abstract: "We introduce Voyager, the first LLM-powered embodied lifelong learning agent in Minecraft that continuously explores the world, acquires diverse skills, and makes novel discoveries without human intervention. Voyager consists of three key components: (1) an automatic curriculum that maximizes exploration, (2) an ever-growing skill library of executable code for storing and retrieving complex behaviors, and (3) a new iterative prompting mechanism that incorporates environment feedback, execution errors, and self-verification for program improvement. Voyager interacts with GPT-4 via blackbox queries, which bypasses the need for model parameter fine-tuning."
---

## Summary

Voyager is the first LLM-powered embodied agent capable of lifelong learning in Minecraft. It continuously explores, acquires skills, and makes discoveries without human intervention. The system demonstrates that LLMs can serve as the cognitive backbone for open-ended agents that accumulate knowledge and capabilities over time, addressing the fundamental challenge of catastrophic forgetting in continual learning.

The architecture is compelling in its simplicity: an automatic curriculum proposes tasks, the agent writes code to solve them, successful solutions are stored in a growing skill library, and complex behaviors are composed from simpler skills. This creates a virtuous cycle where the agent's capabilities compound over time.

## Key Contributions

- **Automatic curriculum**: A GPT-4-driven curriculum generator proposes increasingly complex exploration objectives based on the agent's current state and inventory, maximizing novelty and learning
- **Skill library**: An ever-growing library of executable JavaScript code functions that the agent writes, verifies, and stores. Skills are compositional -- complex behaviors are built from simpler ones
- **Iterative prompting with environment feedback**: A self-verification mechanism where the agent checks whether its code achieved the desired outcome, incorporating execution errors and environment state into subsequent attempts
- **Lifelong learning without forgetting**: Skills stored in the library persist and transfer to new worlds, enabling zero-shot generalization

## Methodology

Voyager operates through a three-component loop:
1. **Curriculum Generator**: GPT-4 examines the agent's current state (inventory, biome, completed tasks) and proposes the next objective
2. **Skill Coder**: GPT-4 writes JavaScript code to accomplish the objective, iteratively refining based on execution errors and environment feedback
3. **Skill Library**: Verified skills are stored with natural language descriptions and retrieved via embedding similarity when relevant to new tasks

The agent interacts with GPT-4 as a black-box API -- no model fine-tuning is required. This makes the approach model-agnostic and immediately applicable with newer, more capable models.

## Connections

Related work in this vault:
- [[generative-agents-simulacra]] -- The skill library concept parallels the memory architecture; both use retrieval over accumulated experience
- [[reflexion-verbal-reinforcement]] -- The iterative self-correction connects to Reflexion's formalization of self-reflection as verbal reinforcement learning
- [[toolformer-language-models-teach-themselves]] -- Tool and code generation aspects share the theme of models learning to use external capabilities
- [[toolkengpt-tool-embeddings]] -- The embedding-based skill retrieval relates to ToolkenGPT's tool embedding approach
- [[lats-language-agent-tree-search]] -- The planning component complements LATS's formalization of search over action plans
- [[tree-of-thoughts-deliberate-problem-solving]] -- ToT offers structured search that could enhance Voyager's planning
- [[react-synergizing-reasoning-and-acting]] -- Voyager's embodied agent paradigm extends ReAct's reasoning-acting loop to a persistent world
