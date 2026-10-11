/**
 * Client -> vendor ratings, one per job.
 *
 * The table creates itself (CREATE TABLE IF NOT EXISTS) on first read or
 * write, so the feature works on remote D1 without anyone running a
 * migration by hand. db/migrations/0007_job_reviews.sql and db/schema.sql
 * carry the same DDL for fresh installs and the record. Keep all three in
 * sync if the shape ever changes.
 *
 * One review per job (UNIQUE job_id), editable by the job's client. The
 * vendor_id is copied from the job at review time so a later reassignment
 * cannot move a rating onto a vendor who never did the work.
 */
export type ReviewRow = {
  id: string;
  job_id: string;
  account_id: string;
  vendor_id: string;
  rating: number;
  comment: string | null;
  created_at: number;
  updated_at: number;
};

const DDL = [
  `CREATE TABLE IF NOT EXISTS job_reviews (
    id          TEXT PRIMARY KEY,
    job_id      TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    vendor_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_job_reviews_vendor ON job_reviews(vendor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_job_reviews_account ON job_reviews(account_id)`,
];

let ensured = false;

export async function ensureReviewsTable(db: D1Database): Promise<void> {
  if (ensured) return;
  for (const sql of DDL) {
    await db.prepare(sql).run();
  }
  ensured = true;
}
