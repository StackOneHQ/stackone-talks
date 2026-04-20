---
title: "ToolkenGPT: Augmenting Frozen Language Models with Massive Tools via Tool Embeddings"
authors:
  - "Shibo Hao"
  - "Tianyang Liu"
  - "Zhen Wang"
  - "Zhiting Hu"
date: 2023-05-19
tags: [paper, arxiv, ai-agents, tool-use, embeddings, scalable-tools]
source: https://arxiv.org/abs/2305.11554
abstract: "Augmenting large language models (LLMs) with external tools has emerged as a promising approach to solving complex problems. However, traditional methods, which finetune LLMs with tool demonstration data, can be both costly and restricted to a predefined set of tools. Recent in-context learning paradigm avoids the cost but is bounded by the limited context length and the inability to find the right tool from a large collection. In this paper, we propose ToolkenGPT, which combines the benefits of both sides. Our approach represents each tool as a token (toolken) and learns an embedding for it, enabling the LLM to read and trigger tools just as naturally as generating a regular word token."
---

## Summary

ToolkenGPT introduces a novel approach to tool-augmented language models by representing each tool as a special token ("toolken") with a learned embedding. When the model generates a toolken during text generation, it triggers a tool call -- the LLM then generates the arguments, the tool executes, and the result is incorporated back into the generation. This approach scales to massive numbers of tools without the context window limitations of in-context learning approaches.

The elegance of the approach lies in its minimal footprint: only the tool embeddings are trained, while the base language model remains completely frozen. This preserves the model's general capabilities while adding an extensible tool-use layer. New tools can be added at any time by training a new embedding, without touching the model weights.

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

Related work in this vault:
- [[toolformer-language-models-teach-themselves]] -- Contrasting approach: Toolformer fine-tunes the full model for tool use, while ToolkenGPT only trains embeddings
- [[react-synergizing-reasoning-and-acting]] -- Both address tool use but at different levels: ReAct through prompting, ToolkenGPT through model architecture
- [[autogen-multi-agent-conversation]] -- The scalability to many tools is relevant to multi-agent systems where agents need diverse tool sets
- [[voyager-open-ended-embodied-agent]] -- The embedding-based approach could be applied to Voyager's skill library concept
- [[rewoo-decoupling-reasoning-observing]] -- Addresses a complementary efficiency concern: reducing token consumption during tool-augmented reasoning
