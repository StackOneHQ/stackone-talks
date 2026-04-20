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
source: http://arxiv.org/abs/2305.16291v2
abstract: "We introduce Voyager, the first LLM-powered embodied lifelong learning agent in Minecraft that continuously explores the world, acquires diverse skills, and makes novel discoveries without human intervention."
---

## Summary

Voyager is the first LLM-powered embodied agent capable of lifelong learning in Minecraft. It continuously explores, acquires skills, and makes discoveries without human intervention. The system demonstrates that LLMs can serve as the cognitive backbone for open-ended agents that accumulate knowledge and capabilities over time, addressing the fundamental challenge of catastrophic forgetting in continual learning.

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

The agent interacts with GPT-4 as a black-box API -- no model fine-tuning is required. This makes the approach model-agnostic.

## Connections

- The skill library concept parallels the memory architecture in [[generative-agents-interactive-simulacra-human-behavior]] -- both use retrieval over accumulated experience
- The iterative self-correction connects to [[reflexion-language-agents-verbal-reinforcement]] which formalizes self-reflection as verbal reinforcement learning
- Tool and code generation aspects relate to [[toolformer-language-models-teach-themselves-tools]] and [[toolkengpt-augmenting-frozen-language-models-massive-tools]]
- The planning component complements [[lats-language-agent-tree-search]] and [[tree-of-thoughts-deliberate-problem-solving]] which formalize search over action plans
- The embodied agent paradigm is distinct from but informed by [[react-synergizing-reasoning-and-acting]] which operates in text-based environments
