// Structural sync for the localized copies in /es and /it.
//
// The localized pages are hand-maintained translations — their body copy is the
// source of truth and this script NEVER rewrites translated text. It only keeps
// the mechanical, URL-derived parts consistent with the English source:
//
//   - <html lang="…">
//   - canonical + hreflang alternate block
//   - og:url and og:locale
//   - ../ asset-path prefixes (css, js, images, favicon)
//   - the EN/ES/IT language selector (inserted only if missing)
//   - sitemap.xml entries for every localized URL
//
// If a localized page does not exist yet, it is scaffolded from the English
// page (title/meta/nav from the metadata table below, body left in English) and
// a loud warning is printed: new pages still need a real translation.

import { readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const site = "https://www.mustitarguimoroccotours.com";
const locales = ["es", "it"];
const pages = [
  "index.html",
  "about.html",
  "services.html",
  "blog.html",
  "single.html",
  "contact.html",
  "sahara-desert-trek.html",
  "imperial-cities.html",
  "private-morocco-road-trip.html",
];

const ogLocale = { en: "en_US", es: "es_ES", it: "it_IT" };

// Used only when scaffolding a page that has no localized copy yet.
const metadata = {
  es: {
    index: ["Viajes privados por Marruecos | Musti Targui Morocco tours", "Viajes privados por Marruecos, aventuras en el Sáhara e itinerarios a medida guiados por expertos locales desde Merzouga."],
    about: ["Nuestra historia | Musti Targui Morocco tours", "Conoce a un equipo local de Merzouga que crea experiencias auténticas en Marruecos y el Sáhara."],
    services: ["Viajes — Sáhara, ciudades y rutas | Musti Targui Morocco tours", "Explora Marruecos con viajes privados, aventuras en el Sáhara y rutas diseñadas a tu medida."],
    blog: ["Diario — historias de viaje por Marruecos | Musti Targui Morocco tours", "Historias de viaje, consejos para el Sáhara e inspiración cultural de Marruecos."],
    single: ["Guía del Sáhara para tu primer viaje | Musti Targui Morocco tours", "Qué esperar, qué llevar y cómo se vive un viaje al Sáhara desde Merzouga."],
    contact: ["Planifica tu viaje por Marruecos | Musti Targui Morocco tours", "Planifica un viaje privado por Marruecos o el Sáhara con Musti Targui Morocco tours."],
    "sahara-desert-trek": ["Trekking por el Sáhara — de 2 a 4 días en Merzouga | Musti Targui Morocco tours", "Travesías privadas por Erg Chebbi, camellos, campamentos bereberes y amaneceres entre dunas."],
    "imperial-cities": ["Ciudades Imperiales — Fez, Mequinez, Rabat y Marrakech | Musti Targui Morocco tours", "Un viaje privado por las Ciudades Imperiales de Marruecos, con medinas, palacios y guía local."],
    "private-morocco-road-trip": ["Ruta privada por Marruecos a medida | Musti Targui Morocco tours", "Una ruta privada por el Atlas, el Sáhara, las ciudades imperiales y la costa, diseñada para ti."],
    nav: ["Inicio", "Nuestra historia", "Viajes", "Diario", "Contacto", "Empieza a planificar"],
  },
  it: {
    index: ["Viaggi privati in Marocco | Musti Targui Morocco tours", "Viaggi privati in Marocco, avventure nel Sahara e itinerari su misura guidati da esperti locali di Merzouga."],
    about: ["La nostra storia | Musti Targui Morocco tours", "Scopri un team locale di Merzouga che crea esperienze autentiche in Marocco e nel Sahara."],
    services: ["Viaggi — Sahara, città e itinerari | Musti Targui Morocco tours", "Esplora il Marocco con viaggi privati, avventure nel Sahara e itinerari creati su misura."],
    blog: ["Diario — storie di viaggio in Marocco | Musti Targui Morocco tours", "Storie di viaggio, consigli per il Sahara e ispirazione culturale dal Marocco."],
    single: ["Guida al Sahara per chi parte per la prima volta | Musti Targui Morocco tours", "Cosa aspettarsi, cosa portare e come si svolge un viaggio nel Sahara da Merzouga."],
    contact: ["Organizza il tuo viaggio in Marocco | Musti Targui Morocco tours", "Organizza un viaggio privato in Marocco o nel Sahara con Musti Targui Morocco tours."],
    "sahara-desert-trek": ["Trekking nel Sahara — da 2 a 4 giorni a Merzouga | Musti Targui Morocco tours", "Trekking privati nell'Erg Chebbi, cammelli, campi berberi e albe tra le dune."],
    "imperial-cities": ["Città Imperiali — Fès, Meknès, Rabat e Marrakech | Musti Targui Morocco tours", "Un viaggio privato nelle Città Imperiali del Marocco, con medine, palazzi e guida locale."],
    "private-morocco-road-trip": ["Tour privato del Marocco su misura | Musti Targui Morocco tours", "Un itinerario privato attraverso Atlante, Sahara, città imperiali e costa, creato per te."],
    nav: ["Home", "La nostra storia", "Viaggi", "Diario", "Contatti", "Inizia a pianificare"],
  },
};

function exists(path) {
  return access(path).then(
    () => true,
    () => false,
  );
}
function pageUrl(locale, page) {
  const slug = page === "index.html" ? "" : page;
  return locale ? `${site}/${locale}/${slug}` : `${site}/${slug}`;
}
function alternates(page) {
  const en = pageUrl("", page);
  const es = pageUrl("es", page);
  const it = pageUrl("it", page);
  return ["en", "es", "it", "x-default"].map((lang) => {
    const href = { en, es, it, "x-default": en }[lang];
    return `    <link rel="alternate" hreflang="${lang}" href="${href}" />`;
  });
}
function selectorMarkup(page, locale) {
  const prefix = locale ? "../" : "";
  const active = locale || "en";
  const links = ["en", "es", "it"]
    .map((lang) => {
      const href = `${prefix}${lang === "en" ? "" : `${lang}/`}${page}`;
      const current = lang === active ? ` aria-current="true"` : "";
      return `<a href="${href}" lang="${lang}"${current}>${lang.toUpperCase()}</a>`;
    })
    .join("");
  return `<div class="language-selector" aria-label="Language selector">${links}</div>`;
}

function syncHead(html, page, locale) {
  let out = html;

  // <html lang>
  out = out.replace(/<html lang="[^"]*">/, `<html lang="${locale || "en"}">`);

  // canonical + hreflang block (matches however many alternate links follow;
  // the leading indent of the first link is intentionally left in place)
  const canonicalRx =
    /<link rel="canonical" href="[^"]+" \/>(?:\n[ \t]*<link rel="alternate" hreflang="[^"]+" href="[^"]+" \/>)*/;
  const block =
    `<link rel="canonical" href="${pageUrl(locale, page)}" />\n` +
    alternates(page).join("\n");
  if (canonicalRx.test(out)) {
    out = out.replace(canonicalRx, block);
  } else if (out.includes('rel="preconnect"')) {
    out = out.replace('    <link rel="preconnect"', `    ${block}\n    <link rel="preconnect"`);
  }

  // og:url (attribute layout may span lines — preserve the whitespace)
  out = out.replace(
    /(<meta(\s+)property="og:url"(\s+)content=")[^"]+(")/,
    `$1${pageUrl(locale, page)}$4`,
  );

  // og:locale
  if (/property="og:locale"/.test(out)) {
    out = out.replace(
      /(<meta[^>]*property="og:locale"[^>]*content=")[^"]+(")/,
      `$1${ogLocale[locale || "en"]}$2`,
    );
  }

  // language selector — insert after the primary nav if it is missing
  if (!out.includes('class="language-selector"')) {
    out = out.replace(
      /(<nav id="primary-menu" class="main-nav" aria-label="Primary navigation">)/,
      `$1${selectorMarkup(page, locale)}`,
    );
  }

  if (locale) {
    // ../ prefixes for assets referenced from the locale subfolder (idempotent)
    out = out
      .replace(/href="(?!\.\.\/|https?:|\/\/|#|mailto:|tel:)(css\/)/g, 'href="../$1')
      .replace(/href="(?!\.\.\/|https?:)(favicon\.png)"/g, 'href="../$1"')
      .replace(/(src|srcset)="(?!\.\.\/|https?:|\/\/)(images\/)/g, '$1="../$2')
      .replace(/src="(?!\.\.\/|https?:)(js\/)/g, 'src="../$1');
  }
  return out;
}

for (const page of pages) {
  const englishPath = join(root, page);
  const english = await readFile(englishPath, "utf8");
  await writeFile(englishPath, syncHead(english, page, ""));

  for (const locale of locales) {
    const localePath = join(root, locale, page);
    const isNew = !(await exists(localePath));
    const source = isNew ? english : await readFile(localePath, "utf8");
    await writeFile(localePath, syncHead(source, page, locale));
    if (isNew) {
      const key = page.replace(/\.html$/, "");
      const [title, description] = metadata[locale][key];
      const scaffolded = (await readFile(localePath, "utf8"))
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta(\s+)name="description"(\s+)content=")[^"]+(")/, `$1${description}$4`);
      await writeFile(localePath, scaffolded);
      console.warn(
        `NEW — ${locale}/${page} was scaffolded from English. Its body copy still needs a real ${locale.toUpperCase()} translation.`,
      );
    }
  }
}

// Sitemap: make sure every localized URL is listed (idempotent).
const sitemapPath = join(root, "sitemap.xml");
let sitemap = await readFile(sitemapPath, "utf8");
const missing = locales.flatMap((locale) =>
  pages
    .filter((page) => !sitemap.includes(pageUrl(locale, page)))
    .map(
      (page) =>
        `\t<url>\n\t\t<loc>${pageUrl(locale, page)}</loc>\n\t\t<lastmod>2026-09-22</lastmod>\n\t\t<changefreq>monthly</changefreq>\n\t\t<priority>${page === "index.html" ? "1.0" : "0.7"}</priority>\n\t</url>`,
    ),
);
if (missing.length) {
  sitemap = sitemap.replace("</urlset>", `${missing.join("\n")}\n</urlset>`);
}
await writeFile(sitemapPath, sitemap);

console.log(`OK — synced structural head/nav/sitemap for ${pages.length} pages × ${locales.length} locales (translated copy untouched).`);
