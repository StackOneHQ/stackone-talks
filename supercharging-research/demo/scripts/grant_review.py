#!/usr/bin/env python3
"""Generate a literature review from vault papers using Claude.

Reads all papers from vault/papers/, sends them to Claude for synthesis,
and saves a structured grant-style review to vault/grants/.

Usage:
    uv run python scripts/grant_review.py "AI agent architectures for automated research"
    uv run python scripts/grant_review.py "multi-agent planning" --output vault/grants/custom.md
"""

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import anthropic

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault"
PAPERS_DIR = VAULT_DIR / "papers"
GRANTS_DIR = VAULT_DIR / "grants"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def load_papers() -> list[dict]:
    """Read every paper note from the vault, returning filename and content."""
    if not PAPERS_DIR.exists():
        return []
    papers = []
    for path in sorted(PAPERS_DIR.glob("*.md")):
        if path.name.startswith("."):
            continue
        papers.append({"slug": path.stem, "content": path.read_text()})
    return papers


def generate_review(client: anthropic.Anthropic, topic: str, papers: list[dict]) -> str:
    """Use Claude to synthesise a structured literature review."""
    context_parts = []
    for p in papers:
        # Truncate each paper to keep within context limits
        context_parts.append(f"--- FILE: {p['slug']}.md ---\n{p['content'][:2000]}\n")
    vault_context = "\n".join(context_parts)

    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": (
                f"You are a research assistant writing a grant proposal literature review.\n"
                f"Topic: {topic}\n\n"
                f"Below are papers from our research vault. Produce these sections:\n\n"
                f"## Related Work\n"
                f"A narrative review (3-5 paragraphs) synthesising the papers. "
                f"Use [[paper-slug]] wikilinks to cite vault papers.\n\n"
                f"## Key Findings\n"
                f"Bulleted list of the most important findings.\n\n"
                f"## Methodology Suggestions\n"
                f"3-5 concrete methodological directions for the proposal.\n\n"
                f"## Identified Gaps\n"
                f"What is missing? Where are the opportunities?\n\n"
                f"## Key Citations\n"
                f"Formatted list of the most important papers with [[wikilinks]] "
                f"and a brief note on why each matters.\n\n"
                f"---\n\nVAULT PAPERS:\n\n{vault_context}"
            ),
        }],
    )
    return msg.content[0].text


def save_review(topic: str, body: str, output_path: Path | None = None) -> Path:
    """Write the review to vault/grants/ with YAML frontmatter."""
    GRANTS_DIR.mkdir(parents=True, exist_ok=True)
    if output_path:
        path = output_path
        path.parent.mkdir(parents=True, exist_ok=True)
    else:
        date_str = datetime.now().strftime("%Y-%m-%d")
        path = GRANTS_DIR / f"{date_str}-{slug(topic)}.md"

    safe_topic = topic.replace('"', '\\"')
    fm = (
        f"---\n"
        f'title: "Literature Review: {safe_topic}"\n'
        f"date: {datetime.now().strftime('%Y-%m-%d')}\n"
        f"tags: [grant, literature-review]\n"
        f'topic: "{safe_topic}"\n'
        f"---\n\n"
        f"# Literature Review: {topic}\n\n"
    )
    path.write_text(fm + body + "\n")
    return path


def main():
    parser = argparse.ArgumentParser(
        description="Generate a lit review for a grant proposal from vault papers"
    )
    parser.add_argument("topic", help="Grant topic or research question")
    parser.add_argument("--output", type=Path, default=None, help="Custom output path")
    args = parser.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    print("Loading papers from vault...")
    papers = load_papers()
    if not papers:
        print("No papers in vault/papers/. Run auto_research.py first.")
        sys.exit(1)
    print(f"Found {len(papers)} papers\n")

    print(f"Generating review for: {args.topic}")
    client = anthropic.Anthropic()
    body = generate_review(client, args.topic, papers)

    path = save_review(args.topic, body, args.output)
    print(f"\nSaved to: {path}")
    print("Open in Obsidian to follow [[wikilinks]] to vault papers.")


if __name__ == "__main__":
    main()
