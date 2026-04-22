---
title: "Finetuning LLMs with New Attention Mechanisms: A Research Brief"
authors:
  - "Research Brief (multi-source synthesis)"
date: 2026-04-21
tags: [research-brief, attention, fine-tuning, PEFT, GQA, MLA, differential-attention, flash-attention, sparse-attention, linear-attention, LoRA, efficiency]
source: https://arxiv.org/abs/2410.05258
abstract: "A curated synthesis of 20+ recent papers and technical reports (2024-2026) on fine-tuning large language models with novel attention mechanisms. Covers differential attention, multi-head latent attention, grouped query attention, sparse and linear attention, attention-aware PEFT methods, and architecture conversion techniques."
---

## Overview

The attention mechanism remains the central design axis for LLM efficiency and capability. Between 2024 and early 2026, research has moved beyond simply inventing new attention variants toward a richer question: **how do we retrofit, fine-tune, and convert existing pretrained models to use better attention architectures?** This brief catalogues the key results.

---

## 1. New Attention Architectures

### 1.1 Differential Attention

**Differential Transformer** [Ye et al., 2024] from Microsoft Research and Tsinghua University partitions query and key vectors into two groups, computes two separate softmax attention maps, and takes their *difference* as the final attention score. This cancels common-mode noise, producing sharper, more relevant attention patterns. Diff Transformer outperforms standard Transformers on long-context retrieval, key-information extraction, and reduces the "lost-in-the-middle" problem. The architecture was later studied in the context of coupled dynamics [Gahtan & Bronstein, 2026], which showed that at 350M parameters, Differential Attention (18.93 perplexity) overtakes coupled QK methods (19.35).

- **Paper**: [Differential Transformer](https://arxiv.org/abs/2410.05258) — arXiv 2410.05258
- **Analysis**: [VentureBeat coverage](https://venturebeat.com/ai/microsofts-differential-transformer-cancels-attention-noise-in-llms)

### 1.2 Multi-Head Latent Attention (MLA)

**DeepSeek-V2** [DeepSeek-AI, 2024] introduced MLA, which compresses key-value representations into a low-dimensional latent vector, reducing the KV cache by a factor of 57x compared to standard MHA while maintaining expressivity. MLA was carried forward into DeepSeek-V3 (December 2024) and became a defining architectural choice for efficient inference.

- **Paper**: [DeepSeek-V2](https://arxiv.org/abs/2405.04434) — arXiv 2405.04434

### 1.3 Native Sparse Attention (NSA)

**NSA** [DeepSeek, 2025] introduces a hardware-aligned, natively trainable sparse attention mechanism using a dynamic hierarchical strategy: coarse-grained token compression + fine-grained token selection + sliding windows. NSA achieves up to 9.0x forward and 6.0x backward speedup at 64K context length during training, with 11.6x decoding speedup, while matching or exceeding full-attention quality. Accepted at ACL 2025.

- **Paper**: [Native Sparse Attention](https://arxiv.org/abs/2502.11089) — arXiv 2502.11089

### 1.4 Grouped Query Attention (GQA)

**GQA** [Ainslie et al., 2023] uses an intermediate number of KV heads (between 1 and the number of query heads), striking a balance between MHA quality and MQA speed. The original paper showed that existing MHA checkpoints can be *uptrained* to GQA with only 5% of original pretraining compute. Adopted by LLaMA 2, LLaMA 3, Mistral, and many subsequent models. Inference is 30-40% faster than MHA with near-equivalent accuracy.

- **Paper**: [GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245) — arXiv 2305.13245

### 1.5 Tucker Attention (Unified View)

**Tucker Attention** [Klein et al., 2026] proposes a generalized tensor decomposition view that encompasses GQA, MLA, and MHA as special cases. Using Tucker decomposition on the weight objects in self-attention, it achieves an order of magnitude fewer parameters for comparable validation metrics, while remaining fully compatible with FlashAttention and RoPE. This work provides the first theoretical framework unifying all major attention variants.

- **Paper**: [Tucker Attention](https://arxiv.org/abs/2603.30033) — arXiv 2603.30033

---

## 2. Converting Pretrained Models to New Attention Architectures

### 2.1 TransMLA: MHA/GQA to MLA Conversion

**TransMLA** [Peking University & Xiaomi, 2025] provides a framework for converting any GQA-based pretrained model (LLaMA-3, Qwen-2.5, Mistral, Mixtral, Gemma-2, Phi-4) into an MLA-based model. The authors prove that MLA is strictly more expressive than GQA at the same KV cache budget. TransMLA compresses 93% of the KV cache in LLaMA-2-7B, achieving 10.6x inference speedup at 8K context, requiring only 6B tokens of fine-tuning. Received NeurIPS 2025 Spotlight. Adopted by Ant Group's Ling-2.5-1T model (February 2026).

- **Paper**: [TransMLA: Multi-Head Latent Attention Is All You Need](https://arxiv.org/abs/2502.07864) — arXiv 2502.07864

### 2.2 Attention Editing: Architecture-Agnostic Conversion

**Attention Editing** [Cheng et al., 2026] presents a practical framework for converting already-trained LLMs to new attention architectures (MLA, gated sliding-window attention) without re-pretraining. Uses progressive distillation: (1) layer-wise teacher-forced optimization with intermediate activation supervision, and (2) model-level distillation on next-token distributions. Applied to Qwen3-8B and Qwen3-30B-A3B, maintaining competitive performance with substantial efficiency gains.

- **Paper**: [Attention Editing](https://arxiv.org/abs/2604.05688) — arXiv 2604.05688

### 2.3 CARE: Covariance-Aware MLA Conversion

**CARE** [Zhou et al., 2026] improves GQA-to-MLA conversion with activation-preserving factorization (aligning approximation with actual input activations, not just weights), adjusted-rank allocation across layers, and KV-parity mapping. On Qwen3 and LLaMA-3.1 families (4B-70B), CARE reduces one-shot perplexity by up to 215x and improves mean accuracy by up to 1.70x over uniform-rank SVD at matched KV budgets.

- **Paper**: [CARE: Covariance-Aware and Rank-Enhanced Decomposition for Enabling MLA](https://arxiv.org/abs/2603.17946) — arXiv 2603.17946

### 2.4 MHA2MLA: Data-Efficient Transition

**MHA2MLA** [2025] proposes partial-RoPE removal and low-rank approximation strategies for transitioning MHA to MLA, recovering performance with only 0.6-1% of the original training data. KV cache of LLaMA2-7B reduced by 92.19% with only a 1% drop in LongBench performance.

- **Paper**: [Towards Economical Inference: Enabling DeepSeek's MLA in Any Transformer-based LLMs](https://arxiv.org/abs/2502.14837) — arXiv 2502.14837, ACL 2025

---

## 3. Linearizing Attention via Fine-Tuning

### 3.1 LoLCATs: Low-Rank Linear Conversion via Attention Transfer

**LoLCATs** [Hazy Research / Stanford, 2024] replaces softmax attention with closely-approximating linear attention by training the linear layers to match softmax outputs (attention transfer), then recovers quality with LoRA. Uses only 0.2% of parameters and 0.4% of training tokens compared to prior linearization methods. First to linearize 70B and 405B LLMs, closing ~78% of the 5-shot MMLU gap between Transformers and linearized variants.

- **Paper**: [LoLCATs: On Low-Rank Linearizing of Large Language Models](https://arxiv.org/abs/2410.10254) — arXiv 2410.10254
- **Blog**: [Hazy Research](https://hazyresearch.stanford.edu/blog/2024-10-14-lolcats-p1)

### 3.2 The Mamba in the Llama

**Mamba-in-Llama** [Junxiong Wang et al., 2024] distills Transformer attention into hybrid Mamba (linear RNN) models by reusing attention layer weights. The hybrid model (retaining 25% attention layers) matches the original Transformer on chat benchmarks and exhibits natural length extrapolation (perfect needle-in-a-haystack at 20x distillation length). NeurIPS 2024.

- **Paper**: [The Mamba in the Llama: Distilling and Accelerating Hybrid Models](https://arxiv.org/abs/2408.15237) — arXiv 2408.15237

### 3.3 Liger: Linearizing LLMs to Gated Recurrent Structures

**Liger** [Lan et al., 2025] converts pretrained LLMs into gated linear recurrent models *without adding extra parameters*, repurposing pretrained key matrix weights to construct gating mechanisms. With LoRA fine-tuning, Liger Attention recovers 93% of Transformer LLM quality at 0.02% of pretraining tokens, validated on 1B-8B parameter models.

- **Paper**: [Liger: Linearizing Large Language Models to Gated Recurrent Structures](https://arxiv.org/abs/2503.01496) — arXiv 2503.01496

---

## 4. Learned Sparse Attention for Fine-Tuning

### 4.1 SeerAttention: Learned Block Sparsity

**SeerAttention** [Microsoft, 2024] augments attention with a learnable gate (inspired by MoE) that selectively activates important blocks within the attention map. When applied to long-context fine-tuning with YaRN, achieves 90% sparsity at 32K context with minimal perplexity loss, yielding 5.67x speedup over FlashAttention-2. Extended to **SeerAttention-R** for reasoning tasks via distillation objectives.

- **Paper**: [SeerAttention: Learning Intrinsic Sparse Attention in Your LLMs](https://arxiv.org/abs/2410.13276) — arXiv 2410.13276
- **Code**: [github.com/microsoft/SeerAttention](https://github.com/microsoft/SeerAttention)

### 4.2 Correlation-Aware Select and Merge Attention

**CoSM Attention** [Wang et al., 2024] introduces correlation-aware selection and merging for efficient sparse attention, combined with novel positional encoding augmentation. Enables fine-tuning LLaMA2-7B at 32K sequence length on a single A100, with extrapolation to 1M+ context and 100% passkey accuracy at 4M tokens — a 64x resource reduction over full attention.

- **Paper**: [Correlation-Aware Select and Merge Attention](https://arxiv.org/abs/2410.04211) — arXiv 2410.04211

### 4.3 Latent-Condensed Attention (LCA)

**LCA** [You et al., 2026] directly condenses context within MLA's latent space, separately aggregating semantic vectors via query-aware pooling and preserving positional keys via anchor selection. Architecture-agnostic (works with both MLA and GQA). Achieves 2.5x prefilling speedup and 90% KV cache reduction at 128K context with provable length-independent error bounds.

- **Paper**: [Latent-Condensed Transformer for Efficient Long Context Modeling](https://arxiv.org/abs/2604.12452) — arXiv 2604.12452

---

## 5. Attention-Aware Parameter-Efficient Fine-Tuning

### 5.1 Theoretical Insights: Which Attention Matrices to Fine-Tune

[Yao et al., 2024] (IJCAI 2025) provide theoretical grounding for two key phenomena: (1) fine-tuning W_q and W_v alone is as good or better than fine-tuning all three matrices (W_q, W_k, W_v), and (2) assigning a *higher learning rate* to W_v accelerates convergence and improves performance. This directly informs LoRA rank allocation strategies.

- **Paper**: [Theoretical Insights into Fine-Tuning Attention Mechanism](https://arxiv.org/abs/2410.02247) — arXiv 2410.02247

### 5.2 DoRA: Weight-Decomposed Low-Rank Adaptation

**DoRA** [NVIDIA, 2024] decomposes pretrained weights into magnitude and direction components, applying LoRA only to the directional component. This better mimics full fine-tuning's learning dynamics (which make subtle directional changes that standard LoRA cannot). Improves accuracy by up to 3.7% over LoRA on LLaMA-7B across commonsense reasoning, visual instruction tuning, and multimodal understanding. ICML 2024 Oral.

- **Paper**: [DoRA: Weight-Decomposed Low-Rank Adaptation](https://arxiv.org/abs/2402.09353) — arXiv 2402.09353

### 5.3 Spectrum: SNR-Based Layer Selection

**Spectrum** [Cognitive Computations et al., 2024] identifies the most informative layers using signal-to-noise ratio analysis and selectively fine-tunes only the top 25-50%. Spectrum-25 (top 25% of layers) reduces memory by 23% and training time by 37% while matching or exceeding full fine-tuning on math reasoning benchmarks.

- **Paper**: [Spectrum: Targeted Training on Signal to Noise Ratio](https://arxiv.org/abs/2406.06623) — arXiv 2406.06623

### 5.4 GQA-Aware LoRA: Co-Localization in GQA Transformers

**LS-LoRA + GARFA** [Rao, 2026] investigates which layers in GQA transformers are most sensitive to task correctness vs. where RoPE adaptation has the greatest leverage. Discovers strong *anti-localization* (task-sensitive layers concentrate late, RoPE-influential layers dominate early). The combined intervention on sensitivity-identified layers approaches Claude 3.5 Haiku on HumanEval+ (67.1% vs 68.3%) at $100 total compute.

- **Paper**: [Sensitivity-Positional Co-Localization in GQA Transformers](https://arxiv.org/abs/2604.07766) — arXiv 2604.07766

### 5.5 Trans-PEFT: Transferable Adapters Across Base Model Updates

**Trans-PEFT** [Gu et al., 2025] observes that continual training primarily affects FFN task-specific knowledge while leaving the task-specific pattern in attention relatively stable. By focusing PEFT on the attention pattern while reducing dependence on FFN-stored knowledge, fine-tuned adapters survive base model updates without re-tuning. Validated across 7 base models and 12 datasets.

- **Paper**: [Trans-PEFT: Transferable Parameter-Efficient Fine-Tuning on Evolving Base Models](https://arxiv.org/abs/2506.06844) — arXiv 2506.06844

---

## 6. FlashAttention and Hardware-Level Efficiency

### 6.1 FlashAttention-3

**FlashAttention-3** [Dao et al., 2024] exploits Hopper GPU asynchrony for overlapping computation and data movement, interleaves block-wise matmul and softmax, and adds FP8 block quantization. Achieves up to 840 TFLOPs/s in BF16 (85% utilization) and 1.3 PFLOPs/s in FP8 on H100 GPUs. NeurIPS 2024.

- **Paper**: [FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision](https://arxiv.org/abs/2407.08608) — arXiv 2407.08608

### 6.2 Attn-QAT: 4-Bit Attention Training

**Attn-QAT** [Zhang et al., 2026] presents the first systematic study of 4-bit quantization-aware training for attention, identifying that naive QAT causes instability due to precision mismatches between forward and backward passes. Proposes matched low-precision recomputation, delivering up to 1.5x speedup on RTX 5090 without quality loss.

- **Paper**: [Attn-QAT: 4-Bit Attention With Quantization-Aware Training](https://arxiv.org/abs/2603.00040) — arXiv 2603.00040

### 6.3 AVO: Evolved Attention Kernels

**AVO** [NVIDIA et al., 2026] uses agentic evolutionary search to discover attention kernel implementations that outperform cuDNN by 3.5% and FlashAttention-4 by 10.5% on Blackwell B200 GPUs. Gains transfer from MHA to GQA with only 30 minutes of additional adaptation.

- **Paper**: [AVO: Agentic Variation Operators for Autonomous Evolutionary Search](https://arxiv.org/abs/2603.24517) — arXiv 2603.24517

---

## 7. Surveys and Meta-Analyses

### 7.1 Efficient Attention Mechanisms for LLMs: A Survey

Comprehensive 2025 survey covering linear attention, sparse attention, and efficient attention. Categorises the full landscape of methods addressing the quadratic complexity bottleneck.

- **Paper**: [Efficient Attention Mechanisms for Large Language Models: A Survey](https://arxiv.org/abs/2507.19595) — arXiv 2507.19595

### 7.2 Sebastian Raschka: Visual Guide to Attention Variants

Practical visual guide comparing MHA, GQA, MQA, MLA, and sliding-window attention with implementation details and trade-offs.

- **Blog**: [A Visual Guide to Attention Variants in Modern LLMs](https://magazine.sebastianraschka.com/p/visual-attention-variants)

---

## Key Takeaways

1. **Architecture conversion is now practical**: TransMLA, Attention Editing, CARE, and LoLCATs demonstrate that pretrained models can be converted to more efficient attention architectures with modest fine-tuning budgets (0.02-1% of pretraining tokens).

2. **MLA is strictly more expressive than GQA at equal KV budget**: Multiple papers [TransMLA, Tucker Attention] prove this theoretically and empirically, explaining the industry trend toward MLA adoption.

3. **Sparse attention is best when *learned*, not hand-designed**: SeerAttention, NSA, and DAM all show that dynamic, context-aware sparsity patterns dramatically outperform fixed patterns (block-sparse, sliding window alone).

4. **Not all attention weights are equal for fine-tuning**: Theoretical results show W_v matters most, W_k least. Layer-level SNR analysis (Spectrum) and sensitivity profiling (LS-LoRA) both confirm that targeting a small subset of parameters achieves comparable or better results than full fine-tuning.

5. **Hardware co-design is accelerating**: FlashAttention-3, Attn-QAT, and AVO show that attention efficiency gains increasingly come from kernel-level and hardware-aware optimizations, not just algorithmic changes.

6. **Linearization is viable at scale**: LoLCATs and Mamba-in-Llama prove that 70B-405B parameter models can be converted to subquadratic architectures with acceptable quality trade-offs.

## Connections

- [[survey-architectures]] — Agent architectures survey covers attention as a component of agent design
- [[survey-memory]] — Memory systems survey relates to KV cache efficiency and long-context attention
- [[survey-tools]] — Tool use papers connect to efficient inference enabling real-time agent tool calling
