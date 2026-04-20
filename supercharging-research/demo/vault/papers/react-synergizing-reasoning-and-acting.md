---
title: "ReAct: Synergizing Reasoning and Acting in Language Models"
authors:
  - "Shunyu Yao"
  - "Jeffrey Zhao"
  - "Dian Yu"
  - "Nan Du"
  - "Izhak Shafran"
  - "Karthik Narasimhan"
  - "Yuan Cao"
date: 2022-10-06
tags: [paper, arxiv, ai-agents, reasoning, tool-use, react]
source: https://arxiv.org/abs/2210.03629
abstract: "While large language models (LLMs) have demonstrated impressive capabilities across tasks in language understanding and interactive decision making, their abilities for reasoning (e.g. chain-of-thought prompting) and acting (e.g. action plan generation) have primarily been studied as separate topics. In this paper, we explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two: reasoning traces help the model induce, track, and update action plans as well as handle exceptions, while actions allow it to interface with external sources, such as knowledge bases or environments, to gather additional information. We apply our approach, named ReAct, to a diverse set of language and decision making tasks and demonstrate its effectiveness over state-of-the-art baselines, as well as improved human interpretability and trustworthiness over methods without reasoning or acting components."
---

## Summary

ReAct introduces a paradigm for interleaving reasoning traces and task-specific actions in large language models. Rather than treating reasoning (chain-of-thought) and acting (tool use, environment interaction) as separate capabilities, ReAct combines them: the model reasons about what to do next, acts on that reasoning, observes the result, and reasons again. This creates a tight feedback loop between internal deliberation and external information gathering.

The approach is evaluated on diverse benchmarks including question answering (HotpotQA), fact verification (FEVER), and interactive decision making tasks (ALFWorld, WebShop). Across all settings, the synergy between reasoning and acting yields improvements over approaches that use either capability in isolation.

## Key Contributions

- **Unified reasoning-acting framework**: Demonstrates that interleaving thought and action traces yields better results than either reasoning or acting alone
- **Reduced hallucination**: By grounding reasoning in real observations from external tools (e.g., Wikipedia API), ReAct reduces the hallucination and error propagation common in pure chain-of-thought approaches
- **Human-interpretable trajectories**: The thought-action-observation traces are easily readable and debuggable, unlike opaque end-to-end approaches
- **Strong empirical results**: On HotpotQA and FEVER, ReAct outperforms chain-of-thought baselines; on ALFWorld and WebShop, it beats imitation and RL methods by 34% and 10% absolute success rate

## Methodology

ReAct prompts the LLM with a few in-context examples that demonstrate the interleaved format: Thought (internal reasoning) -> Action (API call or environment action) -> Observation (result from the environment). The model learns to alternate between these modes. No fine-tuning is required; the approach works purely through prompting.

The key insight is that reasoning traces help the model maintain working memory, track progress, and handle exceptions, while actions let it gather real information rather than hallucinating.

## Connections

Related work in this vault:
- [[reflexion-verbal-reinforcement]] -- builds self-reflection on top of ReAct-style trajectories, enabling agents to learn from failures
- [[lats-language-agent-tree-search]] -- extends the reasoning-acting paradigm with Monte Carlo Tree Search over ReAct-style traces
- [[tree-of-thoughts-deliberate-problem-solving]] -- explores a complementary approach to structured reasoning without external actions
- [[toolformer-language-models-teach-themselves]] -- focuses on learning when and how to call tools via self-supervised training rather than prompting
- [[toolkengpt-tool-embeddings]] -- addresses tool use at the model architecture level with tool embeddings
- [[rewoo-decoupling-reasoning-observing]] -- proposes an alternative that decouples the reasoning and observation phases for efficiency
