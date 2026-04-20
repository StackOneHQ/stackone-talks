#!/usr/bin/env python3
"""Search arXiv for recent papers on a topic and summarise each with Claude.

Usage:
    uv run python scripts/auto_research.py "AI agent architectures"
"""

import argparse
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import anthropic

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault" / "papers"
ARXIV_API = "http://export.arxiv.org/api/query"
MAX_RESULTS = 5


def search_arxiv(query: str, max_results: int = MAX_RESULTS) -> list[dict]:
    """Search arXiv and return a list of paper metadata dicts."""
    params = urlencode({
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    })
    url = f"{ARXIV_API}?{params}"
    with urlopen(url, timeout=30) as resp:
        xml_data = resp.read()

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(xml_data)
    papers = []
    for entry in root.findall("atom:entry", ns):
        title = entry.findtext("atom:title", "", ns).strip().replace("\n", " ")
        summary = entry.findtext("atom:summary", "", ns).strip()
        published = entry.findtext("atom:published", "", ns)[:10]
        authors = [a.findtext("atom:name", "", ns) for a in entry.findall("atom:author", ns)]
        link = entry.findtext("atom:id", "", ns).strip()
        papers.append({
            "title": title,
            "summary": summary,
            "published": published,
            "authors": authors,
            "link": link,
        })
    return papers


def summarise_paper(client: anthropic.Anthropic, paper: dict) -> str:
    """Use Claude to produce a concise research note from a paper abstract."""
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": (
                f"Summarise this paper for a research vault note. Include: "
                f"key contributions, methodology, and relevance to AI agent architectures.\n\n"
                f"Title: {paper['title']}\n"
                f"Abstract: {paper['summary']}"
            ),
        }],
    )
    return message.content[0].text


def slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]


def save_note(paper: dict, body: str) -> Path:
    """Write a Markdown note with YAML frontmatter to the vault."""
    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{paper['published']}-{slug(paper['title'])}.md"
    path = VAULT_DIR / filename
    frontmatter = (
        f"---\n"
        f"title: \"{paper['title']}\"\n"
        f"authors:\n"
        + "".join(f"  - \"{a}\"\n" for a in paper["authors"])
        + f"date: {paper['published']}\n"
        f"tags: [paper, arxiv, ai-agents]\n"
        f"source: {paper['link']}\n"
        f"---\n\n"
    )
    path.write_text(frontmatter + body + "\n")
    return path


def main():
    parser = argparse.ArgumentParser(description="Search arXiv and summarise papers with Claude")
    parser.add_argument("topic", help="Research topic to search for")
    parser.add_argument("--max", type=int, default=MAX_RESULTS, help="Max papers to fetch")
    args = parser.parse_args()

    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    print(f"Searching arXiv for: {args.topic}")
    papers = search_arxiv(args.topic, args.max)
    print(f"Found {len(papers)} papers\n")

    for i, paper in enumerate(papers, 1):
        print(f"[{i}/{len(papers)}] {paper['title']}")
        body = summarise_paper(client, paper)
        path = save_note(paper, body)
        print(f"  -> saved to {path.name}\n")

    print("Done. Notes written to vault/papers/")


if __name__ == "__main__":
    main()
