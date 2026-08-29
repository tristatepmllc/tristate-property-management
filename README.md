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

Then check `https://<your-domain>/api/health` — it returns `{"ok":true,"db":"ok"}` when the D1
binding is live.

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
| GET | `/api/offers` | public promos, 5-minute cache |
| GET | `/api/health` | deploy smoke test |
| GET | `/api/me`, `/api/jobs`, `/api/cashback/*` | 501 stubs for the portal/app phase |

The same endpoints serve the website and the future React Native app — the app will send a Bearer
token where the web sends a session cookie.

## Blockers before going live

- [ ] **Location copy still says Jacksonville, FL.** The phone and state are now real
      (Connecticut), but 54 references across 11 files still describe a Northeast Florida
      business — page titles, meta descriptions, hero copy, the chat widget's coverage answer,
      the footer, and one blog post. This is a content rewrite, not a config edit, and it needs
      the actual towns served before it can be done. **Do not let Google index the site until
      this is resolved** — a Connecticut business ranking on Jacksonville pages is worse than
      not ranking at all.
- [ ] **Old NAP items still placeholder: `(904) 555-0142`, `service@tristatepropertymanagement.com`,
      `4131 Sunbeam Road`, licence `FL CGC-0000000`, and the lat/lng. All of it lives in
      `src/data/site.ts` — one file, one edit. It also feeds the JSON-LD, so wrong data here
      means schema that conflicts with the Google Business Profile. Still empty: `address.city`,
      `address.postal`, `geo`, `license`, `areaServed`.
- [ ] **Attach the custom domain.** `tristatepropertymanagement.com` currently returns 503, so
      `SITE.url` and `astro.config.mjs` point at the `.pages.dev` host instead. That is deliberate:
      `og:image`, `og:url` and the canonicals are absolute URLs built from that value, and while
      they pointed at the dead domain WhatsApp and Facebook fetched a 503 and showed no preview at
      all. Once the domain is attached in Cloudflare Pages, change both values back in the same
      commit - a canonical pointing at a host that does not serve the page is worse than none.
      `public/robots.txt` carries the sitemap URL too.
- [ ] **Google Business Profile** created and matching the NAP exactly.
- [ ] **Decide on the chat widget.** `src/components/ChatWidget.astro` is the prototype's
      canned-reply mock — it answers with hardcoded strings. Either wire it to a real inbox or
      remove it; shipping a fake "Online now" chat is a trust problem, not a technical one.
- [ ] **`52 services` and `$2M Insured`** claims — confirm they are accurate.

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

Source artwork already ships with a real alpha channel, so it is used as-is — no cutout step.
Verified: of ~71,000 semi-transparent edge pixels only 2 are near-white, so there is no halo on
the navy footer.

| File | Use |
|---|---|
| `/images/logo-tristate.{avif,webp,png}` | header — dark ink, for the white background |
| `/images/logo-tristate-light.{avif,webp,png}` | footer — supplied as a separate white-ink artwork, used as-is (no algorithmic recolouring) |
| `/favicon.ico`, `/favicon-32.png`, `/icon-192.png`, `/icon-512.png` | favicons, from the circular T-and-roof mark |
| `/icon-maskable-512.png` | Android maskable - mark at 72% on white, inside the circle safe zone |
| `/apple-touch-icon.png` | 180x180 opaque white plate (iOS flattens transparency to black) |

The favicon uses the circular mark, not the horizontal lockup. Aspect ratio decides how large a
mark can render inside a square icon: the lockup is 3.5:1 and shrank to a thin band, the disc is
0.99:1 and fills the tile completely. It is also self-contained - it carries its own white disc
and red ring, so it reads on light, dark and grey tab bars with no background plate behind it.

Regenerate from the source disc if the artwork changes. `apple-touch-icon.png` and the maskable
icon need opaque backgrounds; the rest keep their transparency.

Served through `<picture>`: header AVIF 18 KB / WebP 31 KB / PNG 33 KB, footer AVIF 28 KB /
WebP 38 KB / PNG 49 KB. The header copy
carries `fetchpriority="high"`; the footer copy is lazy. `icon-512.png` is also the
`Organization.logo` in the JSON-LD.

The header grew from a 78px to a 94px minimum so the lockup's "PROFESSIONAL · RELIABLE ·
COMMITTED" line stays legible at 68px tall; nav and CTA keep their approved positions, and the
header steps down to 82px below 900px wide and shrinks further on phones.

To regenerate after an artwork change, re-run the cutout against the new source and re-emit at
460px wide — roughly 2.5x the largest rendered size (68px tall), so anything bigger is wasted
bytes. The two files have slightly different aspect ratios (header 2.63, footer 2.67), so their
`width`/`height` attributes differ — update them whenever the artwork changes, or CLS returns.

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

## Testimonials

`src/data/testimonials.ts` - add an entry and the carousel picks it up, no markup changes.

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

The four owner-decision posts map to the questions that actually precede hiring:

| Post | Primary query |
|---|---|
| How much do property managers charge | "how much do property managers charge" |
| Is a property manager worth it | "should I hire a property manager" |
| Connecticut security deposit rules | "connecticut security deposit law" |
| How to screen tenants | "how to screen tenants" / fair housing |

Each is 1,300-1,500 words and built for AI citation as well as ranking, because the structures
that get quoted are cheap to add:

- **Answer capsule first.** The opening paragraph answers the title question with a specific
  number in bold, before any preamble. Engines extract the first sentences of a section to
  decide whether it answers a query.
- **Question-shaped H2s.** Each section heading is the query it answers, with a direct answer
  in the first two sentences.
- **Hard numbers with sources.** Specific figures rather than ranges-of-ranges, and legal facts
  linked to the primary source (portal.ct.gov, C.G.S. 47a-21) rather than to a competitor blog.
- **Tables.** Extractable structure that AI systems parse cleanly.
- **FAQPage schema.** Add `faqs` to the frontmatter and the post renders an accordion and emits
  FAQPage JSON-LD. Q&A pairs mapped to schema are the highest-impact single change for citation
  rates, because they match the shape of the queries being asked.

Do not add legal specifics without a primary source, and keep the dated disclaimer at the foot of
any post that states law - rates and statutes change annually.

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
