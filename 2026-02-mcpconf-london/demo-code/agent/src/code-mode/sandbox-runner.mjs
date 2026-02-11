/**
 * Sandbox subprocess runner.
 *
 * Reads JSON requests on stdin, executes the code, and writes results to stdout.
 * Uses eval() deliberately — this IS a code execution sandbox.
 *
 * Spawned by PersistentSandbox in sandbox.ts.
 */

import { createInterface } from 'readline';

/**
 * Register MCP tool wrappers as real functions on globalThis.tools.
 *
 * Called from code-mode.ts via sandbox.execute() with JSON data —
 * no string templating needed on the caller side.
 */
globalThis.registerTools = function registerTools(toolDefs, mcpBaseUrl, authHeader) {
  globalThis.tools = {};

  for (const tool of toolDefs) {
    const fnName = tool.name.replace(/-/g, "_");
    globalThis.tools[fnName] = async (args) => {
      const res = await fetch(`${mcpBaseUrl}?x-account-id=${tool.providerId}`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "call-" + Date.now(),
          method: "tools/call",
          params: { name: tool.name, arguments: args },
        }),
      });
      const data = await res.json();
      if (data.result?.content) {
        const tc = data.result.content.find((c) => c.type === "text");
        if (tc?.text) {
          try { return JSON.parse(tc.text); } catch { return tc.text; }
        }
      }
      return data.result || data;
    };
  }

  return "Sandbox ready: " + Object.keys(globalThis.tools).length + " tool wrappers loaded";
};

// --- Generic eval loop ---

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Signal ready
console.log(JSON.stringify({ type: 'ready' }));

rl.on('line', async (line) => {
  try {
    const { id, code } = JSON.parse(line);
    const startTime = Date.now();

    try {
      // Always wrap in async — allows `return` and `await` in all code
      const result = await (0, eval)(`(async () => { ${code} })()`);
      const latencyMs = Date.now() - startTime;

      console.log(JSON.stringify({
        type: 'result',
        id,
        success: true,
        result,
        latencyMs,
      }));
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      console.log(JSON.stringify({
        type: 'result',
        id,
        success: false,
        error: err.message || String(err),
        latencyMs,
      }));
    }
  } catch (parseErr) {
    // Invalid JSON, ignore
  }
});
