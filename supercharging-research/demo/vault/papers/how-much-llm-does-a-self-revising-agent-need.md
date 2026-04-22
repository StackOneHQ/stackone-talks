---
title: "How Much LLM Does a Self-Revising Agent Actually Need?"
authors:
  - "Sungwoo Jung"
  - "Seonil Son"
date: 2026-04-08
tags: [paper, arxiv, reflection, planning, agent-design, self-revision, ai-agents]
source: https://arxiv.org/abs/2604.07236
abstract: "This paper investigates which aspects of agent performance derive from language models versus explicit structural design. We introduce a declared reflective runtime protocol that externalizes agent state, confidence signals, guarded actions, and hypothetical transitions into inspectable runtime structure, isolating components including posterior belief tracking, explicit world-model planning, symbolic in-episode reflection, and sparse LLM-based revision."
---

## Summary

This paper asks a provocative and timely question: when we build agents that use LLMs for self-revision, how much of the performance actually comes from the LLM versus the explicit structural scaffolding around it? The answer is surprising — explicit planning contributes far more than LLM-based reflection.

The authors introduce a **declared reflective runtime protocol** that externalises agent state, confidence signals, and decision points into inspectable structures rather than keeping them implicit within neural forward passes. This makes it possible to directly measure the contribution of each component. They test four progressively structured agents on noisy Collaborative Battleship across 54 games.

The key finding: **planning improved win rate by +24.1 percentage points**, while LLM revision at ~4.3% of turns produced minimal gains (+0.005 F1), with win rates actually *declining* from 31 to 29 out of 54. This challenges the assumption that more LLM involvement always helps and suggests the field should invest more in structural agent design.

## Key Contributions

- **Declared reflective runtime protocol** that makes agent internals inspectable and measurable
- **Component decomposition** isolating four elements: posterior belief tracking, world-model planning, symbolic reflection, and LLM revision
- **Empirical evidence** that explicit planning (+24.1pp win rate) vastly outperforms LLM-based revision (+0.005 F1) in structured tasks
- **Methodological contribution**: a framework for rigorously measuring when LLM intervention adds value versus when simpler structural approaches suffice

## Methodology

Four agents with progressively more structure are tested on noisy Collaborative Battleship (54 games each). The declared reflective runtime protocol externalises state, confidence signals, guarded actions, and hypothetical transitions so each component's contribution can be measured independently. The four isolated components are: (1) posterior belief tracking, (2) explicit world-model planning, (3) symbolic in-episode reflection, and (4) sparse LLM-based revision. This ablation design directly quantifies the marginal value of each layer.

## Connections

- [[reflexion-verbal-reinforcement]] — Reflexion relies heavily on LLM-based verbal reflection; this paper's findings suggest those gains may be more situational than assumed
- [[react-synergizing-reasoning-and-acting]] — ReAct interleaves reasoning and acting; this work questions whether the reasoning component needs to be LLM-generated
- [[tree-of-thoughts-deliberate-problem-solving]] — ToT's explicit planning structures align with this paper's finding that structural planning outperforms neural reflection
- [[lats-language-agent-tree-search]] — LATS combines tree search with LLM evaluation; the findings here suggest the search structure may matter more than the LLM critic
