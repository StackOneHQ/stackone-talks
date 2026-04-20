---
title: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation"
authors:
  - "Qingyun Wu"
  - "Gagan Bansal"
  - "Jieyu Zhang"
  - "Yiran Wu"
  - "Beibin Li"
  - "Erkang Zhu"
  - "Li Jiang"
  - "Xiaoyun Zhang"
  - "Shaokun Zhang"
  - "Jiale Liu"
  - "Ahmed Hassan Awadallah"
  - "Ryen W. White"
  - "Doug Burger"
  - "Chi Wang"
date: 2023-08-16
tags: [paper, arxiv, ai-agents, multi-agent, conversation, framework, orchestration]
source: https://arxiv.org/abs/2308.08155
abstract: "AutoGen is an open-source framework that allows developers to build LLM applications via multiple agents that can converse with each other to accomplish tasks. AutoGen agents are customizable, conversable, and can operate in various modes that employ combinations of LLMs, human inputs, and tools. Using AutoGen, developers can also flexibly define agent interaction behaviors. Both natural language and computer code can be used to program flexible conversation patterns for different applications. AutoGen serves as a generic infrastructure for building diverse applications of various complexities and LLM configurations."
---

## Summary

AutoGen is an open-source multi-agent conversation framework from Microsoft Research. It enables developers to build complex LLM applications by defining multiple agents that converse with each other. Each agent can be configured with different combinations of LLM capabilities, human oversight, and tool access, making the framework highly flexible. The key insight is that many complex tasks are best solved through structured conversation between specialized agents rather than a single monolithic prompt.

The framework's strength lies in its composability: agents are building blocks that can be arranged into arbitrary conversation topologies. A coding task might pair an AssistantAgent with a code-executing UserProxyAgent; a research task might chain a literature searcher, a summarizer, and a critic in a group chat. The same primitives serve vastly different applications.

## Key Contributions

- **Conversable agent abstraction**: A unified agent interface that supports LLM inference, human input, tool execution, or any combination, making agents interchangeable and composable
- **Flexible conversation patterns**: Both natural language and code can define how agents interact -- sequential, group chat, hierarchical, or custom topologies
- **Human-in-the-loop by design**: Agents can seamlessly incorporate human feedback at configurable points, enabling varying levels of autonomy
- **Generic infrastructure**: Demonstrated across mathematics, coding, question answering, operations research, online decision-making, and entertainment

## Methodology

AutoGen provides two core agent types:
1. **AssistantAgent**: Backed by an LLM, handles reasoning and generation tasks
2. **UserProxyAgent**: Executes code, calls tools, or solicits human input

Developers compose these into conversation flows. For example, a coding task might involve an AssistantAgent that writes code and a UserProxyAgent that executes it, with the conversation continuing until tests pass. More complex patterns chain multiple specialized agents.

The framework handles message routing, termination conditions, and state management, letting developers focus on the task decomposition rather than infrastructure.

## Connections

Related work in this vault:
- [[react-synergizing-reasoning-and-acting]] -- Builds on single-agent foundations like ReAct and extends them to multi-agent settings
- [[reflexion-verbal-reinforcement]] -- The multi-agent conversation paradigm complements single-agent self-reflection
- [[toolformer-language-models-teach-themselves]] -- Tool-use within agents connects to Toolformer's approach to learning tool calls
- [[toolkengpt-tool-embeddings]] -- Scalable tool integration via embeddings is relevant to equipping agents with diverse tool sets
- [[generative-agents-simulacra]] -- The agent memory and state management parallels Generative Agents at a more practical engineering level
- [[lats-language-agent-tree-search]] -- LATS could be used within an AutoGen agent to improve individual agent decision-making
