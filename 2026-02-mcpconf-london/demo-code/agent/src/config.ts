/**
 * Configuration — constants, provider definitions, auth.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export const MODEL = "claude-sonnet-4-5-20250929";
export const MCP_BASE_URL = "https://api.stackone.com/mcp";
export const CONTEXT_WINDOW = 200_000;

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Load provider list from providers.json (returns [] if missing). */
export function loadProviders(): { id: string; provider: string }[] {
	try {
		return JSON.parse(
			readFileSync(resolve(__dirname, "../providers.json"), "utf-8"),
		);
	} catch {
		return [];
	}
}

export function getAuthHeader(): string {
	return (
		"Basic " +
		Buffer.from((process.env.STACKONE_API_KEY || "") + ":").toString("base64")
	);
}

/** Local MCP servers (stdio-based, spawned on demand). */
export const LOCAL_MCP_PROVIDERS: {
	id: string;
	provider: string;
	command: string;
	args?: string[];
}[] = [
	{
		id: "local::chrome-devtools",
		provider: "Chrome DevTools",
		command: "npx",
		args: ["-y", "chrome-devtools-mcp@latest"],
	},
];
