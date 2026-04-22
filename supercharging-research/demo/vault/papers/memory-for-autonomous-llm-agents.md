---
title: "Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers"
authors:
  - "Pengfei Du"
date: 2026-03-08
tags: [paper, arxiv, memory, llm-agents, retrieval, reflection, ai-agents]
source: https://arxiv.org/abs/2603.07670
abstract: "Memory -- the ability to persist, organize, and selectively recall information across interactions -- transforms stateless text generators into truly adaptive systems. This survey formalizes agent memory as a write-manage-read loop integrated with perception and action, introducing a three-dimensional taxonomy spanning temporal scope, representational substrate, and control policy, and examines five mechanism families in depth."
---

## Summary

This survey provides the most comprehensive treatment of memory systems for LLM agents as of early 2026. The central framing is that memory transforms stateless language models into adaptive agents capable of learning and evolving across interactions. The author formalises agent memory as a **write-manage-read loop** tightly coupled with perception and action cycles.

The paper introduces a three-dimensional taxonomy: **temporal scope** (working, episodic, semantic, prospective memory), **representational substrate** (natural language, embeddings, structured graphs, parametric weights), and **control policy** (rule-based, learned, hybrid). This taxonomy is used to organise and compare five major mechanism families that have emerged in the field.

Beyond the survey itself, the paper makes a strong argument for moving evaluation from static benchmarks toward multi-session agentic tests that interleave memory with decision-making, analysing four recent benchmarks that expose current system limitations.

## Key Contributions

- **Three-dimensional taxonomy** of agent memory covering temporal scope, representational substrate, and control mechanisms
- **Five mechanism families** catalogued: context-resident compression, retrieval-augmented stores, reflective self-improvement, hierarchical virtual context, and policy-learned management
- **Evaluation critique**: argues for multi-session agentic tests over static benchmarks, analyses four recent benchmarks
- **Engineering considerations**: write-path filtering, contradiction resolution, latency constraints, and privacy protections
- **Open research agenda**: continual consolidation, causally grounded retrieval, trustworthy reflection, learned forgetting, and multimodal embodied memory

## Methodology

The survey methodology covers work from 2022 through early 2026, organising the literature through the proposed three-dimensional taxonomy. Each of the five mechanism families is examined through representative systems, analysing their write, manage, and read operations. Application domains reviewed include personal assistants, coding agents, open-world games, scientific reasoning, and multi-agent collaboration.

## Connections

- [[a-mem-agentic-memory-for-llm-agents]] — A-MEM's Zettelkasten-inspired dynamic memory is one of the key systems this survey categorises
- [[reflexion-verbal-reinforcement]] — Reflexion's verbal self-reflection is an instance of the reflective self-improvement memory mechanism
- [[generative-agents-simulacra]] — Generative agents' memory architecture is a foundational example of the retrieval-augmented store pattern
- [[voyager-open-ended-embodied-agent]] — Voyager's skill library represents a form of the hierarchical virtual context mechanism
