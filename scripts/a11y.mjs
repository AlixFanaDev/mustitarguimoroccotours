import { spawnSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 8080);
const pages = [
  "index.html",
  "services.html",
  "about.html",
  "blog.html",
  "single.html",
  "contact.html",
  "sahara-desert-trek.html",
  "imperial-cities.html",
  "private-morocco-road-trip.html",
];

const probe = spawnSync("npx", ["--no-install", "pa11y", "--version"], {
  stdio: "ignore",
});
if (probe.status !== 0) {
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
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "pa11y",
      "--standard",
      "WCAG2AA",
      "--json",
      `http://127.0.0.1:${port}/${page}`,
    ],
    { encoding: "utf8" },
  );
  let issues = [];
  try {
    issues = JSON.parse(result.stdout);
  } catch {
    failures.push(
      `${page}: pa11y could not run (${result.stderr?.slice(0, 120) || "unknown"})`,
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
