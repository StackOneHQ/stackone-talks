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

# 2. Check ANTHROPIC_API_KEY
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo ""
  echo "WARNING: ANTHROPIC_API_KEY is not set."
  echo "  Scripts that call Claude will fail without it."
  echo "  You can still use --no-summarize mode for paper collection."
  echo ""
else
  echo "[ok] ANTHROPIC_API_KEY is set"
fi

# 3. Sync dependencies
echo "Installing Python dependencies..."
uv sync
echo "[ok] Dependencies installed"

# 4. Install Playwright browsers
echo "Installing Playwright browsers (chromium)..."
uv run playwright install chromium
echo "[ok] Playwright browsers installed"

# 5. Create vault directories
mkdir -p vault/papers vault/tweets vault/grants vault/daily vault/meetings vault/graphs
echo "[ok] Vault directories created"

# 6. Check .env
if [ ! -f "$ROOT/.env" ]; then
  echo ""
  echo "NOTE: No .env file found. Create one if needed:"
  echo ""
  echo "  ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
else
  echo "[ok] .env file found"
fi

echo ""
echo "Setup complete. Run scripts with:"
echo "  uv run python scripts/auto_research.py \"AI agent architectures\""
echo "  uv run python scripts/full_pipeline.py \"AI agents\" --no-summarize"
