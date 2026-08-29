# Bedrock Facility Services — website

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
|- services/index.html   contact/  industries/  why-bedrock/
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
npx wrangler d1 create bedrock-db          # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create bedrock-media
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

- [ ] **Real NAP.** Everything is placeholder: `(904) 555-0142`, `service@bedrockfacility.com`,
      `4131 Sunbeam Road`, licence `FL CGC-0000000`, and the lat/lng. All of it lives in
      `src/data/site.ts` — one file, one edit. It also feeds the JSON-LD, so wrong data here
      means schema that conflicts with the Google Business Profile.
- [ ] **Real domain** in `src/data/site.ts` and `astro.config.mjs` (canonicals + sitemap).
- [ ] **Google Business Profile** created and matching the NAP exactly.
- [ ] **Decide on the chat widget.** `src/components/ChatWidget.astro` is the prototype's
      canned-reply mock — it answers with hardcoded strings. Either wire it to a real inbox or
      remove it; shipping a fake "Online now" chat is a trust problem, not a technical one.
- [ ] **`52 services` and `$2M Insured`** claims — confirm they are accurate.

## What is deliberately NOT here

- No `AggregateRating` markup. Self-serving review schema on your own domain is discounted or
  penalised by Google; reviews belong on the Google Business Profile.
- No `llms.txt`.
- No city × service pages yet. That is the highest-SEO-risk part of the plan (scaled content
  abuse) and needs genuinely unique local content per page before a single one ships.
