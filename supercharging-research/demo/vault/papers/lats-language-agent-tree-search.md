---
title: "Language Agent Tree Search Unifies Reasoning Acting and Planning in Language Models"
authors:
  - "Andy Zhou"
  - "Kai Yan"
  - "Michal Shlapentokh-Rothman"
  - "Haohan Wang"
  - "Yu-Xiong Wang"
date: 2023-10-06
tags: [paper, arxiv, ai-agents, planning, tree-search, mcts, reasoning]
source: https://arxiv.org/abs/2310.04406
abstract: "While large language models (LMs) have shown potential across a range of decision-making tasks, their reliance on simple acting processes limits their broad deployment as autonomous agents. In this paper, we introduce Language Agent Tree Search (LATS) -- the first general framework that synergizes the capabilities of LMs in reasoning, acting, and planning. By leveraging the in-context learning ability of LMs, we incorporate Monte Carlo Tree Search into the agent pipeline to enable more deliberate and adaptive problem-solving. LATS employs the LM as the agent, value function, and optimizer, repurposing its strengths for enhanced decision-making."
---

## Summary

LATS (Language Agent Tree Search) is the first framework to unify reasoning, acting, and planning in language model agents through Monte Carlo Tree Search (MCTS). While ReAct showed that interleaving thought and action improves agents, and Tree of Thoughts showed that search over reasoning paths helps problem-solving, LATS combines both insights: it performs tree search over ReAct-style reasoning-action trajectories, using the LM itself as both the policy (to generate actions) and the value function (to evaluate states).

The result is an agent that can explore multiple strategies, backtrack from dead ends, and learn from failed attempts within a single episode -- all without any gradient-based training. The LM's versatility is fully exploited: it generates actions, evaluates states, and produces self-reflections that guide future exploration.

## Key Contributions

- **Unified framework**: First to combine LM reasoning, acting, and planning with tree search in a single architecture
- **LM as value function**: Uses the language model to score intermediate states, replacing the handcrafted heuristics typical in MCTS
- **Self-reflection for backtracking**: When a path fails, the agent generates a verbal reflection that guides exploration of alternative branches
- **State-of-the-art results**: Achieves 92.7% pass@1 on HumanEval (programming) with GPT-4 and competitive scores on WebShop (web navigation) without any gradient-based training

## Methodology

LATS adapts Monte Carlo Tree Search for language agents:
1. **Selection**: Navigate the tree using UCT (Upper Confidence Bound for Trees) to balance exploration and exploitation
2. **Expansion**: Generate multiple candidate actions using the LM at the selected node
3. **Evaluation**: Use the LM as a value function to score the resulting states
4. **Simulation**: Roll out trajectories to estimate long-term value
5. **Backpropagation**: Update value estimates up the tree
6. **Reflection**: On failed trajectories, generate self-reflections that are added to context for future exploration

The environment provides external feedback (e.g., test results for code, page content for web navigation), making the search grounded in reality rather than purely speculative.

## Connections

Related work in this vault:
- [[react-synergizing-reasoning-and-acting]] -- Directly extends ReAct by adding tree search over reasoning-action trajectories
- [[tree-of-thoughts-deliberate-problem-solving]] -- Builds on ToT by adding acting and environment interaction to deliberate search
- [[reflexion-verbal-reinforcement]] -- The self-reflection component is inspired by Reflexion's verbal self-reflection mechanism
- [[autogen-multi-agent-conversation]] -- LATS could be integrated into AutoGen as the decision-making engine for individual agents
- [[voyager-open-ended-embodied-agent]] -- The planning capability complements Voyager's skill acquisition approach
