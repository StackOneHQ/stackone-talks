---
title: "Reflexion: Language Agents with Verbal Reinforcement Learning"
authors:
  - "Noah Shinn"
  - "Federico Cassano"
  - "Ashwin Gopinath"
  - "Karthik Narasimhan"
  - "Shunyu Yao"
date: 2023-03-20
tags: [paper, arxiv, ai-agents, self-reflection, memory, reinforcement-learning]
source: https://arxiv.org/abs/2303.11366
abstract: "Large language models (LLMs) have been increasingly used to interact with external environments (e.g., games, compilers, APIs) as goal-driven agents. However, it remains challenging for these language agents to quickly and efficiently learn from trial-and-error as traditional reinforcement learning methods require extensive training samples and expensive model fine-tuning. We propose Reflexion, a novel framework to reinforce language agents not by updating weights, but instead through linguistic feedback. Concretely, Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials."
---

## Summary

Reflexion proposes a fundamentally different approach to improving language agents: instead of updating model weights (as in traditional RL), agents improve through verbal self-reflection. After each attempt at a task, the agent generates a natural language critique of what went wrong, stores it in an episodic memory buffer, and uses these reflections to make better decisions in subsequent attempts. This achieves the benefits of reinforcement learning without any gradient updates.

The framework is both simple and powerful. The reflection step converts sparse, uninformative reward signals (pass/fail on a test suite) into rich, actionable natural language guidance ("I forgot to handle the edge case where the list is empty"). This semantic compression of experience is something that gradient-based RL cannot achieve, and it allows rapid improvement with very few trials.

## Key Contributions

- **Verbal reinforcement learning**: A new paradigm where agents learn from experience through natural language reflection rather than weight updates
- **Episodic memory buffer**: Reflections are stored and retrieved in subsequent trials, giving the agent persistent memory of past mistakes
- **Flexible feedback integration**: Works with scalar rewards, binary success/failure, or free-form language feedback from external or internal sources
- **State-of-the-art results**: 91% pass@1 on HumanEval (coding), surpassing GPT-4's 80%, demonstrating that self-reflection can dramatically improve performance

## Methodology

Reflexion operates in a trial loop:
1. **Act**: The agent attempts the task using a standard approach (e.g., ReAct-style reasoning and acting)
2. **Evaluate**: The environment provides feedback (test results, success/failure, reward signal)
3. **Reflect**: If the attempt failed, the agent generates a verbal reflection analyzing what went wrong and what to try differently
4. **Store**: The reflection is added to the agent's episodic memory buffer
5. **Retry**: On the next attempt, the agent includes prior reflections in its context, enabling it to avoid previous mistakes

The reflection step is the key innovation -- it converts sparse, uninformative reward signals into rich, actionable natural language guidance.

## Connections

Related work in this vault:
- [[react-synergizing-reasoning-and-acting]] -- Builds directly on ReAct as the base agent framework, adding self-reflection on top
- [[lats-language-agent-tree-search]] -- The self-reflection mechanism is incorporated into LATS as part of its backtracking strategy
- [[generative-agents-simulacra]] -- The episodic memory parallels the memory stream in Generative Agents, but focused on task performance rather than social simulation
- [[voyager-open-ended-embodied-agent]] -- The iterative improvement loop is similar to Voyager's self-verification mechanism
- [[autogen-multi-agent-conversation]] -- Could enhance AutoGen agents by giving individual agents the ability to learn from conversation failures
