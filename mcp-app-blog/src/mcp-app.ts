import { App } from "@modelcontextprotocol/ext-apps";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const methodSelect = document.getElementById("method") as HTMLSelectElement;
const urlInput = document.getElementById("url") as HTMLInputElement;
const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;
const headersEditor = document.getElementById("headers-editor") as HTMLDivElement;
const addHeaderBtn = document.getElementById("add-header-btn") as HTMLButtonElement;
const bodyEditor = document.getElementById("body-editor") as HTMLTextAreaElement;
const responseMeta = document.getElementById("response-meta") as HTMLDivElement;
const statusBadge = document.getElementById("status-badge") as HTMLSpanElement;
const timingEl = document.getElementById("timing") as HTMLSpanElement;
const sizeInfo = document.getElementById("size-info") as HTMLSpanElement;
const responseTabs = document.getElementById("response-tabs") as HTMLDivElement;
const responseBody = document.getElementById("response-body") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const historyBar = document.getElementById("history-bar") as HTMLDivElement;

// ---------------------------------------------------------------------------
// Types & state
// ---------------------------------------------------------------------------
interface ApiResponse {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  timing?: number;
  error?: string;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  };
}

let currentResponse: ApiResponse | null = null;
let activeTab: "body" | "headers" = "body";

interface HistoryEntry {
  response: ApiResponse;
  method: string;
  url: string;
}

const history: HistoryEntry[] = [];
const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// App connection
// ---------------------------------------------------------------------------
const app = new App({ name: "API Explorer", version: "1.0.0" });

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

app.connect();

// ---------------------------------------------------------------------------
// Pre-fill form from response.request
// ---------------------------------------------------------------------------
function prefillForm(data: ApiResponse) {
  if (!data.request) return;
  const { method, url, headers, body } = data.request;
  if (method) methodSelect.value = method;
  if (url) urlInput.value = url;
  if (body) bodyEditor.value = body;
  if (headers) {
    populateHeaders(headers);
  }
}

// ---------------------------------------------------------------------------
// Send request
// ---------------------------------------------------------------------------
async function sendRequest() {
  const method = methodSelect.value;
  const url = urlInput.value.trim();
  if (!url) {
    urlInput.focus();
    return;
  }

  const headers = getHeaders();
  const body = bodyEditor.value.trim() || undefined;

  // UI: disable button, show spinner
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending\u2026";
  emptyState.style.display = "none";
  // Show spinner using safe DOM construction
  responseBody.textContent = "";
  const spinner = document.createElement("div");
  spinner.className = "spinner";
  responseBody.appendChild(spinner);
  responseMeta.style.display = "none";
  responseTabs.style.display = "none";

  try {
    const result = await app.callServerTool({
      name: "inspect-response",
      arguments: {
        method,
        url,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(body ? { body } : {}),
      },
    });

    // Parse the result content
    let data: ApiResponse | null = null;
    if (result.content && Array.isArray(result.content)) {
      for (const block of result.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          try {
            data = JSON.parse(block.text);
          } catch {
            // skip
          }
        }
      }
    }

    if (data) {
      displayResponse(data);
    } else {
      displayResponse({ error: "No parseable response received", request: { method, url, headers, body } });
    }
  } catch (err) {
    displayResponse({
      error: err instanceof Error ? err.message : String(err),
      request: { method, url, headers, body },
    });
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
}

sendBtn.addEventListener("click", sendRequest);
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendRequest();
});

// ---------------------------------------------------------------------------
// Display response
// ---------------------------------------------------------------------------
function displayResponse(data: ApiResponse) {
  currentResponse = data;

  // Push to history
  const method = data.request?.method ?? methodSelect.value;
  const url = data.request?.url ?? urlInput.value;
  history.unshift({ response: data, method, url });
  if (history.length > MAX_HISTORY) history.pop();
  renderHistory();

  // Show meta bar
  responseMeta.style.display = "flex";
  responseTabs.style.display = "flex";

  // Status badge
  if (data.error) {
    statusBadge.className = "status-badge status-err";
    statusBadge.textContent = "ERROR";
  } else if (data.status != null) {
    const s = data.status;
    let cls = "status-err";
    if (s >= 200 && s < 300) cls = "status-2xx";
    else if (s >= 300 && s < 400) cls = "status-3xx";
    else if (s >= 400 && s < 500) cls = "status-4xx";
    else if (s >= 500 && s < 600) cls = "status-5xx";
    statusBadge.className = `status-badge ${cls}`;
    statusBadge.textContent = `${s} ${data.statusText ?? ""}`.trim();
  }

  // Timing
  if (data.timing != null) {
    timingEl.textContent = `${data.timing}ms`;
  } else {
    timingEl.textContent = "";
  }

  // Size
  if (data.body) {
    sizeInfo.textContent = formatBytes(new Blob([data.body]).size);
  } else {
    sizeInfo.textContent = "";
  }

  // Reset tab to body
  activeTab = "body";
  syncTabButtons();
  renderActiveTab();
}

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------
function renderActiveTab() {
  if (!currentResponse) return;

  // Clear response body safely
  responseBody.textContent = "";

  if (activeTab === "body") {
    const pre = document.createElement("pre");

    if (currentResponse.error) {
      pre.className = "error-pre";
      pre.textContent = currentResponse.error;
    } else {
      const raw = currentResponse.body ?? "";
      const formatted = tryFormatJson(raw);
      // Check if the formatted output is actually JSON (starts with { or [)
      const trimmed = formatted.trimStart();
      const isJson = trimmed.startsWith("{") || trimmed.startsWith("[");
      if (isJson) {
        // For JSON: escape first, then apply syntax highlighting with spans.
        // syntaxHighlight operates on the escaped string, adding only our own
        // class-based <span> tags. The data values are already escaped.
        pre.innerHTML = syntaxHighlight(escapeHtml(formatted));
      } else {
        pre.textContent = formatted;
      }
    }

    responseBody.appendChild(pre);
  } else if (activeTab === "headers") {
    const headers = currentResponse.headers;
    if (headers && Object.keys(headers).length > 0) {
      const table = document.createElement("table");
      table.className = "headers-table";

      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      const thName = document.createElement("th");
      thName.textContent = "Name";
      const thValue = document.createElement("th");
      thValue.textContent = "Value";
      headRow.appendChild(thName);
      headRow.appendChild(thValue);
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      for (const [key, value] of Object.entries(headers)) {
        const tr = document.createElement("tr");
        const tdKey = document.createElement("td");
        tdKey.textContent = key;
        const tdVal = document.createElement("td");
        tdVal.textContent = value;
        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      responseBody.appendChild(table);
    } else {
      const msg = document.createElement("div");
      msg.className = "no-headers-msg";
      msg.textContent = "No headers";
      responseBody.appendChild(msg);
    }
  }
}

function syncTabButtons() {
  const tabs = responseTabs.querySelectorAll<HTMLButtonElement>(".response-tab");
  tabs.forEach((tab) => {
    if (tab.dataset.tab === activeTab) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

// Tab click listeners
responseTabs.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains("response-tab") && target.dataset.tab) {
    activeTab = target.dataset.tab as "body" | "headers";
    syncTabButtons();
    renderActiveTab();
  }
});

// ---------------------------------------------------------------------------
// Headers management
// ---------------------------------------------------------------------------
function addHeaderRow(key = "", value = "") {
  const row = document.createElement("div");
  row.className = "header-row";

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.placeholder = "Key";
  keyInput.className = "header-key";
  keyInput.value = key;

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.placeholder = "Value";
  valueInput.className = "header-value";
  valueInput.value = value;

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.textContent = "\u00d7";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(keyInput);
  row.appendChild(valueInput);
  row.appendChild(removeBtn);
  headersEditor.appendChild(row);
}

// Wire the initial remove button
const initialRemoveBtn = headersEditor.querySelector(".remove-btn");
if (initialRemoveBtn) {
  initialRemoveBtn.addEventListener("click", () => {
    initialRemoveBtn.closest(".header-row")?.remove();
  });
}

addHeaderBtn.addEventListener("click", () => addHeaderRow());

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const rows = headersEditor.querySelectorAll<HTMLDivElement>(".header-row");
  rows.forEach((row) => {
    const key = (row.querySelector(".header-key") as HTMLInputElement)?.value.trim();
    const value = (row.querySelector(".header-value") as HTMLInputElement)?.value.trim();
    if (key) {
      headers[key] = value;
    }
  });
  return headers;
}

function populateHeaders(headers: Record<string, string>) {
  headersEditor.textContent = "";
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    addHeaderRow();
    return;
  }
  for (const [key, value] of entries) {
    addHeaderRow(key, value);
  }
}

// ---------------------------------------------------------------------------
// History rendering
// ---------------------------------------------------------------------------
const METHOD_COLORS: Record<string, string> = {
  GET: "var(--green)",
  POST: "var(--yellow)",
  PUT: "var(--orange)",
  PATCH: "var(--accent)",
  DELETE: "var(--red)",
  HEAD: "var(--text-dim)",
  OPTIONS: "var(--text-dim)",
};

function renderHistory() {
  historyBar.textContent = "";
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const color = METHOD_COLORS[entry.method] ?? "var(--text-dim)";

    let pathname: string;
    try {
      pathname = new URL(entry.url).pathname;
    } catch {
      pathname = entry.url;
    }

    const item = document.createElement("div");
    item.className = "history-item";

    const methodSpan = document.createElement("span");
    methodSpan.className = "history-method";
    methodSpan.style.color = color;
    methodSpan.textContent = entry.method;

    const pathSpan = document.createElement("span");
    pathSpan.className = "history-path";
    pathSpan.textContent = pathname;

    item.appendChild(methodSpan);
    item.appendChild(pathSpan);

    item.addEventListener("click", () => {
      // Restore form
      methodSelect.value = entry.method;
      urlInput.value = entry.url;
      if (entry.response.request?.body) {
        bodyEditor.value = entry.response.request.body;
      } else {
        bodyEditor.value = "";
      }
      if (entry.response.request?.headers) {
        populateHeaders(entry.response.request.headers);
      }
      // Display response
      displayResponse(entry.response);
    });

    historyBar.appendChild(item);
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function syntaxHighlight(escapedJson: string): string {
  // Operates on already-escaped HTML, matching JSON tokens.
  // Keys and string values use &quot; for quotes since escapeHtml ran first.
  return escapedJson.replace(
    /(&quot;(?:[^&]|&(?!quot;))*?&quot;)\s*:/g,
    '<span class="json-key">$1</span>:'
  ).replace(
    /:\s*(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g,
    ': <span class="json-string">$1</span>'
  ).replace(
    /:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    ': <span class="json-number">$1</span>'
  ).replace(
    /:\s*(true|false)/g,
    ': <span class="json-boolean">$1</span>'
  ).replace(
    /:\s*(null)/g,
    ': <span class="json-null">$1</span>'
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
