---
title: "ToolkenGPT: Augmenting Frozen Language Models with Massive Tools via Tool Embeddings"
authors:
  - "Shibo Hao"
  - "Tianyang Liu"
  - "Zhen Wang"
  - "Zhiting Hu"
date: 2023-05-19
tags: [paper, arxiv, ai-agents, tool-use, embeddings, scalable-tools]
source: http://arxiv.org/abs/2305.11554v4
abstract: "Augmenting large language models (LLMs) with external tools has emerged as a promising approach to solving complex problems. However, traditional methods, which finetune LLMs with tool demonstration data, can be both costly and restricted to a predefined set of tools. In this paper, we propose ToolkenGPT, which combines the benefits of both sides."
---

## Summary

ToolkenGPT introduces a novel approach to tool-augmented language models by representing each tool as a special token ("toolken") with a learned embedding. When the model generates a toolken during text generation, it triggers a tool call -- the LLM then generates the arguments, the tool executes, and the result is incorporated back into the generation. This approach scales to massive numbers of tools without the context window limitations of in-context learning approaches.

## Key Contributions

- **Tool-as-token paradigm**: Each tool is represented as a special token with a learned embedding, making tool invocation as natural as generating the next word
- **Frozen LM compatibility**: Only the tool embeddings are trained; the base language model remains frozen, preserving its general capabilities
- **Scalability**: Unlike in-context learning which is limited by context length, ToolkenGPT can handle an arbitrary number of tools by simply adding more toolken embeddings
- **Strong empirical results**: Outperforms in-context learning baselines and fine-tuning approaches across numerical reasoning, knowledge-based QA, and embodied plan generation

## Methodology

1. **Toolken representation**: Define a special token for each tool and initialize a learnable embedding vector for it
2. **Training**: Given demonstration data showing when tools should be called, train only the toolken embeddings (a small number of parameters) while keeping the LLM frozen
3. **Inference**: During generation, if the model's next-token prediction selects a toolken, the model switches to argument generation mode, executes the tool, and injects the result
4. **Plug-and-play expansion**: New tools can be added at any time by training a new toolken embedding, without retraining the full model

## Connections

- Contrasts with [[toolformer-language-models-teach-themselves-tools]] which fine-tunes the full model for tool use; ToolkenGPT only trains embeddings
- Both approaches address the same problem as [[react-synergizing-reasoning-and-acting]] but at the model architecture level rather than the prompting level
- The scalability to many tools is relevant to [[autogen-enabling-next-gen-llm-applications-multi-agent]] where agents may need access to diverse tool sets
- The embedding-based approach could be applied to the skill library concept in [[voyager-open-ended-embodied-agent-large-language-models]]
- [[rewoo-decoupling-reasoning-from-observations]] addresses a complementary efficiency concern: reducing token consumption during tool-augmented reasoning
