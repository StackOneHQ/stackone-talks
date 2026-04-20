#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Research Agent Demo Setup ==="

# 1. Check uv
if ! command -v uv &>/dev/null; then
  echo "ERROR: uv is not installed. Install it: https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi
echo "[ok] uv found: $(uv --version)"

# 2. Sync dependencies
echo "Installing Python dependencies..."
uv sync
echo "[ok] Dependencies installed"

# 3. Install Playwright browsers
echo "Installing Playwright browsers (chromium)..."
uv run playwright install chromium
echo "[ok] Playwright browsers installed"

# 4. Check .env
if [ ! -f "$ROOT/.env" ]; then
  echo ""
  echo "WARNING: No .env file found. Create one with:"
  echo ""
  echo "  ANTHROPIC_API_KEY=sk-ant-..."
  echo "  JIRA_URL=https://your-org.atlassian.net"
  echo "  JIRA_EMAIL=you@example.com"
  echo "  JIRA_API_TOKEN=..."
  echo "  JIRA_PROJECT=RES"
  echo "  FIREFLIES_API_KEY=..."
  echo "  GITHUB_PERSONAL_ACCESS_TOKEN=ghp_..."
  echo ""
else
  echo "[ok] .env file found"
fi

echo ""
echo "Setup complete. Run scripts with: uv run python scripts/<script>.py"
