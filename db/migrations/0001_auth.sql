-- Run once against the ALREADY-DEPLOYED remote D1, which has the pre-auth
-- `accounts` shape (id, email, name, company, phone, created_at) and none of
-- the four auth tables. `db/schema.sql` already has the final shape and is
-- what a fresh install (or `npm run db:local`, which wipes and re-applies)
-- uses - this file exists only because CREATE TABLE IF NOT EXISTS cannot add
-- a column to a table that already exists.
--
--   npx wrangler d1 execute tristate-db --remote --file=./db/migrations/0001_auth.sql
--
-- Run this EXACTLY ONCE. The four ALTER TABLE lines are not idempotent -
-- SQLite has no "ADD COLUMN IF NOT EXISTS", so a second run fails with
-- "duplicate column name". The CREATE TABLE / CREATE INDEX lines below them
-- are already IF NOT EXISTS and would no-op harmlessly on a re-run, but the
-- ALTERs would error first and abort the whole file, which is why this is
-- its own one-shot migration rather than folded into schema.sql.

ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'client';
ALTER TABLE accounts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN image TEXT;
ALTER TABLE accounts ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

-- Backfill updated_at for the 0 rows this table has ever had, and for any that
-- somehow exist without it - created_at is the best available value.
UPDATE accounts SET updated_at = created_at WHERE updated_at = 0;

CREATE TABLE IF NOT EXISTS auth_credentials (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider_id              TEXT NOT NULL,
  provider_account_id      TEXT NOT NULL,
  password                 TEXT,
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

CREATE TABLE IF NOT EXISTS verification (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
