console.log("Starting API Explorer MCP App server...");

import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import express from "express";
import cors from "cors";
import { z } from "zod";

const server = new McpServer({ name: "API Explorer", version: "1.0.0" });

const resourceUri = "ui://api-explorer/mcp-app.html";

const requestInputSchema = {
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
};

async function handleRequest({
  method,
  url,
  headers,
  body,
}: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  const start = performance.now();
  try {
    const hasBody = !["GET", "HEAD", "DELETE", "OPTIONS"].includes(method);
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? body : undefined,
    });

    const timing = Math.round(performance.now() - start);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: string;
    try {
      responseBody = await response.text();
    } catch {
      responseBody = "";
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
            timing,
            request: { method, url, headers, body },
          }),
        },
      ],
    };
  } catch (err) {
    const timing = Math.round(performance.now() - start);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            timing,
            request: { method, url, headers, body },
          }),
        },
      ],
    };
  }
}

// Tool: send-request (visible to model and app)
registerAppTool(
  server,
  "send-request",
  {
    title: "Send API Request",
    description:
      "Send an HTTP request and display the response in an interactive explorer. Use this when the user wants to test an API endpoint, inspect a response, or explore an HTTP API interactively.",
    inputSchema: requestInputSchema,
    _meta: { ui: { resourceUri } },
  },
  handleRequest
);

// Tool: inspect-response (app-only, not visible to model)
registerAppTool(
  server,
  "inspect-response",
  {
    title: "Inspect API Response",
    description:
      "Send an HTTP request and display the response in an interactive explorer. Called by the UI to re-send requests.",
    inputSchema: requestInputSchema,
    _meta: { ui: { resourceUri, visibility: ["app"] } },
  },
  handleRequest
);

// Resource: the app HTML
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

// Express HTTP server
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Explorer server listening on http://localhost:${PORT}/mcp`);
});
