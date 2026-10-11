-- Client -> vendor rating, one per job. The app also creates this table on
-- first use (src/lib/reviews.ts), so running this by hand is optional - it
-- is here for fresh installs and as the record of the shape.
CREATE TABLE IF NOT EXISTS job_reviews (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- client who rated
  vendor_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- vendor on the job at rating time
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_reviews_vendor ON job_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_job_reviews_account ON job_reviews(account_id);
