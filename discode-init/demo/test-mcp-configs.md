# Test MCP Configurations

Copy any of these JSON blocks into the Code-Mode "Import MCP Configuration" box.

---

## All servers at once

```json
{
  "mcpServers": {
    "disco-duckduckgo": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.disco.dev/v1/duckduckgo/mcp",
        "--header",
        "Authorization: Bearer ciepCvJQUt5saIJg0mea0"
      ]
    },
    "disco-parallel": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.disco.dev/v1/parallel/mcp",
        "--header",
        "Authorization: Bearer GPl5z92V6B-O_jp9sGgEDek1pa6MsC5g"
      ]
    },
    "gmail-stackone": {
      "type": "http",
      "url": "https://api.stackone-dev.com/mcp",
      "headers": {
        "Authorization": "Basic djEuZXUxLjM1dVp5djYtT2dDdjBfLTl6Vk80elMtcWR6N3BkS1YwYjdOOW0tMkFtMnBnd1VZNnpMVmJXWHhPT2RoUTZiMjExRzY5QXRlUC1BUVRMWnBmV2Z0Y0VB",
        "x-account-id": "JfIkmioQAOrfSGmbwgrBF"
      }
    },
    "notion-stackone": {
      "type": "sse",
      "url": "https://api.stackone.com/mcp",
      "headers": {
        "Authorization": "Basic djEuZXUxLkZsX2tZeHNwLVJyQXgyNXNMRFJxU2ZGaUVtRC1TV2tnRW1Mczk3SEc0TWdXOFU3MVV0SkllOUhnQUxhTE9RZGJlQU54SDh3dHlINHZpdWhzd3FpekFn",
        "x-account-id": "CcuNP7w3GhPdOt00eAgbC"
      }
    }
  }
}
```

---

## Individual servers

### Disco DuckDuckGo (Bearer token via mcp-remote)
From: `~/.config/zed/settings.json`

```json
{
  "mcpServers": {
    "disco-duckduckgo": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.disco.dev/v1/duckduckgo/mcp",
        "--header",
        "Authorization: Bearer ciepCvJQUt5saIJg0mea0"
      ]
    }
  }
}
```

### Disco Parallel (Bearer token via mcp-remote)

```json
{
  "mcpServers": {
    "disco-parallel": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://mcp.disco.dev/v1/parallel/mcp",
        "--header",
        "Authorization: Bearer GPl5z92V6B-O_jp9sGgEDek1pa6MsC5g"
      ]
    }
  }
}
```

### Gmail via StackOne (Basic auth + account header)
From: `~/Documents/ai-freewilly/.mcp.json`

```json
{
  "mcpServers": {
    "gmail-stackone": {
      "type": "http",
      "url": "https://api.stackone-dev.com/mcp",
      "headers": {
        "Authorization": "Basic djEuZXUxLjM1dVp5djYtT2dDdjBfLTl6Vk80elMtcWR6N3BkS1YwYjdOOW0tMkFtMnBnd1VZNnpMVmJXWHhPT2RoUTZiMjExRzY5QXRlUC1BUVRMWnBmV2Z0Y0VB",
        "x-account-id": "JfIkmioQAOrfSGmbwgrBF"
      }
    }
  }
}
```

---

## OAuth servers (add via "Add Server" modal, not import)

### Cloudflare (OAuth2 with Dynamic Client Registration)
From: old `.db.json`

- **Server URL**: `https://bindings.mcp.cloudflare.com/mcp`
- **Authorization URL**: `https://bindings.mcp.cloudflare.com/oauth/authorize`
- **Token URL**: `https://bindings.mcp.cloudflare.com/token`
- **Registration URL**: `https://bindings.mcp.cloudflare.com/register`

Add this via the UI "Add Server" modal with OAuth enabled — it uses Dynamic Client Registration so no client ID/secret needed upfront.
