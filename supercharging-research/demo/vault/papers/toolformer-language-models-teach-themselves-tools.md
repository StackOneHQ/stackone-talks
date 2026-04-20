---
title: "Toolformer: Language Models Can Teach Themselves to Use Tools"
authors:
  - "Timo Schick"
  - "Jane Dwivedi-Yu"
  - "Roberto Dessi"
  - "Roberta Raileanu"
  - "Maria Lomeli"
  - "Luke Zettlemoyer"
  - "Nicola Cancedda"
  - "Thomas Scialom"
date: 2023-02-09
tags: [paper, arxiv, ai-agents, tool-use, self-supervised, api-calls]
source: http://arxiv.org/abs/2302.04761v1
abstract: "Language models (LMs) exhibit remarkable abilities to solve new tasks from just a few examples or textual instructions, especially at scale. They also, paradoxically, struggle with basic functionality, such as arithmetic or factual lookup, where much simpler and smaller models excel. In this paper, we show that LMs can teach themselves to use external tools via simple APIs and achieve the best of both worlds."
---

## Summary

Toolformer demonstrates that language models can be trained to autonomously decide when and how to call external APIs, without requiring extensive human annotation of tool-use examples. The model learns in a self-supervised manner to insert API calls into text when doing so improves prediction quality. This bridges the gap between LLMs' strong language abilities and their weakness at tasks like arithmetic and factual retrieval.

## Key Contributions

- **Self-supervised tool learning**: The model generates its own training data for tool use by sampling potential API calls, executing them, and keeping only those that improve perplexity -- no human annotation of tool calls needed
- **Multi-tool integration**: Incorporates a calculator, Q&A system, two search engines, a translation system, and a calendar within a single model
- **Preserved language ability**: Tool augmentation does not degrade the model's core language modeling performance
- **Competitive with larger models**: A 6.7B parameter Toolformer achieves zero-shot performance competitive with much larger models (GPT-3 175B) on several benchmarks

## Methodology

1. Sample potential API call positions in a large text corpus using in-context learning
2. Execute each candidate API call to get results
3. Filter: keep only API calls where inserting the call and its result reduces the loss on subsequent tokens (i.e., the tool genuinely helps)
4. Fine-tune the language model on the augmented dataset containing tool calls
5. At inference time, the model naturally generates API call tokens when it determines a tool would be helpful

## Connections

- Contrasts with [[toolkengpt-augmenting-frozen-language-models-massive-tools]] which uses tool embeddings instead of fine-tuning
- The self-supervised tool learning complements [[react-synergizing-reasoning-and-acting]] which uses prompting rather than training for tool use
- Relevant to [[autogen-enabling-next-gen-llm-applications-multi-agent]] where agents are equipped with tool-calling capabilities
- [[voyager-open-ended-embodied-agent-large-language-models]] applies similar tool-use principles in an embodied setting (Minecraft)
- [[rewoo-decoupling-reasoning-from-observations]] addresses the efficiency cost of interleaved tool calling
