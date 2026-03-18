#!/bin/bash
# Copy STACKONE_API_KEY from .env to clipboard
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

grep '^STACKONE_API_KEY=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '\n' | pbcopy

echo "Copied STACKONE_API_KEY to clipboard."
