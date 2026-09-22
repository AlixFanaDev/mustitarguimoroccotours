import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const pages = (await readdir(root, { recursive: true })).filter(
  (f) => f.endsWith(".html") && !f.startsWith("node_modules/"),
);
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
  const raw = await readFile(join(root, page), "utf8");
  const pageDir = dirname(join(root, page));
  // Strip HTML comments so disabled sections are not checked as live markup.
  const html = raw.replace(/<!--[\s\S]*?-->/g, "");
  check(
    /<meta\s+charset="utf-8"\s*\/?>/i.test(html),
    `${page}: missing charset`,
  );
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
    check(existsSync(join(pageDir, ref)), `${page}: broken reference "${ref}"`);
  }
  for (const src of html.matchAll(/<source srcset="([^"]+\.webp)"/g)) {
    check(
      existsSync(join(pageDir, src[1])),
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

// Locale coverage: every English root page needs es/ and it/ copies wired up.
const site = "https://www.mustitarguimoroccotours.com";
const localeCodes = { es: { lang: "es", og: "es_ES" }, it: { lang: "it", og: "it_IT" } };
const rootPages = pages.filter((p) => !p.includes("/"));

for (const page of rootPages) {
  const english = await readFile(join(root, page), "utf8");
  const englishOg = english.match(/property="og:locale"\s+content="([^"]+)"/);
  check(
    !englishOg || englishOg[1] === "en_US",
    `${page}: og:locale must be en_US`,
  );
  for (const [code, cfg] of Object.entries(localeCodes)) {
    const copy = `${code}/${page}`;
    check(pages.includes(copy), `${page}: missing ${code}/ localized copy`);
    if (!pages.includes(copy)) continue;
    const html = await readFile(join(root, copy), "utf8");
    check(
      html.includes(`<html lang="${cfg.lang}">`),
      `${copy}: <html lang> must be "${cfg.lang}"`,
    );
    check(
      html.includes(`<link rel="canonical" href="${site}/${code}/`),
      `${copy}: canonical must point into /${code}/`,
    );
    check(
      html.includes(`hreflang="${cfg.lang}" href="${site}/${code}/`),
      `${copy}: missing self-referencing hreflang="${cfg.lang}"`,
    );
    check(
      html.includes('hreflang="x-default"'),
      `${copy}: missing x-default hreflang`,
    );
    const og = html.match(/property="og:locale"\s+content="([^"]+)"/);
    check(
      !og || og[1] === cfg.og,
      `${copy}: og:locale must be ${cfg.og}`,
    );
    check(
      html.includes('class="language-selector"'),
      `${copy}: missing language selector`,
    );
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
