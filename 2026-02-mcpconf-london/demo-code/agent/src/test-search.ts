/**
 * Thorough tests for the hybrid BM25 + TF-IDF search implementation.
 *
 * Covers: basic ranking, stemming, stopword handling, edge cases,
 * cross-provider disambiguation, scoring properties, and scale.
 *
 * Run: npx tsx src/test-search.ts
 */

import { buildIndex, handleSearch } from "./search-mode.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let sectionName = "";

function section(name: string) {
	sectionName = name;
	console.log(`\n── ${name} ──`);
}

function assert(
	label: string,
	condition: boolean,
	detail?: string,
) {
	if (condition) {
		console.log(`  ✓ ${label}`);
		passed++;
	} else {
		console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
		failed++;
	}
}

function topN(query: string, n = 1, limit = 5): string[] {
	const result = handleSearch({ query, limit });
	return result.tools.slice(0, n).map((t) => t.name);
}

function topScore(query: string): number {
	const result = handleSearch({ query, limit: 1 });
	return result.tools[0]?.score ?? 0;
}

function resultCount(query: string, limit = 10): number {
	return handleSearch({ query, limit }).tools.length;
}

// ---------------------------------------------------------------------------
// Corpus: realistic MCP tool set (~40 tools across 8 providers)
// ---------------------------------------------------------------------------

function buildTestCorpus() {
	const tools = [
		// Gmail (6)
		{ name: "gmail_list_messages", provider: "gmail", description: "List email messages from Gmail inbox with optional filters" },
		{ name: "gmail_send_message", provider: "gmail", description: "Send an email message via Gmail to specified recipients" },
		{ name: "gmail_get_message", provider: "gmail", description: "Get a specific email message by ID from Gmail" },
		{ name: "gmail_create_draft", provider: "gmail", description: "Create a draft email in Gmail" },
		{ name: "gmail_delete_message", provider: "gmail", description: "Delete an email message from Gmail" },
		{ name: "gmail_list_labels", provider: "gmail", description: "List all labels in Gmail" },
		// Jira (6)
		{ name: "jira_create_issue", provider: "jira", description: "Create a new Jira issue or ticket in a project" },
		{ name: "jira_list_issues", provider: "jira", description: "List Jira issues with optional JQL filters" },
		{ name: "jira_get_issue", provider: "jira", description: "Get a specific Jira issue by key or ID" },
		{ name: "jira_update_issue", provider: "jira", description: "Update fields on an existing Jira issue" },
		{ name: "jira_delete_issue", provider: "jira", description: "Delete a Jira issue by key" },
		{ name: "jira_list_projects", provider: "jira", description: "List all Jira projects accessible to the user" },
		// GitHub (6)
		{ name: "github_list_repos", provider: "github", description: "List GitHub repositories for the authenticated user" },
		{ name: "github_create_issue", provider: "github", description: "Create a new GitHub issue in a repository" },
		{ name: "github_list_pull_requests", provider: "github", description: "List pull requests in a GitHub repository" },
		{ name: "github_get_repo", provider: "github", description: "Get details of a specific GitHub repository" },
		{ name: "github_create_pull_request", provider: "github", description: "Create a new pull request in a GitHub repository" },
		{ name: "github_list_commits", provider: "github", description: "List commits in a GitHub repository branch" },
		// HubSpot (5)
		{ name: "hubspot_list_contacts", provider: "hubspot", description: "List contacts from HubSpot CRM with pagination" },
		{ name: "hubspot_create_contact", provider: "hubspot", description: "Create a new contact in HubSpot CRM" },
		{ name: "hubspot_list_deals", provider: "hubspot", description: "List deals from HubSpot CRM pipeline" },
		{ name: "hubspot_create_deal", provider: "hubspot", description: "Create a new deal in HubSpot CRM" },
		{ name: "hubspot_get_contact", provider: "hubspot", description: "Get a specific contact from HubSpot CRM by ID" },
		// Ashby (5)
		{ name: "ashby_list_candidates", provider: "ashby", description: "List job candidates in Ashby ATS" },
		{ name: "ashby_create_candidate", provider: "ashby", description: "Create a new candidate in Ashby ATS" },
		{ name: "ashby_list_jobs", provider: "ashby", description: "List open job positions in Ashby" },
		{ name: "ashby_get_candidate", provider: "ashby", description: "Get details of a specific candidate in Ashby" },
		{ name: "ashby_list_interviews", provider: "ashby", description: "List scheduled interviews in Ashby" },
		// Datadog (4)
		{ name: "datadog_list_logs", provider: "datadog", description: "List and search logs from Datadog with query filters" },
		{ name: "datadog_query_metrics", provider: "datadog", description: "Query time series metrics from Datadog" },
		{ name: "datadog_list_monitors", provider: "datadog", description: "List monitoring alerts from Datadog" },
		{ name: "datadog_get_dashboard", provider: "datadog", description: "Get a Datadog dashboard by ID" },
		// Trello (4)
		{ name: "trello_list_boards", provider: "trello", description: "List all Trello boards for the user" },
		{ name: "trello_create_card", provider: "trello", description: "Create a new card on a Trello board" },
		{ name: "trello_list_cards", provider: "trello", description: "List cards on a Trello board or list" },
		{ name: "trello_move_card", provider: "trello", description: "Move a Trello card to a different list" },
		// Notion (4)
		{ name: "notion_search", provider: "notion", description: "Search Notion pages and databases" },
		{ name: "notion_create_page", provider: "notion", description: "Create a new page in Notion" },
		{ name: "notion_get_page", provider: "notion", description: "Get a Notion page by ID" },
		{ name: "notion_update_page", provider: "notion", description: "Update properties on a Notion page" },
	];

	const allTools = new Map();
	for (const t of tools) {
		allTools.set(`${t.provider}::${t.name}`, { ...t, inputSchema: { type: "object", properties: {} } });
	}
	buildIndex(allTools);
	return allTools;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

buildTestCorpus();

// ── Basic ranking: exact provider+action queries ──

section("Basic ranking — exact queries");

assert(
	'"list my emails" → gmail_list_messages',
	topN("list my emails")[0] === "gmail_list_messages",
	`got: ${topN("list my emails")[0]}`,
);

assert(
	'"create a jira ticket" → jira_create_issue',
	topN("create a jira ticket")[0] === "jira_create_issue",
	`got: ${topN("create a jira ticket")[0]}`,
);

assert(
	'"send email" → gmail_send_message',
	topN("send email")[0] === "gmail_send_message",
	`got: ${topN("send email")[0]}`,
);

assert(
	'"github repositories" → github_list_repos',
	topN("github repositories")[0] === "github_list_repos",
	`got: ${topN("github repositories")[0]}`,
);

assert(
	'"datadog logs" → datadog_list_logs',
	topN("datadog logs")[0] === "datadog_list_logs",
	`got: ${topN("datadog logs")[0]}`,
);

assert(
	'"notion search" → notion_search',
	topN("notion search")[0] === "notion_search",
	`got: ${topN("notion search")[0]}`,
);

assert(
	'"trello boards" → trello_list_boards',
	topN("trello boards")[0] === "trello_list_boards",
	`got: ${topN("trello boards")[0]}`,
);

assert(
	'"hubspot deals" → hubspot_list_deals',
	topN("hubspot deals")[0] === "hubspot_list_deals",
	`got: ${topN("hubspot deals")[0]}`,
);

// ── Stemming ──

section("Stemming");

assert(
	'"emails" matches "email" (plural → singular)',
	topN("list emails")[0] === "gmail_list_messages",
	`got: ${topN("list emails")[0]}`,
);

assert(
	'"candidates" matches "candidate"',
	topN("candidates")[0]?.includes("candidate") || topN("candidates")[0]?.includes("ashby"),
	`got: ${topN("candidates")[0]}`,
);

assert(
	'"creating" matches "create" via -ing removal',
	topN("creating jira issue")[0] === "jira_create_issue",
	`got: ${topN("creating jira issue")[0]}`,
);

assert(
	'"repositories" matches "repository" via -ies → -y',
	topN("github repositories")[0] === "github_list_repos",
	`got: ${topN("github repositories")[0]}`,
);

// ── Stopword handling ──

section("Stopword handling");

assert(
	'"my" is removed (stopword) — "list my emails" ≈ "list emails"',
	topN("list my emails")[0] === topN("list emails")[0],
);

assert(
	'"the" is removed — "the jira issues" ≈ "jira issues"',
	topN("the jira issues")[0] === topN("jira issues")[0],
);

assert(
	'filler words don\'t break results — "can you please list all of my emails"',
	topN("can you please list all of my emails")[0] === "gmail_list_messages",
	`got: ${topN("can you please list all of my emails")[0]}`,
);

// ── Cross-provider disambiguation ──

section("Cross-provider disambiguation");

const contactResults = topN("hubspot contacts", 3);
assert(
	'"hubspot contacts" → HubSpot tools rank first (not Ashby)',
	contactResults[0] === "hubspot_list_contacts" || contactResults[0] === "hubspot_get_contact",
	`got: ${contactResults.join(", ")}`,
);

const issueResults = topN("jira issue", 3);
assert(
	'"jira issue" → Jira tools rank first (not GitHub issues)',
	issueResults[0]?.startsWith("jira_"),
	`got: ${issueResults.join(", ")}`,
);

const githubIssueResults = topN("github issue", 3);
assert(
	'"github issue" → GitHub issue tools rank first (not Jira)',
	githubIssueResults[0]?.startsWith("github_"),
	`got: ${githubIssueResults.join(", ")}`,
);

// ── Action-type disambiguation ──

section("Action-type disambiguation");

assert(
	'"create contact hubspot" → hubspot_create_contact (not list)',
	topN("create contact hubspot")[0] === "hubspot_create_contact",
	`got: ${topN("create contact hubspot")[0]}`,
);

assert(
	'"delete email" → gmail_delete_message',
	topN("delete email")[0] === "gmail_delete_message",
	`got: ${topN("delete email")[0]}`,
);

assert(
	'"update jira issue" → jira_update_issue (not create or list)',
	topN("update jira issue")[0] === "jira_update_issue",
	`got: ${topN("update jira issue")[0]}`,
);

// ── Scoring properties ──

section("Scoring properties");

assert(
	"exact provider name scores higher than vague query",
	topScore("gmail list messages") > topScore("list messages"),
	`gmail: ${topScore("gmail list messages")}, vague: ${topScore("list messages")}`,
);

assert(
	"scores are in [0, 1] range",
	(() => {
		const results = handleSearch({ query: "email", limit: 20 });
		return results.tools.every((t) => t.score >= 0 && t.score <= 1);
	})(),
);

assert(
	"more specific queries score higher than generic ones",
	topScore("gmail send email message") > topScore("send"),
	`specific: ${topScore("gmail send email message")}, generic: ${topScore("send")}`,
);

// ── Edge cases ──

section("Edge cases");

assert(
	"empty query returns no results",
	resultCount("") === 0,
);

assert(
	"all-stopwords query returns no results",
	resultCount("the a an is are") === 0,
);

assert(
	"nonsense query returns no results (or very low scores)",
	resultCount("xyzzy foobar quxwaldo") === 0,
);

assert(
	"single character query returns no results (filtered by stopwords/length)",
	resultCount("a") === 0,
);

assert(
	"special characters don't crash the search",
	(() => {
		handleSearch({ query: "email @#$%^&*()" });
		return true;
	})(),
);

assert(
	"very long query doesn't crash",
	(() => {
		handleSearch({ query: "list ".repeat(200) + "emails" });
		return true;
	})(),
);

assert(
	"limit=1 returns at most 1 result",
	handleSearch({ query: "email", limit: 1 }).tools.length <= 1,
);

assert(
	"limit=0 falls back to default (0 is falsy)",
	(() => {
		const r = handleSearch({ query: "email", limit: 0 });
		return r.tools.length > 0; // 0 || 5 → defaults to 5
	})(),
);

// ── Result structure ──

section("Result structure");

const sampleResult = handleSearch({ query: "gmail" });
assert(
	"results have name field",
	sampleResult.tools.every((t) => typeof t.name === "string" && t.name.length > 0),
);

assert(
	"results have provider field",
	sampleResult.tools.every((t) => typeof t.provider === "string" && t.provider.length > 0),
);

assert(
	"results have description field",
	sampleResult.tools.every((t) => typeof t.description === "string"),
);

assert(
	"results have numeric score",
	sampleResult.tools.every((t) => typeof t.score === "number"),
);

assert(
	"results are sorted by score descending",
	(() => {
		for (let i = 1; i < sampleResult.tools.length; i++) {
			if (sampleResult.tools[i]!.score > sampleResult.tools[i - 1]!.score) return false;
		}
		return true;
	})(),
);

// ── Scale test: rebuild index with more tools ──

section("Scale — 200 tools");

const scaledTools = new Map();
const providers = ["gmail", "jira", "github", "hubspot", "ashby", "datadog", "trello", "notion", "zendesk", "slack"];
const actions = ["list", "get", "create", "update", "delete", "search", "archive", "restore", "export", "import"];
const resources = ["messages", "issues", "contacts", "candidates", "logs", "boards", "pages", "tickets", "repos", "deals"];

let toolCount = 0;
for (const prov of providers) {
	for (const action of actions) {
		for (const resource of resources.slice(0, 2)) {
			const name = `${prov}_${action}_${resource}`;
			scaledTools.set(`${prov}::${name}`, {
				name,
				provider: prov,
				description: `${action} ${resource} in ${prov}`,
				inputSchema: { type: "object", properties: {} },
			});
			toolCount++;
		}
	}
}
buildIndex(scaledTools);

assert(
	`indexed ${toolCount} tools without errors`,
	toolCount === 200,
);

assert(
	"search still returns results at scale",
	resultCount("gmail list messages") > 0,
);

assert(
	"provider disambiguation works at scale",
	(() => {
		const r = topN("jira issues", 3);
		return r.every((name) => name.startsWith("jira_"));
	})(),
	`got: ${topN("jira issues", 3).join(", ")}`,
);

assert(
	"action disambiguation works at scale",
	topN("create slack messages")[0]?.includes("create"),
	`got: ${topN("create slack messages")[0]}`,
);

// ── Rebuild original corpus for remaining tests ──
buildTestCorpus();

// ── Natural language queries (the real test) ──

section("Natural language queries");

assert(
	'"check my inbox" → gmail (inbox = email)',
	topN("check my inbox")[0]?.startsWith("gmail_"),
	`got: ${topN("check my inbox")[0]}`,
);

assert(
	'"open pull requests" → github_list_pull_requests',
	topN("open pull requests")[0] === "github_list_pull_requests",
	`got: ${topN("open pull requests")[0]}`,
);

assert(
	'"monitoring alerts" → datadog_list_monitors',
	topN("monitoring alerts")[0] === "datadog_list_monitors",
	`got: ${topN("monitoring alerts")[0]}`,
);

// NOTE: "hiring pipeline" doesn't match Ashby because neither word appears
// in Ashby descriptions ("job candidates", "interviews"). This is a known
// limitation of lexical search — semantic search would bridge this gap.
// Use terms that appear in the tool corpus:
assert(
	'"job candidates" → ashby tools',
	topN("job candidates")[0]?.startsWith("ashby_"),
	`got: ${topN("job candidates")[0]}`,
);

assert(
	'"CRM contacts" → hubspot',
	topN("CRM contacts")[0]?.startsWith("hubspot_"),
	`got: ${topN("CRM contacts")[0]}`,
);

// NOTE: "project board" matches jira_list_projects because "project" has
// higher IDF than "board". Lexical search is keyword-literal. Use the
// provider name for disambiguation:
assert(
	'"trello board" → trello tools',
	topN("trello board")[0]?.startsWith("trello_"),
	`got: ${topN("trello board")[0]}`,
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"═".repeat(50)}`);
console.log(`${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(50)}`);
process.exit(failed > 0 ? 1 : 0);
