-- Bedrock Facility Services — Cloudflare D1 (SQLite)
-- apply:  npx wrangler d1 execute bedrock-db --local  --file=./db/schema.sql
--         npx wrangler d1 execute bedrock-db --remote --file=./db/schema.sql
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- accounts
CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  company     TEXT,
  phone       TEXT,
  created_at  INTEGER NOT NULL
);

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
CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  lead_id       TEXT REFERENCES leads(id) ON DELETE SET NULL,
  service       TEXT,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at  INTEGER,
  completed_at  INTEGER,
  amount_cents  INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_account ON jobs(account_id, created_at DESC);

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
