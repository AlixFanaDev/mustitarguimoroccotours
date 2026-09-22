# Musti Targui Morocco tours

Static marketing site for Musti Targui Morocco tours (Merzouga, Morocco). No CMS, no framework, no build step —
plain HTML + CSS + JavaScript, served as-is by any static host.

## Quick preview

```bash
npm start          # zero-dependency server on http://127.0.0.1:8080
```

No install is required for `npm start` — it is a dependency-free Node server
(`scripts/server.mjs`) written with the standard library only.

Need a preview with zero Node? `python3 -m http.server 8080`.

## Languages

The site ships in three languages — English (root), Spanish (`/es/`) and
Italian (`/it/`) — with an EN/ES/IT selector in the navigation of every page,
plus `hreflang`/`canonical` alternates and localized sitemap entries.

- The localized pages are **hand-maintained translations**: `es/*.html` and
  `it/*.html` mirror the English pages one-to-one. When you edit English copy,
  apply the same edit to both localized copies (they share structure, ids,
  classes and asset paths — only text, meta and locale URLs differ).
- `npm run build:locales` performs a **structural sync only**: it refreshes
  `<html lang>`, canonical/hreflang, `og:url`/`og:locale`, `../` asset prefixes,
  the language selector and sitemap entries. It never rewrites translated text.
  If a new English page has no localized copy yet, the script scaffolds one and
  warns that it still needs a real translation.
- `npm test` validates all 27 pages, including locale wiring (`<html lang>`,
  self-referencing `hreflang`, canonical under the right locale, `og:locale`,
  language selector present, every English page has `es/` + `it/` copies).

## Checks

```bash
npm test           # pure, zero-dependency: links, asset references, WebP sources,
                   # JSON-LD, per-page structure (one <h1>, landmarks, charset…)
npm run test:a11y  # WCAG2AA audit of every page with pa11y (requires `npm ci` first;
                   # skips gracefully if pa11y is missing)
```

Lighthouse / PageSpeed: start the server (`npm start`), then

```bash
npx lighthouse http://127.0.0.1:8080/index.html --preset=desktop
npx lighthouse http://127.0.0.1:8080/index.html --preset=mobile
```

## Deploy

Static output — the whole repository root is the site. Push to a branch with the included
GitHub Actions workflow (`.github/workflows/ci.yml`) and the checks run automatically;
on `main` the site deploys to GitHub Pages (enable **Settings → Pages → Build and deployment →
GitHub Actions** first). Works equally on Netlify, Cloudflare Pages, Vercel, or any static host
— point it at the repo root and set the publish directory to `/`.

## Before relaunch

Operating data Musti must confirm (see the launch-readiness plan):

- Tour prices (currently placeholders): 950 MAD Sahara trek, 2,900 MAD Imperial Cities, 1,150 MAD/day road trip — embedded in page text, meta descriptions, and JSON-LD `Offer`/`offers`.
- The "usually replies within 2 hours" promise must match real WhatsApp availability.
- Real testimonials and guest counts (with client permission) — the site intentionally holds a trust-row only, no fabricated reviews.
- Journal articles: publish real articles and move `single.html` to a proper slug (e.g. `/journal/first-timers-guide-sahara.html`), keeping a 301 plan for any links already shared.