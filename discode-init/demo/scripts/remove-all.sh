#!/bin/bash
# Remove all StackOne MCP servers from Claude Code
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

echo "Removing all StackOne MCP servers..."

IFS=',' read -ra ENTRIES <<< "$STACKONE_ACCOUNTS"
for ENTRY in "${ENTRIES[@]}"; do
  PROVIDER="${ENTRY##*=}"
  NAME="stackone-${PROVIDER}"
  claude mcp remove "$NAME" 2>/dev/null && echo "  - $NAME" || true
done

# Also remove disco
claude mcp remove disco-search 2>/dev/null && echo "  - disco-search" || true

echo "Done. All cleaned up."
