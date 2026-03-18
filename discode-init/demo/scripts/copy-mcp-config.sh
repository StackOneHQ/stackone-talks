#!/bin/bash
# Copy the "All servers at once" MCP JSON config to clipboard
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../test-mcp-configs.md"

# Extract the first JSON code block (All servers at once)
awk '/^## All servers at once/,/^---$/{if(/^```json$/){p=1;next} if(/^```$/){p=0} if(p)print}' "$CONFIG_FILE" | pbcopy

echo "Copied 'All servers at once' MCP config to clipboard."
