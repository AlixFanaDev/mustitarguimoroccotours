import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 8080);
const pages = (await readdir(root, { recursive: true })).filter(
  (file) => file.endsWith(".html") && !file.startsWith("node_modules/"),
);

let pa11y;
try {
  const mod = await import("pa11y");
  pa11y = mod.default ?? mod;
} catch {
  console.error("pa11y not installed. Run `npm ci` to install it, then retry.");
  console.error(
    "npm test still runs the pure link/structure checks without it.",
  );
  process.exit(0);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  try {
    const body = await readFile(join(root, "." + pathname));
    res.writeHead(200, {
      "Content-Type": mime[extname(pathname)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise((r) => server.listen(port, r));

const failures = [];
for (const page of pages) {
  let issues = [];
  try {
    // Awaited call keeps the event loop free so the server above can respond.
    const results = await pa11y(`http://127.0.0.1:${port}/${page}`, {
      standard: "WCAG2AA",
      timeout: 30000,
    });
    issues = results.issues ?? [];
  } catch (e) {
    failures.push(
      `${page}: pa11y could not run (${String(e.message || e)
        .slice(0, 120)
        .replace(/\s+/g, " ")})`,
    );
    continue;
  }
  const errs = issues.filter((i) => i.type === "error");
  if (errs.length) {
    failures.push(`${page}: ${errs.length} WCAG2AA error(s)`);
    for (const e of errs.slice(0, 4))
      failures.push(`   - ${e.code}: ${e.message}`);
  } else {
    console.log(`OK ${page} (${issues.length} total notices)`);
  }
}

server.close();
if (failures.length) {
  console.error(`\na11y FAIL (${failures.length}):`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("\na11y OK — no WCAG2AA errors across all pages.");
