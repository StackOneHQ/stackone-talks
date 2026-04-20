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
source: https://arxiv.org/abs/2305.18323
abstract: "Augmented Language Models (ALMs) blend the reasoning capabilities of Large Language Models (LLMs) with tools that allow for knowledge retrieval and action execution. Existing ALM systems trigger LLM thought processes while pulling observations from these tools in an interleaved fashion. This approach, though effective, often results in excessive token consumption due to the extended prompt lengths that arise from increasing the number of tool calls. This study proposes ReWOO (Reasoning WithOut Observation) that detaches the reasoning process from external observations, thus significantly reducing token consumption. Our approach utilizes a Planner to generate a blueprint of interconnected plans, a Worker to execute tools based on these plans, and a Solver to synthesize responses based on tool outputs."
---

## Summary

ReWOO addresses a critical efficiency problem in tool-augmented language models: the interleaved reasoning-observation pattern (as in ReAct) requires the LLM to process increasingly long prompts at each step, since all previous thoughts, actions, and observations accumulate in context. ReWOO decouples the reasoning phase from the observation phase -- the model first generates a complete plan of all tool calls upfront, then executes them in parallel, and finally synthesizes the results. This achieves 5x token efficiency while maintaining or improving accuracy.

The insight is practical and important: for many tasks, the agent can anticipate what information it will need and plan all retrievals in advance. The interleaved pattern is necessary only when later decisions truly depend on earlier observations -- and even then, ReWOO handles dependencies through placeholder variables in its planning language.

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

Related work in this vault:
- [[react-synergizing-reasoning-and-acting]] -- Directly addresses the efficiency limitations of ReAct's interleaved approach
- [[lats-language-agent-tree-search]] -- The upfront planning parallels LATS, though LATS uses tree search rather than linear planning
- [[toolformer-language-models-teach-themselves]] -- Relevant to scaling tool use where many tool calls can be expensive
- [[toolkengpt-tool-embeddings]] -- Both address efficiency of tool-augmented LMs from different angles
- [[autogen-multi-agent-conversation]] -- The model distillation results are relevant to deploying agents at lower cost
- [[tree-of-thoughts-deliberate-problem-solving]] -- ToT similarly generates plans upfront but focuses on reasoning rather than tool use
