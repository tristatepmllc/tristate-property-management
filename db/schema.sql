-- Tristate Property Management LLC - Cloudflare D1 (SQLite)
-- apply:  npx wrangler d1 execute tristate-db --local  --file=./db/schema.sql
--         npx wrangler d1 execute tristate-db --remote --file=./db/schema.sql
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- accounts
-- Doubles as Better Auth's `user` table (see src/lib/auth.ts, `user.modelName`).
-- It was an unused placeholder before auth shipped - nothing wrote to it - so
-- it is extended in place rather than creating a parallel `users` table that
-- would need syncing with this one forever.
-- `role` is NEVER settable to 'admin' through the public sign-up form - see
-- the `databaseHooks.user.create.before` guard in src/lib/auth.ts. Promote to
-- admin with a direct UPDATE once staff tooling exists to do it from a UI.
CREATE TABLE IF NOT EXISTS accounts (
  id             TEXT PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  name           TEXT,
  company        TEXT,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'client',   -- client|vendor|admin
  email_verified INTEGER NOT NULL DEFAULT 0,
  image          TEXT,

  -- Client profile fields. Meaningless for role='vendor', but not enforced
  -- at the DB level (D1/SQLite has no partial-column-per-role constraint
  -- worth building for a two-role system) - enforced instead in
  -- src/pages/api/me.ts, which only writes the fields matching the
  -- account's own role no matter what a PATCH body contains.
  address        TEXT,              -- property street address
  city           TEXT,
  state          TEXT,
  zip            TEXT,
  property_type  TEXT,              -- single_family|multifamily|commercial|mixed_use|other
  preferred_contact TEXT,           -- email|phone|text
  notes          TEXT,              -- client preferences / access instructions

  -- Vendor profile fields. See the same enforcement note above.
  trade          TEXT,              -- primary specialty - matches /services/* categories
  trades_other   TEXT,              -- secondary specialties, free text
  service_area   TEXT,              -- towns / zip codes covered
  license_number TEXT,
  license_expires INTEGER,          -- unix ms; nullable, not all trades require one
  insurance_on_file INTEGER NOT NULL DEFAULT 0,  -- 0/1 - status only, no document yet
  years_in_business TEXT,
  emergency_available INTEGER NOT NULL DEFAULT 0, -- 0/1

  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

-- ---------------------------------------------------------- auth_credentials
-- Better Auth's `account` model (password hash for email/password, or a future
-- OAuth provider's tokens) - named `auth_credentials` rather than `account` or
-- `accounts` because this codebase already has a business-meaning `accounts`
-- table (property owners and vendors) and a second table spelled almost the
-- same would be the kind of mistake nobody catches until the wrong join runs.
CREATE TABLE IF NOT EXISTS auth_credentials (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_id              TEXT NOT NULL,   -- 'credential' for email/password
  provider_account_id      TEXT NOT NULL,
  password                 TEXT,            -- scrypt hash, null for OAuth-only rows
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  INTEGER,
  refresh_token_expires_at INTEGER,
  scope                    TEXT,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_credentials_account ON auth_credentials(account_id);

-- ---------------------------------------------------------------------- session
-- httpOnly cookie on web. The stub comments in api/me.ts etc predate this file
-- but named the plan correctly - Bearer token support for the future mobile
-- app is the `bearer()` plugin in src/lib/auth.ts, no schema change needed for it.
CREATE TABLE IF NOT EXISTS session (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  INTEGER NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_account ON session(account_id);
CREATE INDEX IF NOT EXISTS idx_session_token   ON session(token);

-- ------------------------------------------------------------------ verification
-- One-time tokens: password reset today, email verification later if
-- `requireEmailVerification` is ever turned on (see src/lib/auth.ts for why
-- it is off for now).
CREATE TABLE IF NOT EXISTS verification (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

-- ---------------------------------------------------------------- leads
-- account_id is nullable on purpose: guests submit first, register later,
-- and POST /api/leads/claim merges their history in by email/phone.
CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  account_id    TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  company       TEXT,
  address       TEXT,
  service       TEXT,
  urgency       TEXT,
  building      TEXT,
  describes_you TEXT,              -- "Commercial property manager/owner" | "Residential property manager/owner"
  message       TEXT,
  source        TEXT,               -- which form / page
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  referrer      TEXT,
  status        TEXT NOT NULL DEFAULT 'new',  -- new|contacted|quoted|won|lost
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone      ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);

-- ---------------------------------------------------------------- jobs
-- account_id is the client the job belongs to; vendor_id (added in
-- migration 0005) is who it's assigned to - separate people, separate
-- columns, both nullable-by-role in the sense that a fresh job has no
-- vendor yet, not that either column means something different per row.
CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id       TEXT REFERENCES leads(id) ON DELETE SET NULL,
  vendor_id     TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  service       TEXT,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|in_progress|completed|cancelled
  -- Vendor's response to the assignment - see migration 0005 for why this
  -- is not folded into `status`.
  vendor_response      TEXT NOT NULL DEFAULT 'unassigned', -- unassigned|pending|accepted|declined
  vendor_responded_at  INTEGER,
  decline_reason       TEXT,
  scheduled_at  INTEGER,
  completed_at  INTEGER,
  amount_cents  INTEGER,
  -- Invoice submission/review - one invoice per job, not a line-item
  -- `invoices` table (see migration 0006). vendor submits against a
  -- completed job; admin approves/rejects/marks paid.
  invoice_status          TEXT NOT NULL DEFAULT 'none', -- none|submitted|approved|paid|rejected
  invoice_amount_cents    INTEGER,
  invoice_notes           TEXT,
  invoice_submitted_at    INTEGER,
  invoice_reviewed_at     INTEGER,
  invoice_paid_at         INTEGER,
  invoice_rejected_reason TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_account ON jobs(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_vendor  ON jobs(vendor_id, created_at DESC);

-- ------------------------------------------------------------ job_documents
-- COI, job photos, or anything else attached to one specific job. First
-- real use of the R2 `MEDIA` binding - see wrangler.jsonc.
CREATE TABLE IF NOT EXISTS job_documents (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- uploader
  kind          TEXT NOT NULL DEFAULT 'other', -- coi|photo|other
  filename      TEXT NOT NULL,
  content_type  TEXT,
  size_bytes    INTEGER,
  r2_key        TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_documents_job ON job_documents(job_id, created_at DESC);

-- ---------------------------------------------------------------- cashback
-- Append-only ledger. Balance = SUM(amount_cents). Never mutate a balance field.
CREATE TABLE IF NOT EXISTS cashback_ledger (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  job_id        TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  amount_cents  INTEGER NOT NULL,   -- positive = earn, negative = redeem
  reason        TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON cashback_ledger(account_id, created_at DESC);

-- ---------------------------------------------------------------- offers
CREATE TABLE IF NOT EXISTS offers (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  code       TEXT,
  is_public  INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  starts_at  INTEGER,
  ends_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(active, is_public);

-- ---------------------------------------------------------------- vendors
-- Trade partners applying to the vendor network. Deliberately NOT the `leads`
-- table: a vendor is a supplier, not a customer. Mixing them would corrupt
-- every lead count, every `GROUP BY source` report and the notification copy.
-- No UNIQUE on email on purpose - a duplicate application should be a row to
-- de-duplicate later, not a 500 in the applicant's face.
CREATE TABLE IF NOT EXISTS vendors (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  business      TEXT,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT,
  trade         TEXT NOT NULL,     -- primary specialty
  license_number            TEXT,  -- primary trade license #, self-declared
  trades_other  TEXT,              -- additional trades, free text
  secondary_trade           TEXT,
  secondary_license_number  TEXT,
  area          TEXT,              -- towns / counties covered
  service_radius TEXT,             -- miles, self-declared
  work_types    TEXT,              -- comma-joined: commercial/residential/turns_rehab/exteriors/all
  credentials   TEXT,              -- licensed and/or insured, self-declared
  years         TEXT,
  sos_active    TEXT,              -- "Yes"/"No" - active status with Secretary of State
  uses_portal   TEXT,              -- "Yes"/"No" - will use our client/vendor portal
  referral_source TEXT,            -- how they heard about us
  notes         TEXT,
  source        TEXT,
  referrer      TEXT,
  status        TEXT NOT NULL DEFAULT 'new',  -- new|reviewing|approved|declined
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vendors_trade      ON vendors(trade);
CREATE INDEX IF NOT EXISTS idx_vendors_email      ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_status     ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at DESC);
