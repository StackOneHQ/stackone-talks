/**
 * Embedding engines — naive (off-the-shelf MiniLM) vs fine-tuned MiniLM (method C).
 */

import { env, pipeline } from "@xenova/transformers";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Tool } from "./tools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../models");

// Configure @xenova/transformers
env.localModelPath = MODELS_DIR;
env.allowLocalModels = true;
env.cacheDir = "/tmp/models";

type PipelineInstance = Awaited<ReturnType<typeof pipeline>>;
type EmbedFn = (
  text: string,
  options: { pooling: string; normalize: boolean }
) => Promise<{ data: Float32Array }>;

export interface SearchResult {
  name: string;
  label: string;
  score: number;
}

export class EmbeddingSearch {
  private pipe: PipelineInstance | null = null;
  private toolEmbeddings = new Map<string, Float32Array>();
  private toolLabels = new Map<string, string>();
  private pooling: string;

  constructor(
    private modelName: string,
    private opts: { quantized?: boolean; pooling?: string } = {}
  ) {
    this.pooling = opts.pooling || "mean";
  }

  async initialize(tools: Tool[]): Promise<void> {
    this.pipe = await pipeline("feature-extraction", this.modelName, {
      quantized: this.opts.quantized !== false,
    });

    for (const tool of tools) {
      const emb = await this.embed(tool.description);
      this.toolEmbeddings.set(tool.name, emb);
      this.toolLabels.set(tool.name, tool.label);
    }
  }

  async search(
    query: string,
    tools?: string[],
    limit = 5
  ): Promise<SearchResult[]> {
    const qEmb = await this.embed(query);
    const searchSpace = tools
      ? tools.filter((t) => this.toolEmbeddings.has(t))
      : Array.from(this.toolEmbeddings.keys());

    const scores = searchSpace.map((name) => ({
      name,
      label: this.toolLabels.get(name) || name,
      score: cosine(qEmb, this.toolEmbeddings.get(name)!),
    }));

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
  }

  private async embed(text: string): Promise<Float32Array> {
    const out = await (this.pipe as unknown as EmbedFn)(text, {
      pooling: this.pooling,
      normalize: true,
    });
    return out.data;
  }
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  return dot / (Math.sqrt(nA) * Math.sqrt(nB));
}

/** Off-the-shelf MiniLM-L6-v2 (22M params, 384-dim, mean pooling) */
export function createNaiveSearch(): EmbeddingSearch {
  return new EmbeddingSearch("Xenova/all-MiniLM-L6-v2", {
    quantized: true,
    pooling: "mean",
  });
}

/** Fine-tuned MiniLM-L6-v2 — method C (22M params, 384-dim, mean pooling) */
export function createFinetunedSearch(): EmbeddingSearch {
  const onnxPath = resolve(
    MODELS_DIR,
    "tool-router-minilm/onnx/model_quantized.onnx"
  );
  const modelName = existsSync(onnxPath)
    ? "tool-router-minilm"
    : "Xenova/all-MiniLM-L6-v2";

  if (!existsSync(onnxPath)) {
    console.warn(
      "⚠ Fine-tuned MiniLM ONNX not found, falling back to base MiniLM"
    );
  }

  return new EmbeddingSearch(modelName, {
    quantized: true,
    pooling: "mean",
  });
}
