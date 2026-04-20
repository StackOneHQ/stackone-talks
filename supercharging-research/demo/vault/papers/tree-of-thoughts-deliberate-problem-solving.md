---
title: "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
authors:
  - "Shunyu Yao"
  - "Dian Yu"
  - "Jeffrey Zhao"
  - "Izhak Shafran"
  - "Thomas L. Griffiths"
  - "Yuan Cao"
  - "Karthik Narasimhan"
date: 2023-05-17
tags: [paper, arxiv, ai-agents, reasoning, planning, tree-search, problem-solving]
source: http://arxiv.org/abs/2305.10601v2
abstract: "Language models are increasingly being deployed for general problem solving across a wide range of tasks, but are still confined to token-level, left-to-right decision-making processes during inference. To surmount these challenges, we introduce a new framework for language model inference, Tree of Thoughts (ToT), which generalizes over the popular Chain of Thought approach to prompting language models."
---

## Summary

Tree of Thoughts (ToT) generalizes chain-of-thought prompting by allowing language models to explore multiple reasoning paths simultaneously. Instead of generating a single linear chain of reasoning, ToT treats each intermediate reasoning step as a "thought" node in a tree, uses the LM to evaluate which thoughts are most promising, and employs search algorithms (BFS or DFS) to navigate the tree. This enables deliberate problem-solving with lookahead and backtracking -- capabilities absent from standard left-to-right generation.

## Key Contributions

- **Thought-level search**: Generalizes chain-of-thought from a single linear chain to a tree of branching possibilities, with each node being a coherent "thought" (a few sentences or a paragraph)
- **Self-evaluation**: The LM evaluates its own intermediate thoughts, scoring them as "sure/maybe/impossible" to guide the search
- **Dramatic improvement on hard tasks**: On Game of 24, GPT-4 with chain-of-thought solves only 4% of problems; with ToT, it solves 74%
- **Domain-general framework**: Works across creative writing, mathematical puzzles, and crossword solving with the same basic mechanism

## Methodology

ToT defines four components:
1. **Thought decomposition**: Break the problem into intermediate steps where each step produces a "thought" (a coherent reasoning unit)
2. **Thought generation**: At each node, sample multiple candidate thoughts using the LM (either independently or sequentially)
3. **State evaluation**: Use the LM to evaluate each candidate thought, assessing whether it leads toward a solution
4. **Search algorithm**: Apply BFS (breadth-first search) or DFS (depth-first search) to explore the tree, pruning unpromising branches

The entire system uses the LM both to generate and evaluate thoughts -- no external reward model or fine-tuning is needed.

## Connections

- Extended by [[lats-language-agent-tree-search]] which adds acting (environment interaction) to the tree search framework
- Shares authors and intellectual lineage with [[react-synergizing-reasoning-and-acting]] -- ToT handles reasoning, ReAct handles reasoning + acting
- The self-evaluation mechanism relates to [[reflexion-language-agents-verbal-reinforcement]]'s self-reflection, but operates at the thought level rather than the episode level
- The deliberate search complements the planning in [[voyager-open-ended-embodied-agent-large-language-models]] which uses iterative prompting rather than tree search
- [[rewoo-decoupling-reasoning-from-observations]] offers an alternative approach to planning that separates reasoning from execution for efficiency
