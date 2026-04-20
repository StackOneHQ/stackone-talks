#!/usr/bin/env python3
"""Orchestrate the full research pipeline: papers + tweets + index rebuild.

Usage:
    uv run python scripts/full_pipeline.py "AI agent architectures"
"""

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault"
SCRIPTS_DIR = Path(__file__).resolve().parent


def run_script(name: str, topic: str) -> bool:
    """Run a sibling script, return True on success."""
    script = SCRIPTS_DIR / name
    result = subprocess.run(
        [sys.executable, str(script), topic],
        cwd=script.parent.parent,
    )
    return result.returncode == 0


def rebuild_index():
    """Regenerate vault/_index.md with links to every note."""
    index = VAULT_DIR / "_index.md"
    lines = [
        "---",
        f"updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "---",
        "",
        "# Research Vault Index",
        "",
    ]

    for section in ("papers", "tweets", "meetings", "graphs"):
        section_dir = VAULT_DIR / section
        notes = sorted(section_dir.glob("*.md"))
        lines.append(f"## {section.title()}")
        lines.append("")
        if notes:
            for note in notes:
                lines.append(f"- [[{section}/{note.stem}]]")
        else:
            lines.append("_No notes yet._")
        lines.append("")

    index.write_text("\n".join(lines) + "\n")
    print(f"Index rebuilt: {index}")


def main():
    parser = argparse.ArgumentParser(description="Run the full research pipeline")
    parser.add_argument("topic", help="Research topic")
    args = parser.parse_args()

    print(f"{'=' * 50}")
    print(f"  Full Research Pipeline: {args.topic}")
    print(f"{'=' * 50}\n")

    print("--- Stage 1: arXiv paper search & summarisation ---\n")
    run_script("auto_research.py", args.topic)

    print("\n--- Stage 2: Tweet collection ---\n")
    run_script("collect_tweets.py", args.topic)

    print("\n--- Stage 3: Rebuild vault index ---\n")
    rebuild_index()

    print(f"\nPipeline complete. Open vault/ in Obsidian to explore.")


if __name__ == "__main__":
    main()
