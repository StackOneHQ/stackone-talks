# API Explorer MCP App

An MCP App that renders an interactive HTTP client inside AI chat windows. Built as a companion to the blog post "Build Your First MCP App: An Interactive API Explorer."

## Quick Start

```bash
npm install
npm run build
npm run serve
```

Server starts at http://localhost:3001/mcp

## Testing

Two options:

**With the basic-host (local development):**

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm start
```

Open http://localhost:8080, select "Send API Request", and call the tool.

**With Claude:**

1. Tunnel your server: `npx cloudflared tunnel --url http://localhost:3001`
2. Copy the tunnel URL
3. In Claude, go to Settings > Connectors > Add custom connector
4. Paste the tunnel URL + `/mcp`
5. Start a new chat and ask "test the JSONPlaceholder API at https://jsonplaceholder.typicode.com/posts"

## What it does

Two MCP tools:

- **`send-request`** — Called by the LLM when the user asks to test an API. Linked to the interactive UI via `_meta.ui.resourceUri`.
- **`inspect-response`** — Called by the UI directly (app-only, hidden from the model) to re-send modified requests.

The UI provides: method selector, URL input, editable headers, request body editor, response viewer with JSON syntax highlighting, and a history bar for replaying past requests.

## Blog Post

See `blog-post.md` for a full walkthrough of how this app was built and how MCP Apps work.

## Learn More

- [MCP Apps docs](https://modelcontextprotocol.io/docs/extensions/apps)
- [ext-apps repository](https://github.com/modelcontextprotocol/ext-apps)
- [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
