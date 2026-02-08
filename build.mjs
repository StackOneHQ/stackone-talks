import { rmSync, mkdirSync, copyFileSync, cpSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

// Auto-discover talks: any directory with a slides.html file
const talks = readdirSync(".")
  .filter((entry) => {
    if (entry.startsWith(".") || entry === "public" || entry === "node_modules") return false;
    if (!statSync(entry).isDirectory()) return false;
    return existsSync(join(entry, "slides.html"));
  })
  .map((dir) => {
    // Load metadata from talk.json if it exists, otherwise derive from dir name
    const metaPath = join(dir, "talk.json");
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      return { dir, title: meta.title, event: meta.event, date: meta.date };
    }
    // Derive from directory name (e.g. "2026-02-mcpconf-london" → "mcpconf london")
    const name = dir.replace(/^\d{4}-\d{2}-/, "").replace(/-/g, " ");
    return { dir, title: name, event: "", date: dir.slice(0, 7) };
  })
  .sort((a, b) => b.dir.localeCompare(a.dir)); // newest first

const publicDir = "public";

// Clean and recreate public/
rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });

// Copy each talk's slides.html → public/<talk-dir>/index.html
for (const talk of talks) {
  const src = join(talk.dir, "slides.html");
  const dest = join(publicDir, talk.dir);
  mkdirSync(dest, { recursive: true });
  copyFileSync(src, join(dest, "index.html"));
  console.log(`Copied ${src} → ${join(dest, "index.html")}`);

  // Copy assets if they exist
  const assetsDir = join(talk.dir, "assets");
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, join(dest, "assets"), { recursive: true });
    console.log(`Copied assets for ${talk.dir}`);
  }
}

// Generate landing page
const talkListHtml = talks
  .map(
    (t) => `
      <a href="/${t.dir}/" class="talk">
        <span class="talk-title">${t.title}</span>
        ${t.event ? `<span class="talk-meta">${t.event} &middot; ${t.date}</span>` : `<span class="talk-meta">${t.date}</span>`}
      </a>`
  )
  .join("\n");

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StackOne Talks</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 1.5rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    h1 span { color: #05C168; }
    .subtitle {
      color: #888;
      margin-bottom: 3rem;
      font-size: 1.1rem;
    }
    .talks {
      width: 100%;
      max-width: 640px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .talk {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1.25rem 1.5rem;
      background: #161616;
      border: 1px solid #262626;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, background 0.15s;
    }
    .talk:hover {
      border-color: #05C168;
      background: #1a1a1a;
    }
    .talk-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
    }
    .talk-meta {
      font-size: 0.9rem;
      color: #888;
    }
  </style>
</head>
<body>
  <h1>Stack<span>One</span> Talks</h1>
  <p class="subtitle">Conference presentations and slides</p>
  <div class="talks">
${talkListHtml}
  </div>
</body>
</html>`;

writeFileSync(join(publicDir, "index.html"), indexHtml);
console.log(`Generated landing page at ${join(publicDir, "index.html")}`);
console.log(`Build complete: ${talks.length} talk(s)`);
