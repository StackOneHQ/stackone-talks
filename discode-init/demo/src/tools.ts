/**
 * Tool catalog loader — builds searchable tool descriptions from the
 * mock-connector metadata (mirrors real StackOne tool schemas).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../data");

export interface Tool {
  name: string;
  connector: string;
  label: string;
  description: string;
}

interface ActionMeta {
  id: string;
  label: string;
  description: string;
  details: string;
  action_type: string;
  categories: string[];
  connector_key: string;
  connector_name: string;
}

interface Task {
  taskId: string;
  connector: string;
  instruction: string;
  actions: string[];
  difficulty: string;
  category: string;
}

let _tools: Tool[] | null = null;
let _tasks: Task[] | null = null;

export function loadTools(): Tool[] {
  if (_tools) return _tools;

  const metadata: Record<string, ActionMeta> = JSON.parse(
    readFileSync(resolve(DATA_DIR, "mock-connector-metadata.json"), "utf-8")
  );
  const dataset = JSON.parse(
    readFileSync(resolve(DATA_DIR, "mock-connector-tasks.json"), "utf-8")
  );

  // Collect unique actions used in tasks
  const actionSet = new Set<string>();
  for (const task of dataset.tasks) {
    for (const action of task.actions) actionSet.add(action);
  }

  _tools = Array.from(actionSet).map((action) => {
    const meta = metadata[action];
    const parts = action.split("_");
    const connector = parts[0];
    const connectorName = meta?.connector_name || connector;
    const label = meta?.label || parts.slice(1).join(" ");
    const desc = meta?.description || "";
    const details = meta?.details || "";
    const descParts = [label, desc, details].filter(Boolean);
    return {
      name: action,
      connector,
      label: `${connectorName}: ${label}`,
      description: `${connectorName}: ${descParts.join(". ")}`.slice(0, 500),
    };
  });

  return _tools;
}

export function loadTasks(): Task[] {
  if (_tasks) return _tasks;
  const dataset = JSON.parse(
    readFileSync(resolve(DATA_DIR, "mock-connector-tasks.json"), "utf-8")
  );
  _tasks = dataset.tasks;
  return _tasks!;
}

export function getToolsByConnector(connector: string): Tool[] {
  return loadTools().filter((t) => t.connector === connector);
}

export function getConnectors(): string[] {
  const set = new Set(loadTools().map((t) => t.connector));
  return Array.from(set).sort();
}
