#!/usr/bin/env python3
"""Orchestrate the full research pipeline: papers -> tweets -> review -> index.

Usage:
    uv run python scripts/full_pipeline.py "AI agent architectures"
    uv run python scripts/full_pipeline.py "tool use in LLMs" --skip-tweets
    uv run python scripts/full_pipeline.py "multi-agent systems" --no-summarize --max-papers 3
"""

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault"
SCRIPTS_DIR = Path(__file__).resolve().parent


def run_script(name: str, args: list[str]) -> bool:
    """Run a sibling Python script. Returns True on success."""
    script = SCRIPTS_DIR / name
    cmd = [sys.executable, str(script)] + args
    print(f"  $ {' '.join(cmd)}\n")
    result = subprocess.run(cmd, cwd=SCRIPTS_DIR.parent)
    return result.returncode == 0


def rebuild_index():
    """Regenerate vault/_index.md by reading YAML frontmatter titles from all notes."""
    index_path = VAULT_DIR / "_index.md"
    lines = [
        "---",
        f"updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "---",
        "",
        "# Research Vault Index",
        "",
    ]

    sections = {
        "papers": "Papers",
        "grants": "Grant Reviews",
        "tweets": "Tweets",
        "meetings": "Meetings",
        "graphs": "Knowledge Graphs",
    }

    for dirname, heading in sections.items():
        section = VAULT_DIR / dirname
        lines.append(f"## {heading}")
        lines.append("")

        if not section.exists():
            lines.append("_No notes yet._")
            lines.append("")
            continue

        notes = sorted(
            [p for p in section.glob("*.md") if not p.name.startswith(".")],
            reverse=True,
        )
        if not notes:
            lines.append("_No notes yet._")
            lines.append("")
            continue

        for note in notes:
            # Try to extract title from YAML frontmatter
            title = note.stem.replace("-", " ").title()
            try:
                for line in note.read_text().splitlines():
                    if line.startswith("title:"):
                        raw = line.split(":", 1)[1].strip().strip('"')
                        if raw:
                            title = raw
                        break
            except Exception:
                pass
            lines.append(f"- [[{dirname}/{note.stem}|{title}]]")
        lines.append("")

    index_path.write_text("\n".join(lines) + "\n")
    print(f"Index rebuilt: {index_path}")


def main():
    parser = argparse.ArgumentParser(description="Run the full research pipeline")
    parser.add_argument("topic", help="Research topic")
    parser.add_argument("--max-papers", type=int, default=5, help="Max papers (default 5)")
    parser.add_argument("--skip-tweets", action="store_true", help="Skip tweet collection")
    parser.add_argument("--no-summarize", action="store_true", help="Skip Claude paper summaries")
    args = parser.parse_args()

    print(f"{'=' * 60}")
    print(f"  Research Pipeline: {args.topic}")
    print(f"{'=' * 60}\n")

    # Stage 1 -- arXiv paper search
    print("--- Stage 1: arXiv paper search ---\n")
    paper_args = [args.topic, "--max", str(args.max_papers)]
    if args.no_summarize:
        paper_args.append("--no-summarize")
    run_script("auto_research.py", paper_args)

    # Stage 2 -- Tweet collection (optional)
    if args.skip_tweets:
        print("\n--- Stage 2: Tweet collection (skipped) ---\n")
    else:
        print("\n--- Stage 2: Tweet collection ---\n")
        run_script("collect_tweets.py", [args.topic])

    # Stage 3 -- Grant review (requires papers + API key)
    papers_dir = VAULT_DIR / "papers"
    paper_count = len([p for p in papers_dir.glob("*.md") if not p.name.startswith(".")])
    if paper_count > 0 and not args.no_summarize:
        print(f"\n--- Stage 3: Grant review ({paper_count} papers) ---\n")
        run_script("grant_review.py", [args.topic])
    else:
        reason = "no papers" if paper_count == 0 else "no-summarize mode (no API key)"
        print(f"\n--- Stage 3: Grant review (skipped: {reason}) ---\n")

    # Stage 4 -- Rebuild vault index
    print("\n--- Stage 4: Rebuild vault index ---\n")
    rebuild_index()

    print(f"\nPipeline complete. Open vault/ in Obsidian to explore.")


if __name__ == "__main__":
    main()
