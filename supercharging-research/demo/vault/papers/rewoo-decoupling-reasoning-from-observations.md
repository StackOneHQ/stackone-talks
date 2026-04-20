---
title: "ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models"
authors:
  - "Binfeng Xu"
  - "Zhiyuan Peng"
  - "Bowen Lei"
  - "Subhabrata Mukherjee"
  - "Yuchen Liu"
  - "Dongkuan Xu"
date: 2023-05-23
tags: [paper, arxiv, ai-agents, efficiency, tool-use, planning, token-efficiency]
source: http://arxiv.org/abs/2305.18323v1
abstract: "Augmented Language Models (ALMs) blend the reasoning capabilities of Large Language Models (LLMs) with tools that allow for knowledge retrieval and action execution. Existing ALM systems trigger LLM thought processes while pulling observations from these tools in an interleaved fashion. This study proposes ReWOO (Reasoning WithOut Observation) that detaches the reasoning process from external observations, significantly reducing token consumption."
---

## Summary

ReWOO addresses a critical efficiency problem in tool-augmented language models: the interleaved reasoning-observation pattern (as in ReAct) requires the LLM to process increasingly long prompts at each step, since all previous thoughts, actions, and observations accumulate in context. ReWOO decouples the reasoning phase from the observation phase -- the model first generates a complete plan of all tool calls upfront, then executes them in parallel, and finally synthesizes the results. This achieves 5x token efficiency while maintaining or improving accuracy.

## Key Contributions

- **Decoupled architecture**: Separates planning (reasoning) from execution (observation), enabling parallel tool calls and eliminating redundant prompt tokens
- **5x token efficiency**: On HotpotQA, ReWOO uses 5x fewer tokens than interleaved approaches while achieving 4% higher accuracy
- **Robustness to tool failure**: Because the plan is generated upfront, the system degrades more gracefully when individual tools fail
- **Model distillation**: The decoupled architecture enables offloading reasoning from GPT-3.5 (175B) to LLaMA (7B), demonstrating a path to efficient deployment

## Methodology

ReWOO operates in three distinct phases:
1. **Planner**: The LLM generates a complete chain of reasoning and tool-call plans without seeing any tool outputs. Each plan step specifies which tool to call and what arguments to use, with placeholder variables for dependencies
2. **Worker**: Tool calls are executed (potentially in parallel where there are no dependencies), and placeholder variables are substituted with actual results
3. **Solver**: A final LLM call receives the original question, the plan, and all tool outputs to produce the answer

This is in contrast to ReAct where each thought-action-observation cycle requires a separate LLM call with the full accumulated context.

## Connections

- Directly addresses the efficiency limitations of [[react-synergizing-reasoning-and-acting]]'s interleaved approach
- The upfront planning parallels [[lats-language-agent-tree-search]] which also plans ahead, though LATS uses tree search rather than linear planning
- Relevant to scaling tool use in [[toolformer-language-models-teach-themselves-tools]] and [[toolkengpt-augmenting-frozen-language-models-massive-tools]] where many tool calls can be expensive
- The model distillation results are relevant to deploying agents in [[autogen-enabling-next-gen-llm-applications-multi-agent]] at lower cost
- [[tree-of-thoughts-deliberate-problem-solving]] similarly generates plans upfront but focuses on reasoning rather than tool use
