-- Admin panel additions. The app applies these itself on first use
-- (src/lib/admin.ts ensureAdminSchema: CREATE IF NOT EXISTS, and ADD COLUMN
-- only when PRAGMA table_info shows the column missing), so running this by
-- hand is optional. Kept as the record of the shape and for fresh installs.

-- Per-lead activity log: calls, notes, status changes, with who and when.
CREATE TABLE IF NOT EXISTS lead_notes (
  id          TEXT PRIMARY KEY,
  lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id   TEXT,
  author_name TEXT,
  kind        TEXT NOT NULL DEFAULT 'note', -- note|call|status|system
  body        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);

-- Vendor verification by staff (licence/insurance/ID checked).
ALTER TABLE accounts ADD COLUMN verified_at INTEGER;
ALTER TABLE accounts ADD COLUMN verified_by TEXT;

-- Vendor application review.
ALTER TABLE vendors ADD COLUMN admin_notes TEXT;
ALTER TABLE vendors ADD COLUMN reviewed_at INTEGER;

-- Lead statuses now also include 'spam' (TEXT column, no DDL needed).
