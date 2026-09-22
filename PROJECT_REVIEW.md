# Project review

**Project:** Musti Targui Morocco Tours static website  
**Reviewed:** 2026-09-22  
**Scope:** all nine HTML pages, site CSS/JavaScript, validation scripts, dependency manifest, local server, and GitHub Actions workflow.

## Result

The project is in a healthy, deployable state. All automated checks passed, including a WCAG 2.2 AA audit of every published page. No broken local references, malformed JSON-LD, JavaScript syntax errors, or production dependency vulnerabilities were found.

## Test results

| Check | Result | Evidence |
| --- | --- | --- |
| Structural, link, asset, WebP, JSON-LD, robots, and sitemap validation | Pass | `npm test` — 9 pages validated |
| Accessibility | Pass | `npm run test:a11y` — 0 WCAG 2.2 AA errors/notices on all 9 pages |
| JavaScript syntax | Pass | `node --check` passed for `js/site.js` and all three scripts |
| Production dependency audit | Pass | `npm audit --omit=dev --audit-level=low` — 0 vulnerabilities |
| Local-server smoke test | Pass | `/`, `/contact.html`, and `/css/site.css` returned 200; a missing route returned 404; encoded traversal request returned 403 |
| CI workflow review | Pass | Node 22, clean install, structural checks, accessibility audit, and GitHub Pages deployment are configured |

## What was reviewed

- All pages include the expected document essentials: charset, viewport, one `h1`, a `main` landmark, skip link, and JSON-LD where present.
- Local links and image sources resolve; each declared WebP alternative exists.
- The contact form uses built-in browser validation, a honeypot field, and constructs its WhatsApp message with `URLSearchParams`, which safely encodes customer-entered text.
- The production server prevents encoded directory traversal. It serves normal assets and responds appropriately to missing files.
- The mobile contact and feature-card typography changes are scoped to the relevant responsive breakpoints.

## Findings and recommendations

No release-blocking issues were found.

1. **Low — stylesheet maintainability.** `css/site.css` starts with a very large minified rule block and later adds formatted overrides. This works, but makes future responsive changes and code review harder. Keep an editable source stylesheet (or format this file) and generate the minified production file during deployment.

2. **Low — CI supply-chain hardening.** The workflow references GitHub Actions by major-version tags (for example, `actions/checkout@v4`). This is normal, but pinning actions to full commit SHAs would provide stronger reproducibility and supply-chain protection.

3. **Advisory — visual/performance testing.** Automated accessibility testing is clean, but it does not replace manual checks on real phones or a performance audit. Before a major launch, run a Lighthouse/PageSpeed pass and visually check the 320 px, 375 px, 768 px, and desktop breakpoints in supported browsers.

## Limitations

- The review did not test the deployed public domain, analytics, search-console status, or third-party WhatsApp delivery.
- The visual recommendations above are not defects identified by the automated test suite; they are prudent final-release checks.

## Suggested release checklist

- [x] Run `npm test`
- [x] Run `npm run test:a11y`
- [x] Run `npm audit --omit=dev --audit-level=low`
- [ ] Perform a quick real-device visual check after the next deployment
- [ ] Verify the live GitHub Pages URL and WhatsApp inquiry flow
