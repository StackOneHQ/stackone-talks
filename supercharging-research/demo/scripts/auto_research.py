#!/usr/bin/env python3
"""Search arXiv for recent papers on a topic and summarise each with Claude.

Usage:
    uv run python scripts/auto_research.py "AI agent architectures"
    uv run python scripts/auto_research.py "tool use in language models" --max 10
    uv run python scripts/auto_research.py "multi-agent systems" --no-summarize
"""

import argparse
import os
import re
import sys
from pathlib import Path

import arxiv
import anthropic

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault" / "papers"
DEFAULT_MAX = 5

# Map arXiv category codes to human-readable tags
CATEGORY_TAGS = {
    "cs.AI": "ai",
    "cs.CL": "nlp",
    "cs.LG": "machine-learning",
    "cs.CV": "computer-vision",
    "cs.HC": "hci",
    "cs.MA": "multi-agent",
    "cs.SE": "software-engineering",
    "cs.IR": "information-retrieval",
    "cs.RO": "robotics",
    "stat.ML": "machine-learning",
}


def slug(title: str) -> str:
    """Create a filesystem-safe slug from a paper title."""
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]


def search_arxiv(query: str, max_results: int) -> list[dict]:
    """Search arXiv and return structured paper metadata."""
    client = arxiv.Client()
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance,
    )
    papers = []
    for result in client.results(search):
        papers.append({
            "title": result.title,
            "authors": [a.name for a in result.authors],
            "published": result.published.strftime("%Y-%m-%d"),
            "abstract": result.summary.replace("\n", " ").strip(),
            "url": result.entry_id,
            "pdf_url": result.pdf_url,
            "categories": result.categories,
        })
    return papers


def existing_paper_slugs() -> list[str]:
    """Return slugs of papers already in the vault (for wikilink suggestions)."""
    if not VAULT_DIR.exists():
        return []
    return [p.stem for p in VAULT_DIR.glob("*.md") if not p.name.startswith(".")]


def summarise(client: anthropic.Anthropic, paper: dict, vault_slugs: list[str]) -> str:
    """Ask Claude for a structured research note given a paper abstract."""
    links = "\n".join(f"  - [[{s}]]" for s in vault_slugs[:30]) or "  (none yet)"
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": (
                "Write a structured research note for this paper.\n\n"
                "## Summary\nA 3-4 sentence overview.\n\n"
                "## Key Contributions\nBulleted list.\n\n"
                "## Methodology\nBrief description of the approach.\n\n"
                "## Connections\nHow this relates to other work. "
                "Use [[paper-slug]] wikilinks to reference related vault papers "
                "from this list when relevant:\n"
                f"{links}\n\n"
                "---\n"
                f"Title: {paper['title']}\n"
                f"Authors: {', '.join(paper['authors'][:5])}\n"
                f"Abstract: {paper['abstract']}\n"
                f"Categories: {', '.join(paper['categories'])}"
            ),
        }],
    )
    return msg.content[0].text


def frontmatter(paper: dict) -> str:
    """Generate YAML frontmatter block for a paper note."""
    tags = ["paper", "arxiv"]
    for cat in paper["categories"]:
        if cat in CATEGORY_TAGS and CATEGORY_TAGS[cat] not in tags:
            tags.append(CATEGORY_TAGS[cat])

    authors_yaml = "".join(f'  - "{a}"\n' for a in paper["authors"])
    safe_title = paper["title"].replace('"', '\\"')
    safe_abstract = paper["abstract"][:300].replace('"', '\\"')
    return (
        f"---\n"
        f'title: "{safe_title}"\n'
        f"authors:\n{authors_yaml}"
        f"date: {paper['published']}\n"
        f"tags: [{', '.join(tags)}]\n"
        f"source: {paper['url']}\n"
        f'abstract: "{safe_abstract}..."\n'
        f"---\n\n"
    )


def save_note(paper: dict, body: str) -> Path:
    """Write a paper note (frontmatter + body) to the vault."""
    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    path = VAULT_DIR / f"{slug(paper['title'])}.md"
    path.write_text(frontmatter(paper) + body + "\n")
    return path


def save_abstract_only(paper: dict) -> Path:
    """Write a minimal note with just the abstract (no Claude call needed)."""
    body = (
        f"## Summary\n\n{paper['abstract']}\n\n"
        f"## Source\n\n[arXiv]({paper['url']}) | [PDF]({paper['pdf_url']})\n"
    )
    return save_note(paper, body)


def main():
    parser = argparse.ArgumentParser(
        description="Search arXiv and summarise papers with Claude"
    )
    parser.add_argument("topic", help="Research topic to search for")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX, help="Max papers (default 5)")
    parser.add_argument(
        "--no-summarize", action="store_true",
        help="Skip Claude summarisation (saves abstracts only)",
    )
    args = parser.parse_args()

    print(f"Searching arXiv for: {args.topic}")
    papers = search_arxiv(args.topic, args.max)
    print(f"Found {len(papers)} papers\n")

    if not papers:
        print("No papers found. Try a different query.")
        sys.exit(1)

    if args.no_summarize:
        for i, paper in enumerate(papers, 1):
            print(f"[{i}/{len(papers)}] {paper['title']}")
            path = save_abstract_only(paper)
            print(f"  -> {path.name}\n")
    else:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            print("ANTHROPIC_API_KEY not set. Use --no-summarize or set the key.")
            sys.exit(1)

        client = anthropic.Anthropic()
        slugs = existing_paper_slugs()

        for i, paper in enumerate(papers, 1):
            print(f"[{i}/{len(papers)}] {paper['title']}")
            try:
                body = summarise(client, paper, slugs)
                path = save_note(paper, body)
                slugs.append(path.stem)
            except Exception as e:
                print(f"  ! Claude error: {e} -- saving abstract only")
                path = save_abstract_only(paper)
            print(f"  -> {path.name}\n")

    print(f"Done. {len(papers)} notes in vault/papers/")


if __name__ == "__main__":
    main()
