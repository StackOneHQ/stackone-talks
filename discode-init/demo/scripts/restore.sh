#!/bin/bash
# Restore Claude Code MCP state after the demo.
# Restores backed-up config and removes any demo MCPs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../.mcp-backup"
SETTINGS="$HOME/.claude/settings.json"
USER_CONFIG="$HOME/.claude.json"

echo "Restoring Claude Code MCP state..."
echo

# --- Remove demo MCPs first ---
"$SCRIPT_DIR/remove-all.sh" 2>/dev/null || true

# --- Restore backed-up config ---
if [ -d "$BACKUP_DIR" ]; then
  [ -f "$BACKUP_DIR/settings.json" ] && cp "$BACKUP_DIR/settings.json" "$SETTINGS" && echo "  Restored settings.json"
  [ -f "$BACKUP_DIR/.claude.json" ] && cp "$BACKUP_DIR/.claude.json" "$USER_CONFIG" && echo "  Restored .claude.json"
  rm -rf "$BACKUP_DIR"
  echo
  echo "Done. Your original MCP config is restored."
else
  echo "No backup found at $BACKUP_DIR — nothing to restore."
fi
