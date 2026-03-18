#!/bin/bash
# Add the Disco search MCP server to Claude Code (single smart tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Adding Disco search MCP server to Claude Code..."

claude mcp add disco-search \
  --transport stdio \
  -- \
  bun run "$DEMO_DIR/src/disco-mcp-server.ts"

echo "Done. One tool: disco_search — routes to the right tool in <5ms."
