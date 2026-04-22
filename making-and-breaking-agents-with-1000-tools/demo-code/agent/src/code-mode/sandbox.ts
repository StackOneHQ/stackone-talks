/**
 * Persistent Sandbox - inlined from poc-execute/sandbox/persistent.ts
 *
 * Maintains a running Node.js subprocess that can execute multiple code
 * snippets while preserving state (e.g., injected tool wrappers).
 */

import { spawn, type ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

export interface SandboxConfig {
  timeout?: number;
}

export interface ExecutionResult {
  success: boolean;
  result: unknown;
  error?: string;
  latencyMs: number;
}

// Resolve the sandbox runner script path relative to this file.
// Works both under tsx (runs from src/) and compiled JS (runs from dist/).
const SANDBOX_RUNNER_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "sandbox-runner.mjs",
);

export class PersistentSandbox {
  private process: ChildProcess | null = null;
  private pendingCallbacks: Map<
    string,
    { resolve: (result: ExecutionResult) => void; timer: NodeJS.Timeout }
  > = new Map();
  private buffer: string = "";
  private ready: boolean = false;
  private readyPromise: Promise<void>;
  private readyResolve: (() => void) | null = null;
  private config: SandboxConfig;

  constructor(config: SandboxConfig = {}) {
    this.config = { timeout: 30000, ...config };
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Sandbox already started");
    }

    this.process = spawn(
      "node",
      ["--experimental-vm-modules", SANDBOX_RUNNER_PATH],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_NO_WARNINGS: "1" },
      }
    );

    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleOutput(data.toString());
    });

    this.process.stderr?.on("data", (_data: Buffer) => {
      // Suppress sandbox stderr noise during demo
    });

    this.process.on("close", (code) => {
      this.process = null;
      this.ready = false;
      for (const [_id, { resolve, timer }] of this.pendingCallbacks) {
        clearTimeout(timer);
        resolve({
          success: false,
          result: null,
          error: `Sandbox process exited with code ${code}`,
          latencyMs: 0,
        });
      }
      this.pendingCallbacks.clear();
    });

    await this.readyPromise;
  }

  private handleOutput(data: string): void {
    this.buffer += data;

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (message.type === "ready") {
          this.ready = true;
          this.readyResolve?.();
        } else if (message.type === "result") {
          const callback = this.pendingCallbacks.get(message.id);
          if (callback) {
            clearTimeout(callback.timer);
            this.pendingCallbacks.delete(message.id);
            callback.resolve({
              success: message.success,
              result: message.result,
              error: message.error,
              latencyMs: message.latencyMs || 0,
            });
          }
        }
      } catch {
        // Not JSON, ignore
      }
    }
  }

  async execute(code: string): Promise<ExecutionResult> {
    if (!this.process || !this.ready) {
      throw new Error("Sandbox not started or not ready");
    }

    const id = randomUUID();
    const startTime = Date.now();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        resolve({
          success: false,
          result: null,
          error: `Execution timed out after ${this.config.timeout}ms`,
          latencyMs: Date.now() - startTime,
        });
      }, this.config.timeout);

      this.pendingCallbacks.set(id, { resolve, timer });

      const request = JSON.stringify({ id, code }) + "\n";
      this.process?.stdin?.write(request);
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.ready = false;
    this.pendingCallbacks.clear();
  }

  isRunning(): boolean {
    return this.process !== null && this.ready;
  }
}

export async function createPersistentSandbox(
  config?: SandboxConfig
): Promise<PersistentSandbox> {
  const sandbox = new PersistentSandbox(config);
  await sandbox.start();
  return sandbox;
}
