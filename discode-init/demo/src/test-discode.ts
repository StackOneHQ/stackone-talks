const DISCODE_URL = "https://discode-api.stackone.com/api/mcp/disco-mcp/mcp";
const TOKEN = "sbx_eQZYMoyVaYYtaptKSyD5supLM0xr0VTXmiY_v5GFYbo";

async function call(method: string, params: Record<string, unknown>, id = 1) {
  const resp = await fetch(DISCODE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/event-stream")) {
    const text = await resp.text();
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try { return JSON.parse(line.slice(6)); } catch {}
      }
    }
    return null;
  }
  return resp.json();
}

// Search for tools
console.log("=== search_tools ===");
const search = await call("tools/call", {
  name: "search_tools",
  arguments: { query: "list all employees and their time off periods" },
}, 3);
const searchText = search?.result?.content?.[0]?.text ?? JSON.stringify(search);
console.log(searchText.slice(0, 2000));
