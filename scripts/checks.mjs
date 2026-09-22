import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const pages = (await readdir(root)).filter((f) => f.endsWith(".html"));
const errors = [];

function check(cond, msg) {
  if (!cond) errors.push(msg);
}

function localHrefs(html) {
  const out = [];
  const rx = /(?:href|src)="([^"]+)"|srcset="([^"]+)"/g;
  let m;
  while ((m = rx.exec(html))) {
    const raw = m[1] || m[2];
    if (!raw) continue;
    const first = raw.split(/\s+/)[0];
    if (!first) continue;
    if (
      first.startsWith("http:") ||
      first.startsWith("https:") ||
      first.startsWith("data:") ||
      first.startsWith("mailto:") ||
      first.startsWith("tel:") ||
      first.startsWith("#") ||
      first.startsWith("${")
    )
      continue;
    out.push(first);
  }
  return out;
}

for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  check(html.includes('<meta charset="utf-8">'), `${page}: missing charset`);
  check(
    /<meta name="viewport" content="width=device-width/.test(html),
    `${page}: missing viewport`,
  );
  check(/<title>/.test(html), `${page}: missing <title>`);
  check(
    (html.match(/<h1\b/g) || []).length === 1,
    `${page}: must have exactly one <h1>`,
  );
  check(/<main\b/.test(html), `${page}: missing <main> landmark`);
  check(/class="skip-link"/.test(html), `${page}: missing skip link`);
  for (const ref of localHrefs(html)) {
    check(existsSync(join(root, ref)), `${page}: broken reference "${ref}"`);
  }
  for (const src of html.matchAll(/<source srcset="([^"]+\.webp)"/g)) {
    check(
      existsSync(join(root, src[1])),
      `${page}: missing webp source "${src[1]}"`,
    );
  }
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">(.*?)<\/script>/gs,
  )) {
    try {
      JSON.parse(m[1]);
    } catch {
      errors.push(`${page}: invalid JSON-LD`);
    }
  }
}

const css = await readFile(join(root, "css", "site.css"), "utf8");
for (const m of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
  const ref = m[2];
  if (ref.startsWith("data:") || ref.startsWith("http:")) continue;
  check(
    existsSync(join(root, "css", ref)),
    `css/site.css: broken url("${ref}")`,
  );
}

for (const f of ["robots.txt", "sitemap.xml", "favicon.png", "js/site.js"]) {
  check(existsSync(join(root, f)), `missing required file ${f}`);
}

const siteJs = await readFile(join(root, "js", "site.js"), "utf8");
try {
  new vm.Script(siteJs);
} catch (e) {
  errors.push(`js/site.js: parse error — ${e.message}`);
}

if (errors.length) {
  console.error(`FAIL (${errors.length}):`);
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log(
  `OK — ${pages.length} pages, links, assets, webp sources, JSON-LD, robots.txt, sitemap all valid.`,
);
