import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../../../lib/auth';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

// Matches db/schema.sql's comment on jobs.status. 'scheduled' is the row
// default and isn't offered as a target here - a vendor moves a job
// forward (in_progress/completed) or flags it cancelled; going back to
// 'scheduled' from any of those isn't a real workflow step and admin
// tooling for status corrections doesn't exist yet either way.
const VENDOR_SETTABLE_STATUSES = ['in_progress', 'completed', 'cancelled'] as const;

type JobRow = { id: string; vendor_id: string | null; vendor_response: string; status: string };

/**
 * POST /api/portal/jobs/[id]/status - vendor-only.
 * Body: { status: 'in_progress' | 'completed' | 'cancelled' }.
 *
 * Gated on vendor_response === 'accepted' - a vendor who hasn't accepted
 * the assignment yet has no business moving its status, and one who
 * declined it definitely doesn't. Setting status to 'completed' also stamps
 * completed_at - the same column /api/jobs.ts already reads, so a
 * completed job reflects a real timestamp, not just a label.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== 'vendor') return json({ error: 'forbidden' }, 403);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const status = body.status;
  if (typeof status !== 'string' || !(VENDOR_SETTABLE_STATUSES as readonly string[]).includes(status)) {
    return json({ error: 'invalid_status' }, 400);
  }

  const job = await env.DB.prepare(`SELECT id, vendor_id, vendor_response, status FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  if (!job || job.vendor_id !== user.id) return json({ error: 'not_found' }, 404);
  if (job.vendor_response !== 'accepted') return json({ error: 'not_accepted' }, 409);

  const now = Date.now();
  if (status === 'completed') {
    await env.DB.prepare(`UPDATE jobs SET status = ?1, completed_at = ?2 WHERE id = ?3`)
      .bind(status, now, jobId)
      .run();
  } else {
    await env.DB.prepare(`UPDATE jobs SET status = ?1 WHERE id = ?2`).bind(status, jobId).run();
  }

  return json({ ok: true, jobId, status });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
