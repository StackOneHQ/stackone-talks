# Building an Interactive API Explorer with MCP Apps

MCP servers return text and structured data. That works well for answering questions and fetching information, but it breaks down when you need users to actually *interact* with something. MCP Apps change this: they let servers return interactive HTML UIs that render directly inside the AI chat window.

## What are MCP Apps?

MCP Apps is the first official extension to the Model Context Protocol, announced on January 26, 2026. The extension is registered under the ID `io.modelcontextprotocol/ui`, and it adds a UI layer to what was previously a text-only protocol.

The extension introduces four concepts:

**`ui://` resources.** A new URI scheme for declaring user interfaces. Servers register HTML documents under `ui://` URIs, just like they'd register any other resource. The `ui://` prefix tells the host that this resource is meant to be rendered, not read.

**Tool-UI linkage.** Tools can declare a `_meta.ui.resourceUri` field that points to a UI resource. When the LLM calls that tool, the host fetches the linked resource and renders it alongside the tool result. The model picks the tool based on the user's intent; the UI shows up automatically.

**Sandboxed iframes.** Hosts render MCP Apps in sandboxed iframes. The app can't access the parent page's DOM, cookies, or JavaScript context. Each app runs in its own isolated environment with only the permissions the host grants.

**Bidirectional communication.** The `App` class from `@modelcontextprotocol/ext-apps` opens a JSON-RPC channel over `postMessage`. Through this channel, apps can call server tools and the host can push tool results back into the app. The data flows through the host, which acts as a broker between the UI and the server.

MCP Apps are currently supported by Claude, Claude Desktop, VS Code Insiders, Goose, Postman, and MCPJam.

## Why not just build a web app?

You could build a standalone web app and paste links into the chat. But MCP Apps have four concrete advantages over that approach.

First, context stays in the conversation. The user doesn't switch tabs or lose their place. The UI appears right where the discussion is happening, and the LLM can see both the tool result and what the user does next.

Second, there's no separate API or auth layer. The server already has access to whatever resources the user connected through MCP. The UI talks to the server through the same channel, so you don't need to build authentication, CORS configuration, or a separate backend.

Third, host integration means apps can call any tool the user has already connected. Your API Explorer can use tools from other servers in the same session, all without extra setup.

Fourth, the security model is enforced by the host. The sandboxed iframe can only communicate through the structured `postMessage` channel. The host controls exactly what the app can and can't do.

## What we're building

We're going to build an API Explorer that lets you test HTTP endpoints from inside an AI conversation. You tell the agent "test the /users endpoint" and it renders an interactive request builder right in the chat. The UI includes editable headers, a body editor for POST/PUT requests, a response viewer with JSON syntax highlighting and color-coded status badges, and a history sidebar for replaying past requests.

## Prerequisites

- Node.js 18+
- Familiarity with MCP servers ([docs](https://modelcontextprotocol.io/docs/concepts/servers))
- TypeScript basics

## Step 1: Project Setup

Here's the file structure:

```
mcp-app/
├── server.ts          # MCP server (tools + resource)
├── mcp-app.html       # HTML entry point (Vite processes this)
├── src/
│   └── mcp-app.ts     # UI logic (TypeScript, bundled by Vite)
├── vite.config.ts
├── package.json
└── tsconfig.json
```

The dependencies split into two groups. For the MCP server:

- `@modelcontextprotocol/sdk` provides the `McpServer` class and the Streamable HTTP transport.
- `@modelcontextprotocol/ext-apps` adds the MCP Apps extension helpers: `registerAppTool`, `registerAppResource` on the server side, and the `App` class for the UI.
- `express` and `cors` serve the MCP endpoint over HTTP.

For the build:

- `vite` and `vite-plugin-singlefile` bundle the HTML, CSS, and TypeScript into a single self-contained HTML file. This matters because the server needs to serve the entire app as one resource.
- `tsx` runs TypeScript directly for the server.

The Vite config is minimal:

```ts
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: process.env.INPUT,
    },
  },
});
```

And the scripts in `package.json`:

```json
{
  "scripts": {
    "build": "INPUT=mcp-app.html vite build",
    "serve": "npx tsx server.ts",
    "start": "npm run build && npm run serve"
  }
}
```

The `build` script tells Vite to process `mcp-app.html` as the entry point. The `singlefile` plugin inlines all JavaScript and CSS into that one HTML file, which lands in `dist/mcp-app.html`.

## Step 2: The Server

The server has three responsibilities: register the tools, define how they work, and serve the HTML resource. Let's walk through `server.ts`.

**The resource URI.** Every MCP App needs a `ui://` address:

```ts
const resourceUri = "ui://api-explorer/mcp-app.html";
```

The `ui://` scheme tells hosts this is a renderable UI. The rest of the path is up to you.

**The main tool.** We register `send-request` using `registerAppTool`, which wraps a standard tool definition with the UI metadata:

```ts
registerAppTool(
  server,
  "send-request",
  {
    title: "Send API Request",
    description:
      "Send an HTTP request and display the response in an interactive explorer.",
    inputSchema: requestInputSchema,
    _meta: { ui: { resourceUri } },
  },
  handleRequest
);
```

The `_meta.ui.resourceUri` field is the key line. It tells the host: "when this tool is called, fetch and render the resource at this URI." The LLM sees this tool like any other, picks it when the user asks to test an API, and the host takes care of showing the UI.

The input schema uses Zod to define the request parameters: HTTP method, URL, optional headers, and optional body.

**The app-only tool.** The second tool, `inspect-response`, does the same thing but is only callable from the UI:

```ts
registerAppTool(
  server,
  "inspect-response",
  {
    title: "Inspect API Response",
    description: "Send an HTTP request. Called by the UI to re-send requests.",
    inputSchema: requestInputSchema,
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  handleRequest
);
```

The `visibility: ["app"]` field hides this tool from the LLM. Only the app's `callServerTool` method can invoke it. This is how the UI lets users tweak headers or change the URL and re-send without routing through the model. The request goes UI to host to server and back, skipping the LLM entirely.

Both tools call the same `handleRequest` function, which uses `fetch()` to make the actual HTTP request, measures the response time with `performance.now()`, and returns the status, headers, body, and timing as JSON.

**Serving the resource.** The HTML file gets registered as an MCP resource:

```ts
registerAppResource(
  server,
  "API Explorer",
  resourceUri,
  { description: "Interactive API Explorer UI" },
  async () => ({
    contents: [
      {
        uri: resourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: fs.readFileSync(
          path.join(import.meta.dirname, "dist", "mcp-app.html"),
          "utf-8"
        ),
      },
    ],
  })
);
```

The server reads the Vite-built single-file HTML from disk and returns it with the MCP Apps MIME type. The host receives this, verifies the `ui://` scheme, and renders it in a sandboxed iframe.

**The transport layer** is a standard Express app exposing a single `/mcp` endpoint using Streamable HTTP:

```ts
const app = express();
app.use(cors());
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

## Step 3: The UI

The UI code lives in `src/mcp-app.ts` and gets bundled into the HTML file. It has three jobs: connect to the host, display incoming results, and let users send their own requests.

**Connecting to the host.** Two lines:

```ts
const app = new App({ name: "API Explorer", version: "1.0.0" });
app.connect();
```

`new App(...)` creates a client that communicates with the host over `postMessage`. `app.connect()` initiates the handshake. Once connected, the app can receive tool results and call server tools.

**Receiving tool results.** When the LLM calls `send-request`, the host executes the tool on the server, gets back the JSON response, and pushes it to the app:

```ts
app.ontoolresult = (params) => {
  if (!params.content) return;
  for (const block of params.content) {
    if (block.type === "text" && typeof block.text === "string") {
      try {
        const data: ApiResponse = JSON.parse(block.text);
        displayResponse(data);
        prefillForm(data);
      } catch {
        // ignore non-JSON content
      }
    }
  }
};
```

The callback parses the JSON, renders the response in the viewer (status badge, timing, body, headers), and pre-fills the request form with the original request parameters. This way, the user sees what was sent and can modify it for the next request.

**Making requests from the UI.** When the user clicks "Send" in the form, the app calls the `inspect-response` tool directly:

```ts
const result = await app.callServerTool({
  name: "inspect-response",
  arguments: { method, url, headers, body },
});
```

This call goes through the host to the server and back. Because `inspect-response` has `visibility: ["app"]`, the LLM never sees it. The user gets a direct, low-latency loop for iterating on requests without waiting for model inference.

**Response display.** The UI shows a color-coded status badge (green for 2xx, yellow for 3xx, orange for 4xx, red for 5xx and errors), response time in milliseconds, response size, and tabbed views for the body and headers. JSON bodies get syntax highlighting with colored keys, strings, numbers, booleans, and nulls. Every request is pushed to a history bar at the bottom, and clicking a history entry restores the form fields and re-displays that response.

## Step 4: Build and Test

Build and start the server:

```bash
npm run build && npm run serve
```

Vite processes `mcp-app.html`, inlines all the TypeScript and CSS, and writes a single file to `dist/mcp-app.html`. Then `tsx` starts the server, which reads that file and starts listening on `http://localhost:3001/mcp`.

To test the app, you have two options:

**Using basic-host.** Clone the [ext-apps repository](https://github.com/modelcontextprotocol/ext-apps) and run the included test host, pointing it at `http://localhost:3001/mcp`. This gives you a minimal MCP Apps host for development.

**Using Claude Desktop.** Set up a `cloudflared` tunnel to expose your local server, then add it as a custom MCP connector in Claude Desktop. Ask Claude to "test the JSONPlaceholder /users endpoint" and the API Explorer will appear inline.

## What's next

This API Explorer covers the basics, but there's a lot you could add: authentication header presets for Bearer tokens and API keys, saved request collections (like Postman), importing endpoints from OpenAPI specs, diffing responses between runs, or adding WebSocket support.

The full source code is in this repository. For more about MCP Apps, check the [ext-apps repo](https://github.com/modelcontextprotocol/ext-apps) for additional examples and the full specification.
