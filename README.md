# Tristate Property Management LLC — website

Astro 7 (TypeScript) → Cloudflare Workers static assets, with D1, R2, Turnstile and Resend.
The approved `index (1).html` prototype is reproduced markup-for-markup; the stylesheet is the
original one, unmodified except for the change documented below.

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 7 (`output: 'static'` + Cloudflare adapter) |
| Hosting | Cloudflare Workers static assets (Pages also works — see below) |
| API | `src/pages/api/*` (`export const prerender = false`) |
| Database | Cloudflare D1 (`leads`, `accounts`, `jobs`, `cashback_ledger`, `offers`) |
| Storage | Cloudflare R2 (`MEDIA` binding, scaffolded — not used yet) |
| Anti-spam | Cloudflare Turnstile + honeypot field |
| Email | Resend |
| Fonts | self-hosted via Fontsource (no Google Fonts CDN) |

## Two deliberate deviations from the prototype

1. **`@container frame (…)` → `@media (…)`** — the prototype's responsive rules were scoped to
   the preview iframe wrapper (`#frame`, `container-type: inline-size`). That wrapper does not
   exist on the real site, so every one of those rules would have been dead. The four blocks now
   key off the viewport at the identical breakpoints (1080 / 940 / 720 / 420px).
2. **`output: 'hybrid'` is not used** — it was removed in Astro 5. The current equivalent is
   `output: 'static'` plus an adapter, with `export const prerender = false` on the API routes.
   Every page is still pre-rendered HTML; only `/api/*` runs on request.

Everything else — colours, type scale, spacing, class names, DOM order — is byte-identical to the
approved file. `src/styles/global.css` is the original stylesheet; anything the production build
needed (skip link, form status, `img{height:auto}`, reduced-motion) lives separately in
`src/styles/additions.css` so the approved sheet stays clean.

## Build output layout (why the 404 happened)

By default the Cloudflare adapter emits `dist/client` + `dist/server`, so a Pages project whose
output directory is `dist` finds no `index.html` at the root and every URL returns 404.
`astro.config.mjs` now flattens it with `outDir: './dist'` and
`build: { client: './', server: './_worker.js' }`, producing:

```
dist/
|- index.html            <- root document (this is what was missing)
|- services/index.html   contact/  industries/  why-tristate/
|- _astro/  images/  robots.txt  sitemap-index.xml
|- _headers  _routes.json  .assetsignore
`- _worker.js/           entry.mjs + index.js (server routes)
```

Cloudflare Pages settings: build command `npm run build`, output directory `dist`, Node 22.
A build hook writes `_worker.js/index.js` (Pages looks for `index.js` inside a `_worker.js`
directory; the adapter names its entry `entry.mjs`) plus a `_routes.json` that sends only
`/api/*` to the Worker, so static pages come straight from the CDN.

`trailingSlash` is `'ignore'`, not `'always'` - `'always'` 301-redirects `POST /api/leads` to
`/api/leads/` and drops the request body, breaking the form and the future mobile app. Pages
still build as directory URLs and every canonical is explicit, so no SEO is lost.

Bindings on Pages are set in the dashboard (Settings -> Functions), not read from
`wrangler.jsonc`: add `DB` (D1), `MEDIA` (R2) and the two secrets there.

## Language and type checking

TypeScript is the only language you write logic in — API routes, schema builders,
validation, site data and the `.astro` frontmatter are all TypeScript. By line count the repo
is mostly markup and CSS, which is what a content site should be:

| | lines | share |
|---|---|---|
| HTML / Astro markup | ~2,460 | 46% |
| CSS | ~1,760 | 32% |
| **TypeScript** (`.ts` + `.astro` frontmatter) | **~940** | **17%** |
| Config, SQL, Markdown | ~280 | 5% |

Client-side behaviour lives in `src/scripts/*.ts` — `lead-form.ts`, `quote-popup.ts` and
`chat-widget.ts` — imported from their components with a plain `<script>`, so Astro bundles,
minifies and type-checks them. They were previously `is:inline`, which Astro ships untouched and
never checks; that was the only part of the codebase without type safety.

The one remaining inline script is the Turnstile loader, which is a remote URL, not our code.
The JSON-LD block is `is:inline` too, but it is data rather than script.

```bash
npm run types    # regenerate Cloudflare binding types from wrangler.jsonc
npm run check    # astro check — TypeScript across .ts and .astro
```

CI (`.github/workflows/ci.yml`) runs `check` then `build` on every push to main and on every
pull request, so a type error cannot reach production silently again.

**CI must run plain `npm ci`, not `npm ci --legacy-peer-deps`.** `.github/workflows/ci.yml`
still carries the flag, which makes CI resolve dependencies more permissively than the deploy
does: a broken lockfile goes green here and then fails on Cloudflare with EUSAGE, and the
dashboard shows only "No deployment available" with no error. That is the four-failed-deploys
failure. The fix is deleting nine characters, but it needs a token with `workflow` scope to
push, so it is left here rather than done silently:

```yaml
      - run: npm ci          # was: npm ci --legacy-peer-deps
```

Verified that plain `npm ci` succeeds from a clean `node_modules` on the current lockfile, so
this change is safe to make now.

**Keep `package-lock.json` in sync with `package.json`.** Cloudflare Pages installs with a plain
`npm ci`, which hard-fails if the lock file is missing anything the manifest implies — the build
never even starts, and the dashboard just shows "No deployment available". If you ever install
with `--legacy-peer-deps`, re-run a clean `rm -rf node_modules package-lock.json && npm install`
before committing, and check `npm ci` succeeds from a fresh clone.

`npm run check` currently reports **0 errors, 0 warnings, 0 hints** across 43 files. It was not being run before, and when first
executed it found 8 real ones: three API routes could not resolve `cloudflare:workers`, and the
blog post route had `post` typed as `unknown`, meaning every `post.data.*` access was unchecked.
Both are fixed — bindings now come from `wrangler types`, and the route declares its props.

TypeScript is pinned to **6.x**: `astro check` needs the programmatic compiler API, which
TypeScript 7's native compiler does not ship yet. Unpinning to 7 silently disables type checking.

## Local development

```bash
npm install
npm run dev                       # http://localhost:4321 — static pages only
cp .dev.vars.example .dev.vars    # then: npm run build && npm run preview  (full Worker + D1)
```

`npm run preview` runs `wrangler dev`, which is the only way to exercise `/api/*`, D1 and
Turnstile locally. Seed the local DB first with `npm run db:local`.

Verified against `wrangler dev`: the five pages, `robots.txt` and `sitemap-index.xml` return 200;
an unknown path returns 404; `GET /api/health` returns `{"ok":true,"db":"ok"}`; `GET /api/offers`
returns `{"offers":[]}`; `POST /api/leads` returns 201 with the row present in D1; a filled
honeypot returns 200 and writes nothing; bad input returns 422 with the failing field list.

## First deploy

```bash
npx wrangler login
npx wrangler d1 create tristate-db          # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create tristate-media
npm run db:remote                          # apply db/schema.sql
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npm run deploy
```

Then check `https://<your-domain>/api/health`. It returns `{"ok":true,"db":"ok"}` only when D1
is reachable **and** every table in `db/schema.sql` exists; anything else is a `503` naming the
missing tables.

**`npm run db:remote` is not optional and is easy to skip.** A D1 binding added in the Pages
dashboard makes the site build and deploy cleanly with an entirely empty database. Static pages
render, so the site looks live, while every form POST and every `/api/offers` read returns 500.
`/api/health` used to be `SELECT 1`, which succeeds against an empty database - so the one
endpoint whose job was to catch this reported `ok`. That is why it now checks the schema.

**Deploying via Cloudflare Pages instead:** connect the GitHub repo, build command `npm run build`,
output directory `dist/client`, and add the D1/R2 bindings plus secrets in the Pages dashboard
(they are not read from `wrangler.jsonc` on Pages).

## Environment

| Name | Where | Purpose |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | build-time env | Turnstile widget (public) |
| `TURNSTILE_SECRET_KEY` | Worker secret | server-side challenge verification |
| `RESEND_API_KEY` | Worker secret | lead notification email |
| `LEAD_NOTIFY_TO` / `LEAD_NOTIFY_FROM` | `wrangler.jsonc` vars | notification addresses |

Without `PUBLIC_TURNSTILE_SITE_KEY` the widget falls back to Cloudflare's always-passes test key,
so forms work in development.

## API

| Method | Route | Notes |
|---|---|---|
| POST | `/api/leads` | JSON or form-encoded. Validate → honeypot → Turnstile → **write D1** → email. The DB write precedes the email so a Resend failure never loses a lead. |
| POST | `/api/vendors` | Vendor network applications. Same pipeline and same anti-spam posture, but writes to `vendors`. |
| GET | `/api/offers` | public promos, 5-minute cache |
| GET | `/api/health` | deploy smoke test |
| GET | `/api/me`, `/api/jobs`, `/api/cashback/*` | 501 stubs for the portal/app phase |

The same endpoints serve the website and the future React Native app — the app will send a Bearer
token where the web sends a session cookie.

## Blockers before going live

- [x] ~~**Location copy said Jacksonville, FL.**~~ Cleared - zero references to Jacksonville,
      Florida, `(904) 555-0142` or Sunbeam Road remain anywhere in `src/` or `public/`.
- [ ] **NAP is incomplete.** Phone and email are real. Still empty in `src/data/site.ts`:
      `address.city`, `address.postal`, `geo`, `license`, `areaServed`, `social`. It feeds the
      JSON-LD, so anything wrong here produces schema that disagrees with the Google Business
      Profile. `areaServed` is the biggest single ranking gain left: fill it and the coverage
      grids on the homepage and `/contact/` populate themselves.
- [ ] **Attach the custom domain.** `tristatepropertymanagement.com` currently returns 503, so
      `SITE.url` and `astro.config.mjs` point at the `.pages.dev` host instead. That is deliberate:
      `og:image`, `og:url` and the canonicals are absolute URLs built from that value, and while
      they pointed at the dead domain WhatsApp and Facebook fetched a 503 and showed no preview at
      all. Once the domain is attached in Cloudflare Pages, change both values back in the same
      commit - a canonical pointing at a host that does not serve the page is worse than none.
      `public/robots.txt` carries the sitemap URL too.
- [ ] **Google Business Profile** created and matching the NAP exactly.
- [ ] **Remote D1 has no schema.** The binding exists and `/api/health` used to report `ok`
      because it only ran `SELECT 1`, which succeeds against an empty database. Every form POST
      and `/api/offers` return 500 in production until `npm run db:remote` is run. Health now
      returns 503 and names the missing tables.
- [x] ~~**Decide on the chat widget.**~~ Done - it is real three-step lead capture posting to
      `/api/leads` with `source = 'chat-widget'`, and the status line says "Messages go straight
      to dispatch" rather than "Online now". It does still depend on the D1 schema above.
- [ ] **Unverified claims** - see the inventory below; seven of them, all listed with locations.

## Blog

Content collection at `src/content/blog/*.md`, typed by `src/content.config.ts`. Adding a post
means dropping in one markdown file — no code changes, and the sitemap and RSS feed pick it up
on the next build.

```yaml
---
title: "Under 70 characters"          # enforced by the schema
description: "70-165 characters"      # enforced — this is the meta description
publishedAt: 2026-08-20
updatedAt: 2026-09-01                 # optional; feeds dateModified
author: "Tristate Property Management"
category: "HVAC"
cover: "/images/home-hvac.webp"       # path under public/
coverAlt: "Describe the image"
draft: false                          # true = built locally, excluded from the site
---
```

The length limits are deliberate: a title over ~70 characters truncates in search results and a
missing or overlong description gets rewritten by Google. The build fails loudly rather than
shipping a bad one.

Routes: `/blog/` (listing), `/blog/<filename>/` (post), `/rss.xml` (feed, linked from `<head>`).
Each post emits `BlogPosting` + `BreadcrumbList` JSON-LD and uses its cover image for Open Graph
and the LCP preload. The listing and hero reuse the approved `.page-hero` / `.cards` / `.card`
components, so the blog inherits the design rather than introducing new UI; only the article body
(`.prose`) needed new rules, since the prototype had no long-form page to copy.

## Logo assets

The current artwork is the square TS monogram plus a two-line "PROPERTY MANAGEMENT" wordmark.
It ships with a real alpha channel, so it is used as-is - no cutout step. Verified on the new
source: of 5,607 semi-transparent edge pixels, zero are near-white, so there is no halo on the
navy footer. The artwork uses exactly two flat colours, navy `#050A31` and red `#C90F14`. Those
are close to but not identical to the stylesheet tokens (`--navy-900:#08152E`, `--red:#D8232A`);
the supplied file is left untouched rather than recoloured to match, because `global.css` is
frozen and the brand file is the client's.

| File | Use |
|---|---|
| `/images/logo-tristate.{avif,webp,png}` | header — dark ink, for the white background |
| `/images/logo-tristate-light.{avif,webp,png}` | footer — navy ink mapped to white, red kept. This is the one algorithmic recolour in the repo, and it is safe here because the artwork is two flat colours: pixels are classified by `r > b` and nothing is blended. It reproduces the treatment of the previous supplied light artwork, which also kept its red. |
| `/favicon.ico`, `/favicon-32.png`, `/icon-192.png`, `/icon-512.png` | favicons, from the circular T-and-roof mark |
| `/icon-maskable-512.png` | Android maskable - mark at 72% on white, inside the circle safe zone |
| `/apple-touch-icon.png` | 180x180 opaque white plate (iOS flattens transparency to black) |

**The six favicon files still carry the previous circular T-and-roof mark and no longer match
the header.** They were deliberately not regenerated in the logo swap. The new monogram is a
clean 1.00:1 and would tile well, but it is navy on transparent with no self-contained plate, so
it disappears against a dark tab bar - the exact property the circular mark was chosen for.
Fixing it properly means deciding on a background plate, which is a brand call, not a build one.
Until then the icons are stale but functional; `/images/og-tristate.jpg` carries the old lockup
for the same reason and needs the same decision.

Regenerate from the source disc if the artwork changes. `apple-touch-icon.png` and the maskable
icon need opaque backgrounds; the rest keep their transparency.

Served through `<picture>`: header AVIF 7 KB / WebP 12 KB / PNG 18 KB, footer AVIF 7 KB /
WebP 10 KB / PNG 16 KB - roughly a third of the previous lockup's weight. The header copy
carries `fetchpriority="high"`; the footer copy is lazy. `icon-512.png` is also the
`Organization.logo` in the JSON-LD.

The header holds a 94px minimum, stepping down to 82px below 900px. The previous lockup needed
that height to keep its "PROFESSIONAL · RELIABLE · COMMITTED" microline legible; the current
artwork has no microtext, so the bar keeps 94px purely for the nav and CTA and has more
breathing room. Dropping it back to the original 78px is now possible but was not done, because
it changes the approved proportions for no functional gain.

To regenerate after an artwork change, crop the source to its own ink bounding box and re-emit
at 460px wide, roughly 2.5x the largest rendered size, so anything bigger is wasted bytes. Both
files are 460x119, aspect **3.866**; keep the `width`/`height` attributes in step or CLS returns.

**The files are cropped to the ink, so `height x 3.866` is the rendered width - there is no
padding to absorb a mistake.** The header row is capped at ~1172px of content and seven nav
items already spend ~1170px of it, so the logo's width budget is 178px, which is exactly what
the previous lockup rendered at. `.logo img{height:46px}` is that budget divided by the aspect
ratio, and it is not a round number by accident. Measured with Playwright at 1600 / 1440 / 1366
/ 1280 / 1220 / 1180 / 1179 / 1150 / 1024 / 900 / 768 / 390: at **48px (186px wide) the phone
number wraps onto two lines at 1180px** - the widest viewport that still shows the full nav, and
the exact failure mode the nav-gap reclaim was done to fix. At 46px the row is clean at every
width: header 94/82px, `.header-cta` holds 290px, the phone number stays on one line, the burger
flips at 1180px, and horizontal overflow is 0 everywhere including 390px. Re-run the sweep before
changing this value.

Policy pages carry no "last updated" date. If you materially change one, say so in the page
text itself rather than reintroducing a date stamp that nobody remembers to bump - a stale
"Last updated August 2026" is worse than none.

## Titles and descriptions

Every page carries a hand-written title and meta description sized to current Google display
limits: titles 39-52 characters (the desktop cut-off is ~580px / 50-60 characters, and the
51-55 band has the lowest rewrite rate), descriptions 154-160 characters (~920px desktop).
Hyphens rather than pipes as separators, keyword front-loaded, brand only where it earns its
place - it is dropped entirely on blog posts, where appending "| Tristate Property Management"
was pushing every title past 80 characters.

The blog frontmatter cap is now 60 characters rather than 70, so the build fails on a title that
would truncate in search.

Google rewrites a large share of descriptions regardless; the point of writing them is that the
one you supply is the default and the source material, and it is what WhatsApp, Facebook,
LinkedIn and X show verbatim in a link preview - those do not rewrite anything.

**Locations are still generic.** Titles say "Connecticut" because no town has been supplied. The
highest-value local queries are "[town] property management" style, and hitting those needs the
town in the title, the H1 and the first 100 words. That is the single biggest ranking gain left
on the table.

## Share card (Open Graph)

`/images/og-tristate.jpg`, **1200x1200 square**, referenced from `SITE.defaultOgImage`. Blog
posts override it with their own cover and `coverAlt`.

Square is a deliberate choice: WhatsApp and the other messaging apps render the card close to
square, and a 1.91:1 image was being cropped there. The trade-off is that X crops
`summary_large_image` to 1.91:1, so it will trim the top and bottom on that platform. A padded
1.91 variant was tried and rejected - it left 286px bars each side and shrank the card to a
small square in the middle, which looked worse everywhere than the crop looks on one platform.

`og:image:width` and `og:image:height` must stay in step with the file; a wrong pair is worse
than none, because scrapers lay out the card before the image loads.

Test with Facebook's Sharing Debugger and X's Card Validator after the domain is live; both cache
aggressively, so scrape once the real content is in place rather than now.

## Unverified claims - inventory

These are asserted on the site and nobody has confirmed them. Each is a factual claim a
customer could rely on, so each needs a yes or a deletion before the site is indexed. This
list is the whole set, with every location, so it can be cleared in one pass.

| Claim | Where | Needs |
|---|---|---|
| `$2M Insured` | footer badge (every page) | the certificate of insurance |
| `Licensed & Insured` | ~~utility bar~~ - cleared, the bar was removed with the header trim | nothing outstanding here any more |
| `OSHA 30` | footer badge (every page) | who holds it, and a current card |
| `Bonded` | footer badge (every page) | the bond |
| `52 services` | `/services/` H1, `/why-tristate/`, homepage CTA | count the list; if it is not 52, say the real number |
| `24/7` emergency | footer, services chips x8, popup, chat, both form error messages, `/contact/`, Contact mega-panel hours line | someone genuinely answering at 3am, or drop to stated hours. The utility bar instance is gone - the bar was removed with the header trim |
| 4-hour emergency response | `/why-tristate/`, `src/data/faq.ts` | a response time the crew can actually hold |
| Badged, drug-screened, background-checked | `/why-tristate/` x3, `/industries/` x2, homepage x2 | a screening process that exists |

The `24/7` line matters most: it appears in both form failure messages, so a visitor whose
submission errors is told to call a number that must be answered. It is also the easiest to
get wrong, because "we usually pick up" is not what it says.

## Testimonials

`src/data/testimonials.ts` is **empty on purpose**. It previously held seven invented
testimonials with invented names and job titles. Publishing a testimonial nobody gave is a
deceptive practice under the FTC's endorsement rules, and there was no SEO upside to offset
the risk - Google discounts self-hosted review markup, which is why this site emits no
`AggregateRating`. They were removed rather than annotated, because a comment in a source
file does not reach the visitor reading the quote.

While the array is empty the homepage reviews section is not rendered at all, and the three
sections after it flip background so the page keeps alternating white and off-white. Add one
real quote and the section, the carousel, the dots and the original rhythm all come back with
no markup changes. Reviews on the Google Business Profile are worth more than anything
self-hosted here and should come first.

Built on native scroll-snap rather than a transform track, so touch swipe, keyboard scrolling
and the scrollbar work without extra code, and with JavaScript disabled the section degrades to
a scrollable row instead of showing one card. Three cards per view on desktop, two under 980px,
one under 720px; dots are rebuilt on resize to match.

Autoplay advances one card every 6s and stops on hover, on focus, when the section scrolls out
of view, and entirely for `prefers-reduced-motion`.

**The six entries currently in the file are prototype copy with invented names.** Publishing a
testimonial nobody gave is a deceptive practice under the FTC's endorsement rules, and there is
no SEO upside either since Google discounts self-hosted review markup - which is why this site
emits no `AggregateRating`. Replace them with real quotes, with permission, before launch.

## Blog content strategy

Posts target **owner intent**, not tenant intent. Tenant queries ("apartments for rent",
"tenant portal") inflate traffic reports and produce no owner leads, so they are deliberately
not targeted.

Ten long-form posts map to the questions that precede hiring, and cross-link into each other so
a reader arriving on any one has somewhere to go next:

| Post | Primary query | Stage |
|---|---|---|
| How much do property managers charge | "how much do property managers charge" | Research |
| Is a property manager worth it | "should I hire a property manager" | Decision |
| 14 questions to ask before hiring | "questions to ask a property manager" | Comparison |
| How much should I charge for rent | "how much should I rent my house for" | Operating |
| What should I budget for maintenance | "rental maintenance budget" | Operating |
| How to reduce tenant turnover | "reduce tenant turnover" | Operating |
| How to screen tenants | "how to screen tenants" / fair housing | Operating |
| Move-in and move-out inspections | "move in inspection checklist" | Operating |
| Connecticut security deposit rules | "connecticut security deposit law" | Local / legal |
| How to evict a tenant in Connecticut | "how to evict a tenant in connecticut" | Local / legal |
| Tenant stopped paying rent | "tenant not paying rent what to do" | Local / legal |

The Connecticut legal posts are the ones most likely to earn citations and links, because precise
statutory facts are what AI systems and other sites quote. They are also the ones that go stale -
the deposit interest rate changes annually and statutes are amended, so re-verify before each
year turns.

Each is 1,300-1,500 words and built for AI citation as well as ranking, because the structures
that get quoted are cheap to add:

- **Answer capsule first.** The opening paragraph answers the title question with a specific
  number in bold, before any preamble. Engines extract the first sentences of a section to
  decide whether it answers a query.
- **Question-shaped H2s.** Each section heading is the query it answers, with a direct answer
  in the first two sentences.
- **Hard numbers with sources.** Specific figures rather than ranges-of-ranges, and legal facts
  linked to the primary source (portal.ct.gov, C.G.S. 47a-21) rather than to a competitor blog.
- **Tables.** Extractable structure that AI systems parse cleanly. Markdown tables are styled in
  `additions.css` (`.prose table`) with a navy header row, zebra striping and a bold label
  column; below 560px they scroll sideways rather than squeezing. Astro 7's default Markdown
  processor does not run rehype plugins without `@astrojs/markdown-remark`, so this is done in
  CSS rather than by wrapping the table in a container.
- **FAQPage schema.** Add `faqs` to the frontmatter and the post renders an accordion and emits
  FAQPage JSON-LD. Q&A pairs mapped to schema are the highest-impact single change for citation
  rates, because they match the shape of the queries being asked.

Do not add legal specifics without a primary source, and keep the dated disclaimer at the foot of
any post that states law - rates and statutes change annually.

## Header menus

The header carries three dropdowns - Contact (a mega-panel), Login, and Get started -
replacing two nav items and the old "Get a Quote" button.

**The nav went from seven items to five, and that was forced, not stylistic.** The row is
capped at ~1172px of content; seven links already spent ~1170px of it, and a Login control
plus a Get started button need roughly 230px more. Register and Vendors are now the first two
entries of the Get started menu, which is where a visitor looks for them anyway and how
lessen.com splits the same two audiences. Keeping them in both places would have duplicated
the link and broken the row. Both pages are still in the footer and on `/sitemap/`.

| Control | Contents |
|---|---|
| Contact (mega) | Contact us panel (phone, email, service area, hours), New clients, Existing clients |
| Get started | Become a client -> `/client-registration/`, Become a vendor -> `/vendor-network/`, Request a quote -> `/contact/` |
| Login | Client login, Vendor login - both to `/portal/` until auth exists |

Behaviour lives in `src/scripts/nav.ts`. The burger stays CSS-only, so it still works with
JavaScript disabled; only the panels are scripted, and with JS off every panel stays `hidden`
and no route is stranded. Click toggles, Escape closes and returns focus to the control,
clicking outside closes, and tabbing out of a group closes it. Hover opens on a fine pointer
only - **and the first click after a hover-open is deliberately absorbed**, because otherwise
the mouse arriving on the control opens the panel and the click that follows immediately
closes it, so the menu never appears to open at all.

`/portal/` is a holding page, not a login form. `/api/me`, `/api/jobs` and `/api/cashback/*`
are 501 stubs, so a Login control that led to a 404 or to a sign-in box that cannot sign
anyone in would be worse than no Login control. The page says plainly what is not running and
how to reach a person. Replace it in the same commit that ships auth.

**Press, newsletter and social are absent on purpose.** `SITE.press` is empty (there is no
press inbox - inventing `pr@` gives a journalist a bouncing address), `SITE.newsletter` is
`false` (no list, no ESP, no signup endpoint, and no D1 in production), and `SITE.social` is
empty. Each is wired data-first: fill the field and the block appears with no markup change,
the same rule `areaServed` and `TESTIMONIALS` already follow.

### Header trim: no utility bar, no phone in the row

The navy utility bar and the "Call the crew" block are both gone, and the Get started button
was cut from 58px to 46px tall - 62% of a 94px bar, against 48px nav links and a 43px Login
control, which is what made it read as oversized. The row now holds the logo, five nav items,
Login and Get started, and `.header-cta` dropped from 413px to 278px.

Two consequences of removing the bar, neither of them cosmetic:

1. **It carried "24/7 Emergency Response" and "Licensed &amp; Insured" on every page.** Both are
   on the unverified-claims inventory below, so deleting the bar cleared two of them from every
   page in one move. They still appear elsewhere, so this is a reduction, not a fix.
2. **`.util-hide` now names a bar that does not exist.** The class still does its job on the two
   header controls; it is declared in global.css, which is frozen, so it keeps the name.

Removing the phone from the row is the change to watch. On desktop the Contact panel covers it
in one hover. On a phone both header controls are already hidden below 720px, so the row would
have been logo plus burger and nothing else - three interactions to call an emergency line on a
site whose entire pitch is that someone picks up. `.nav-extra` therefore leads with a
tap-to-call row, in red rather than nav-item navy, so the burger opens straight onto the number.
If a one-tap call from the header is wanted back, a compact icon button in `.header-cta` is the
place for it; the row has ~135px of slack now.

### Five bugs the measurement sweep caught

Every one of these looked fine in the code and only showed up under Playwright.

1. **Header wrapped to 140px at 390px.** Get started does not fit a phone row next to the
   logo, the phone number and the burger. The old "Get a Quote" button carried `util-hide`
   for the same reason; the same rule now applies, and `.nav-extra` puts the same
   destinations inside the burger as flat links below 720px.
2. **`.util-hide` stopped working.** `.drop{display:flex}` is a single-class selector in a
   sheet that loads after global.css, so it beat `.util-hide{display:none}`. `.drop.util-hide`
   outranks it; global.css is untouched.
3. **The mega-panel anchored to the viewport.** `.header .wrap` is only `position:relative`
   inside the 1179px block, so above that the panel sat flush to the window edge instead of
   lining up with the 1220px content column.
4. **66px of horizontal overflow with the panel open.** Grid items default to
   `min-width:auto`, so `.mega-cols` resolved to 747px inside a 550px track. Same root cause
   as the `.contact-grid` overflow documented below.
5. **The Contact panel inherited `.nav a`, and Get started was invisible.** The mega lives
   inside `<nav class="nav">`, so every link in it picked up the display font, uppercase,
   11px padding and `white-space:nowrap` - descriptions printed over each other and the email
   address refused to wrap. Separately, a blanket `background:none` on `.drop-btn` stripped
   `.btn--red` of its fill, leaving white text on a white header: the Get started button was
   present, 160px wide, and completely invisible. `.drop-btn:not(.btn)` fixes the second.

Verified after the fixes at 1600 / 1440 / 1366 / 1280 / 1220 / 1180 / 1179 / 1150 / 1024 /
900 / 768 / 560 / 390 / 320: header holds 94px (82px below 900px), the Get started button holds
46px down to 768px and is hidden below 720px, the burger flips at 1180px, the mega panel's right
edge matches the content wrap, and horizontal overflow is 0 at every width with every panel both
closed and open.

## Registration pages

Two dedicated capture pages, both reusing the approved `.form-card` / `.field` /
`.steps` components rather than introducing new UI.

`/vendor-network/` - trade partners applying to work for us. It posts to
**`/api/vendors`** and writes to the **`vendors`** table, not `leads`. That separation is
the whole point: a vendor is a supplier, not a customer, and putting them in `leads` would
inflate every lead count, break `SELECT source, COUNT(*) FROM leads GROUP BY source`, and
send a notification email that calls a plumber a sales enquiry. Required fields are name,
phone, email, business address and primary specialty, plus a licence-and-insurance answer -
one tap, and it is the only question that decides whether the application is worth a call
back. Everything declared on the form is self-declared; certificates are collected at
onboarding, and the notification email says so.

`/client-registration/` - property owners opening an ongoing account. This one *is* a lead,
so it posts to `/api/leads` with `source = "client-registration"` and
`urgency = "Ongoing contract enquiry"`. No new table, and popup performance and registration
performance stay comparable in the same query. It is deliberately positioned against
`/contact/`: contact is a price on one job, registration is a property on file. Without that
split the two pages compete for the same visitor and neither wins.

Neither is in `NAV` any more. They were, as **Register** and **Vendors**; they are now the
first two entries of the **Get started** menu - see "Header menus" above for why the row could
not hold seven links plus a Login control plus a Get started button. **Home was dropped** and
stays dropped: the logo is already an `<a href="/">` two inches to the left, so a Home item
spent about 65px of a hard-capped row duplicating its own neighbour.

The cap is the whole constraint. `.wrap` is `max-width:1220px` with a 24px gutter, so the
header row can never exceed about 1172px of content however wide the monitor is - a wider
screen buys nothing. Seven items at the original 14px padding need roughly 1170px, and the
browser resolves that overrun silently rather than visibly: at 1440 the phone number wrapped
onto two lines and `.header-cta` shrank from 290px to 234px. Two changes in `additions.css`
buy the ~70px back:

| | Before | After |
|---|---|---|
| Nav gap / link padding | 6px / 14px | 2px / 11px |
| Wrapping inside a link | allowed | `white-space:nowrap` |
| Burger takes over at | 940px | 1180px |

`nowrap` is the important half: it converts a future overrun from a quiet reflow into an
obvious break, which is how this one hid at every width including 1600.

A measured sweep fixed the breakpoint. With the reclaims in place the row is clean at 1180px
and above; at 1150px the phone number starts wrapping again. So the burger now takes over
below 1180px rather than 940px - iPad landscape and small laptops get the menu button. Below
940px nothing changed.

Verified at 1600 / 1440 / 1366 / 1280 / 1220 / 1180 / 1179 / 1150 / 1024 / 900 / 768 / 390:
header holds at 94px (82px under 900px), `.header-cta` holds at 290px, the phone number stays
on one line, every nav link stays on one line, the burger flips exactly at 1180px, the open
menu lists all seven items, and `.is-active` resolves on both new pages and on
`/why-tristate/`. The 6px horizontal overflow at 390px is the `.skip-link` and predates this.

Home is still reachable everywhere: the logo on every screen, the breadcrumb at the top of
every inner page, and `/sitemap/`.

`src/scripts/lead-form.ts` now reads the endpoint from the form's `action` attribute
(`getAttribute`, not `.action`, which the DOM resolves to an absolute URL) and an optional
`data-success` message, so the vendor form reuses the whole submit path - UTM capture,
honeypot, Turnstile, disabled button, status line - while posting somewhere else. It also
joins repeated field names with a comma instead of overwriting them; the old behaviour kept
only the last checkbox in a group.

## Quote popup

`src/components/QuotePopup.astro`. Offer: a free building walk-through with a written
maintenance plan — not a newsletter. Facility buyers do not subscribe to vendors, they ask what
it costs and how fast you can get there.

| | Desktop | Mobile (<=720px) |
|---|---|---|
| Trigger | 15s timer, plus exit-intent as a second chance | 15s timer shows a slim bottom bar |
| Format | centre modal (880px) | bar ~69px = **8.2% of a 390x844 viewport**; tapping it opens the modal |
| Interstitial risk | none (desktop is not covered by the guideline) | none — the modal is click-triggered, and the bar is far under the ~30% ceiling |

15 seconds sits inside the 6-15s band where timed popups peak in every published dataset;
past ~16s conversion drops off sharply.

Rules: once per session; dismissing hides it for 30 days; converting hides it permanently;
never rendered on `/contact/` (that page is already the form). Pass `showPopup={false}` to
`BaseLayout` to suppress it anywhere else. Everything is `position: fixed`, so CLS stays at 0.
Keyboard: Esc closes, focus is trapped, focus returns to where it was.

Leads land in the same `leads` table with `source = "popup-walkthrough"` and
`service = "Free building walk-through"`, so popup performance is measurable with one query:

```sql
SELECT source, COUNT(*) FROM leads GROUP BY source;
```

**Lead submissions are sent as JSON, not FormData.** Astro's CSRF protection
(`security.checkOrigin`) rejects cross-site *form-encoded* POSTs, which would 403 the future
mobile app on this same endpoint. JSON is exempt, so one contract serves the website and the app.

## Anti-spam behaviour

Three layers, in order:

1. **Honeypot** — a hidden `company_website` field. Filled in, the request returns `200` and
   writes nothing. Bots get no signal that they were caught.
2. **Turnstile** — a token that is present but *invalid* is a hard `403`.
3. **Missing token** — accepted, but stored with `status = 'needs_review'` and the notification
   email is prefixed `[unverified]`.

Layer 3 matters: `challenges.cloudflare.com` is blocked by some privacy extensions and corporate
networks. Rejecting those visitors would silently lose real enquiries with no trace. Quarantining
is the safer trade — spam gets flagged rather than reaching the pipeline as a normal lead, and
nothing legitimate disappears. Review with:

```sql
SELECT * FROM leads WHERE status = 'needs_review' ORDER BY created_at DESC;
```

## Chat widget

No longer a mock. It is a three-step lead capture — message, name, phone or email — that POSTs to
`/api/leads` with `source = 'chat-widget'`. The status line says "Messages go straight to
dispatch" rather than "Online now", because nobody is sitting in a live chat queue.

Because it only asks for one contact method, `validateLead` requires a name plus **either** a
valid email **or** a valid phone, not all three. The page forms still mark all three required in
HTML; a lead you can actually call is worth more than one rejected for tidiness.

## What is deliberately NOT here

- No `AggregateRating` markup. Self-serving review schema on your own domain is discounted or
  penalised by Google; reviews belong on the Google Business Profile.
- No `llms.txt`.
- No city × service pages yet. That is the highest-SEO-risk part of the plan (scaled content
  abuse) and needs genuinely unique local content per page before a single one ships.
