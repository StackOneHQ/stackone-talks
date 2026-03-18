#!/bin/bash
# Add a few StackOne MCP accounts to Claude Code (small context, works fine)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

AUTH=$(echo -n "$STACKONE_API_KEY:" | base64)
URL="https://api.stackone.com/mcp"

echo "Adding 3 StackOne accounts to Claude Code..."

IFS=',' read -ra ENTRIES <<< "$STACKONE_FEW"
for ENTRY in "${ENTRIES[@]}"; do
  ACCOUNT_ID="${ENTRY%%=*}"
  PROVIDER="${ENTRY##*=}"
  claude mcp add --transport http "stackone-${PROVIDER}" "${URL}?x-account-id=${ACCOUNT_ID}" --header "Authorization: Basic $AUTH" > /dev/null 2>&1 || true
  echo "  + stackone-${PROVIDER}"
done

echo "Done. 3 accounts added — manageable tool count."
