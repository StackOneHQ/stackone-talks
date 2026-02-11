/**
 * Sandbox subprocess runner.
 *
 * Reads JSON requests on stdin, executes the code, and writes results to stdout.
 * Uses eval() deliberately — this IS a code execution sandbox.
 *
 * Spawned by PersistentSandbox in sandbox.ts.
 */

import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Signal ready
console.log(JSON.stringify({ type: 'ready' }));

rl.on('line', async (line) => {
  try {
    const { id, code } = JSON.parse(line);
    const startTime = Date.now();

    try {
      const asyncCode = code.includes('await')
        ? `(async () => { ${code} })()`
        : code;

      // eval is intentional: this is a sandbox for executing LLM-generated code
      const result = await (0, eval)(asyncCode);
      const latencyMs = Date.now() - startTime;

      console.log(JSON.stringify({
        type: 'result',
        id,
        success: true,
        result,
        latencyMs
      }));
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.log(JSON.stringify({
        type: 'result',
        id,
        success: false,
        error: err.message || String(err),
        latencyMs
      }));
    }
  } catch (parseErr) {
    // Invalid JSON, ignore
  }
});
