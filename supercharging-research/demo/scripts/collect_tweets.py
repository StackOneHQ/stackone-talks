#!/usr/bin/env python3
"""Collect tweets on a topic using Playwright and save to the vault.

Usage:
    uv run python scripts/collect_tweets.py "AI agents tool use"
"""

import argparse
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

VAULT_DIR = Path(__file__).resolve().parent.parent / "vault" / "tweets"
MAX_TWEETS = 10


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:60]


def save_tweet(author: str, text: str, date: str, query: str, index: int) -> Path:
    """Write a single tweet as a vault Markdown note."""
    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{datetime.now().strftime('%Y%m%d')}-tweet-{slug(query)}-{index:02d}.md"
    path = VAULT_DIR / filename
    frontmatter = (
        f"---\n"
        f"author: \"{author}\"\n"
        f"date: \"{date}\"\n"
        f"tags: [tweet, {slug(query)}]\n"
        f"query: \"{query}\"\n"
        f"---\n\n"
    )
    path.write_text(frontmatter + f"> {text}\n\n-- @{author}\n")
    return path


def collect(query: str, max_tweets: int = MAX_TWEETS) -> list[dict]:
    """Open X/Twitter search in Playwright and extract visible tweets."""
    tweets = []
    search_url = f"https://x.com/search?q={quote_plus(query)}&src=typed_query&f=live"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print(f"Navigating to: {search_url}")

        try:
            page.goto(search_url, timeout=15_000)
            page.wait_for_timeout(3000)

            # Check for login wall
            if page.locator("input[name='text']").count() > 0:
                print("Login wall detected -- falling back to limited scrape")
                browser.close()
                return tweets

            # Try to grab tweet article elements
            articles = page.locator("article[data-testid='tweet']")
            count = min(articles.count(), max_tweets)
            print(f"Found {articles.count()} tweet elements, collecting up to {count}")

            for i in range(count):
                article = articles.nth(i)
                try:
                    text_el = article.locator("div[data-testid='tweetText']")
                    text = text_el.inner_text(timeout=2000) if text_el.count() > 0 else "(no text)"
                    # Grab author handle
                    links = article.locator("a[role='link'][href*='/']")
                    author = "unknown"
                    for li in range(links.count()):
                        href = links.nth(li).get_attribute("href") or ""
                        if href.startswith("/") and href.count("/") == 1 and len(href) > 1:
                            author = href.strip("/")
                            break
                    tweets.append({"author": author, "text": text, "date": datetime.now().strftime("%Y-%m-%d")})
                except Exception:
                    continue

        except PwTimeout:
            print("Timeout loading X/Twitter -- the site may require authentication")
        finally:
            browser.close()

    return tweets


def main():
    parser = argparse.ArgumentParser(description="Collect tweets on a research topic")
    parser.add_argument("query", help="Search query for X/Twitter")
    parser.add_argument("--max", type=int, default=MAX_TWEETS, help="Max tweets to collect")
    args = parser.parse_args()

    print(f"Collecting tweets for: {args.query}")
    tweets = collect(args.query, args.max)

    if not tweets:
        print("No tweets collected (login may be required). Try using the Playwright MCP browser instead.")
        return

    for i, tw in enumerate(tweets, 1):
        path = save_tweet(tw["author"], tw["text"], tw["date"], args.query, i)
        print(f"  [{i}] @{tw['author']}: {tw['text'][:60]}...")
        print(f"       -> {path.name}")

    print(f"\nDone. {len(tweets)} tweets saved to vault/tweets/")


if __name__ == "__main__":
    main()
