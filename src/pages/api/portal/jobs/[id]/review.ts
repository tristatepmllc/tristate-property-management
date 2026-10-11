import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../../../lib/auth';
import { json, methodNotAllowed } from '../../../../../lib/http';
import { ensureReviewsTable } from '../../../../../lib/reviews';

export const prerender = false;

type JobRow = { id: string; account_id: string; vendor_id: string | null; status: string };

/**
 * POST /api/portal/jobs/[id]/review - the job's own client only.
 * Body: { rating: 1-5, comment?: string }.
 *
 * Only a completed job with a vendor on it can be rated. One review per
 * job; posting again updates it (a client changing their mind is normal,
 * a second row would double-count). vendor_id is taken from the job row,
 * never from the request body.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return json({ error: 'validation_failed', fields: ['rating'] }, 422);
  }
  const comment =
    typeof body.comment === 'string' && body.comment.trim() ? body.comment.trim().slice(0, 1000) : null;

  const job = await env.DB.prepare(`SELECT id, account_id, vendor_id, status FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  // Same answer for "no such job" and "not your job" - no probing job ids.
  if (!job || job.account_id !== session.user.id) return json({ error: 'not_found' }, 404);
  if (job.status !== 'completed') return json({ error: 'not_completed' }, 409);
  if (!job.vendor_id) return json({ error: 'no_vendor' }, 409);

  try {
    await ensureReviewsTable(env.DB);
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO job_reviews (id, job_id, account_id, vendor_id, rating, comment, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT(job_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment,
         updated_at = excluded.updated_at`
    )
      .bind(crypto.randomUUID(), job.id, session.user.id, job.vendor_id, rating, comment, now)
      .run();
  } catch (e) {
    console.error('job_review_save_failed', jobId, String(e).slice(0, 300));
    return json({ error: 'storage_failed' }, 500);
  }

  return json({ ok: true, jobId, rating, comment });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
