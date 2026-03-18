#!/bin/bash
# Add ALL 20 StackOne MCP accounts to Claude Code (floods context)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

AUTH=$(echo -n "$STACKONE_API_KEY:" | base64)
URL="https://api.stackone.com/mcp"

echo "Adding all 20 StackOne accounts to Claude Code..."

IFS=',' read -ra ENTRIES <<< "$STACKONE_ACCOUNTS"
for ENTRY in "${ENTRIES[@]}"; do
  ACCOUNT_ID="${ENTRY%%=*}"
  PROVIDER="${ENTRY##*=}"
  claude mcp add --transport http "stackone-${PROVIDER}" "${URL}?x-account-id=${ACCOUNT_ID}" --header "Authorization: Basic $AUTH" > /dev/null 2>&1 || true
  echo "  + stackone-${PROVIDER}"
done

echo "Done. All 20 accounts added — hundreds of tools in context."
