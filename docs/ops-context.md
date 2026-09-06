# Ops context (non-secret)

These are identifiers, not credentials - none of this works without an API
token, which is never stored here or anywhere in git. See "Getting a token"
below when a new session needs one.

## Cloudflare

- Account ID: `991dc5fb6c2f3245125957f839e4631f`
- Pages project name: `tristate-property-management`
- Pages project ID: `0e825af8-d4f8-41d5-9439-9393668487fa`
- Pages URL (always live): `https://tristate-property-management.pages.dev`
- Custom domain (intended, not yet serving - see README "Blockers before
  going live"): `tristatepropertymanagement.com`

## D1

- Binding: `DB`
- Database name: `tristate-db`
- Database ID: `693e64bc-7f00-4254-92b9-53e614c10a45`

## R2

- Binding: `MEDIA`
- Bucket name: `tristate-media-new`
  (renamed from `tristate-media` on 2026-09-06 - old bucket deleted, it was
  in a different zone; if you find code or docs still saying
  `tristate-media` without `-new`, that reference is stale.)
- Not consumed by any code path yet - binding exists, no upload feature
  built. Wire up when that feature is built; no config change needed then.

## GitHub

- Repo: `github.com/tristatepmllc/tristate-property-management` (branch:
  `main`)

## Getting a token for a new session

Cloudflare dashboard -> My Profile -> API Tokens -> Create Token.
Needs, at minimum: `Account.Cloudflare Pages:Edit`, `Account.D1:Edit`,
`Account.Workers R2 Storage:Edit`. Revoke it when the session ends -
regenerating one costs 30 seconds and costs nothing if it leaks; a token
sitting in git history costs a lot more if it leaks.

## Known gaps (as of 2026-09-06)

- `RESEND_API_KEY` not set on Pages - lead-notify emails and
  forgot-password emails both silently no-op (code logs a warning,
  returns success to the caller regardless - see `src/lib/auth.ts` and
  `src/pages/api/leads.ts`). Deliberately deferred until the sending
  domain is verified in Resend (see README).
- `TURNSTILE_SECRET_KEY` / `PUBLIC_TURNSTILE_SITE_KEY` not set - the
  public lead/contact form has no anti-spam check live.
- Admin panel: in progress. First admin account bootstrapped by hand via
  `wrangler d1 execute --remote` (there is no self-serve path to `admin`
  by design - see `role` handling in `src/lib/auth.ts`).
