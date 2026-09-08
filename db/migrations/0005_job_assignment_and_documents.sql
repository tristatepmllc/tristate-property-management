-- Job assignment (admin -> vendor), vendor accept/decline, and job-linked
-- file uploads (COI, photos). All additive/nullable-or-defaulted - existing
-- job rows (currently all unassigned, nothing writes to `jobs` yet outside
-- this feature) are unaffected. See db/schema.sql for the fresh-install
-- version of both tables.
--
-- vendor_id is a soft link, same posture as jobs.lead_id: ON DELETE SET
-- NULL, not CASCADE - deleting a vendor account should orphan the
-- assignment, not delete job history the client still needs to see.
ALTER TABLE jobs ADD COLUMN vendor_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;

-- Vendor's response to being assigned - deliberately a separate field from
-- `status` (the job's own operational lifecycle: scheduled/in_progress/
-- completed/cancelled). A vendor declining an assignment must not read as
-- the job itself being cancelled, and status must not silently imply
-- acceptance. 'unassigned' is the default/no-vendor state; assigning a
-- vendor moves this to 'pending' and it stays that way until the vendor
-- accepts or declines (see POST /api/portal/jobs/[id]/respond).
ALTER TABLE jobs ADD COLUMN vendor_response TEXT NOT NULL DEFAULT 'unassigned'; -- unassigned|pending|accepted|declined
ALTER TABLE jobs ADD COLUMN vendor_responded_at INTEGER;
ALTER TABLE jobs ADD COLUMN decline_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_vendor ON jobs(vendor_id, created_at DESC);

-- ---------------------------------------------------------- job_documents
-- First real use of the R2 `MEDIA` binding (see wrangler.jsonc / ops-context
-- - wired since the R2 rename, zero code paths used it until now). COI,
-- job photos, or anything else a client/vendor attaches to a specific job.
-- Not a general document library - always scoped to one job_id.
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
