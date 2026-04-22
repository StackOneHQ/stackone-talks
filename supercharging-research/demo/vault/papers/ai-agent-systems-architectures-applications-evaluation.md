---
title: "AI Agent Systems: Architectures, Applications, and Evaluation"
authors:
  - "Bin Xu"
date: 2026-01-05
tags: [paper, arxiv, survey, ai-agents, planning, tool-use, evaluation, orchestration]
source: https://arxiv.org/abs/2601.01743
abstract: "This paper surveys AI agent systems that combine foundation models with reasoning, planning, memory, and tool use to bridge natural language intent and real-world computation. It provides a comprehensive taxonomy of agent architectures and design patterns, covering deliberation and reasoning, planning and control, tool integration, orchestration patterns, and deployment contexts, while analysing key design trade-offs including latency versus accuracy, autonomy versus controllability, and evaluation challenges."
---

## Summary

This survey provides a sweeping taxonomy of AI agent systems as of early 2026, framing agents as systems that bridge natural language intent and real-world computation through reasoning, planning, memory, and tool use. A key thesis is that **agent performance is a systems optimisation problem** as much as a modelling problem — reliability, latency, and cost are shaped by orchestration policies, not just model capabilities.

The paper covers the full stack: from deliberation and reasoning (chain-of-thought, self-reflection, constraint-aware decisions) through planning and control (reactive policies to hierarchical planners) to tool integration (retrieval, code execution, APIs, multimodal perception). It also addresses orchestration patterns for both single-agent and multi-agent configurations, and discusses deployment contexts ranging from offline analysis to safety-critical interactive assistance.

The treatment of design trade-offs is particularly valuable: latency vs. accuracy, autonomy vs. controllability, and the challenge of long-horizon credit assignment in evaluation.

## Key Contributions

- **Comprehensive taxonomy** covering deliberation, planning, tool use, memory, and orchestration in a unified framework
- **Systems perspective**: frames agent performance as a systems optimisation problem, not just a modelling problem
- **Core component architecture**: identifies LLM policy, memory, world models, planners, tool routers, and critics as key building blocks
- **Orchestration patterns**: catalogues single-agent vs. multi-agent configurations with centralised and decentralised coordination
- **Trade-off analysis**: latency vs. accuracy, autonomy vs. controllability, with practical implications for deployment

## Methodology

Survey methodology synthesising the agent systems literature through a component-based architectural lens. The paper organises work into functional categories (reasoning, planning, tool use, memory, orchestration) and analyses representative systems within each. Evaluation challenges are examined through the lens of real-world deployment requirements rather than benchmark performance alone.

## Connections

- [[react-synergizing-reasoning-and-acting]] — A foundational example of the reasoning + tool-use pattern this survey taxonomises
- [[toolformer-language-models-teach-themselves]] — Represents the training-based approach to tool integration covered in the survey
- [[orchestration-of-multi-agent-systems]] — Complements this survey by diving deeper into multi-agent orchestration protocols
- [[memory-for-autonomous-llm-agents]] — Provides detailed coverage of the memory dimension this survey treats more briefly
- [[voyager-open-ended-embodied-agent]] — An exemplar of open-ended agent deployment discussed in the survey
