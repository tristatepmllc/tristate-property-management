-- Real invoice submission/review on top of the existing jobs row, replacing
-- the static UI-shell-only /portal/ Invoices panel (four zero columns, no
-- backing data - see VendorDashboard.astro's prior comment on that panel).
-- Additive/nullable-or-defaulted, same posture as 0005: existing job rows
-- are unaffected.
--
-- Deliberately a set of columns on `jobs`, not a new `invoices` table: one
-- invoice per completed job, matching the shape `jobs.amount_cents` already
-- assumes (a single dollar figure per job, not line items). If multi-invoice
-- or partial billing is ever needed, that is a real schema change, not a
-- default to build against speculatively now - see db/schema.sql for the
-- same reasoning inline.
ALTER TABLE jobs ADD COLUMN invoice_status TEXT NOT NULL DEFAULT 'none'; -- none|submitted|approved|paid|rejected
ALTER TABLE jobs ADD COLUMN invoice_amount_cents INTEGER;
ALTER TABLE jobs ADD COLUMN invoice_notes TEXT;
ALTER TABLE jobs ADD COLUMN invoice_submitted_at INTEGER;
ALTER TABLE jobs ADD COLUMN invoice_reviewed_at INTEGER;
ALTER TABLE jobs ADD COLUMN invoice_paid_at INTEGER;
ALTER TABLE jobs ADD COLUMN invoice_rejected_reason TEXT;
