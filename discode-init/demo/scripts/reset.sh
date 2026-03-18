#!/bin/bash
# Reset Claude Code MCP state for a clean demo start.
# Backs up current config, removes all user/project MCPs, and disables cloud integrations.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../.mcp-backup"
SETTINGS="$HOME/.claude/settings.json"
USER_CONFIG="$HOME/.claude.json"

echo "Resetting Claude Code MCP state for demo..."
echo

# --- Backup current state ---
mkdir -p "$BACKUP_DIR"
[ -f "$SETTINGS" ] && cp "$SETTINGS" "$BACKUP_DIR/settings.json"
[ -f "$USER_CONFIG" ] && cp "$USER_CONFIG" "$BACKUP_DIR/.claude.json"
echo "  Backed up config to $BACKUP_DIR/"

# --- Remove all non-cloud MCP servers ---
echo "Removing MCP servers..."
MCPS=$(claude mcp list 2>/dev/null | grep -v "^Checking" | grep -v "^claude\.ai" | grep -E "^[a-zA-Z]" | sed 's/:.*//' || true)
for NAME in $MCPS; do
  claude mcp remove "$NAME" 2>/dev/null && echo "  - $NAME" || true
done

# Also remove any stackone/disco from project scope
for NAME in $(claude mcp list 2>/dev/null | grep -v "^Checking" | grep -E "^(stackone-|disco-)" | sed 's/:.*//' || true); do
  claude mcp remove "$NAME" 2>/dev/null && echo "  - $NAME" || true
done

# --- Disable cloud integrations via settings ---
if [ -f "$SETTINGS" ]; then
  python3 -c "
import json
with open('$SETTINGS') as f:
    s = json.load(f)
# mcpServers in settings.json controls user-scoped servers
s['mcpServers'] = {}
with open('$SETTINGS', 'w') as f:
    json.dump(s, f, indent=2)
    f.write('\n')
" && echo "  Cleared mcpServers from settings.json"
fi

echo
echo "Done. Clean slate."
echo
echo "NOTE: Cloud integrations (claude.ai Notion, AWS Marketplace, etc.)"
echo "must be disconnected manually in Claude Code settings if they show"
echo "as Connected. Most show 'Needs authentication' and won't load tools."
echo
echo "Run ./scripts/restore.sh after the demo to restore your config."
