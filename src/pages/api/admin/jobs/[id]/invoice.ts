import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

type JobRow = { id: string; invoice_status: string };

const ACTIONS = ['approve', 'reject', 'mark_paid'] as const;
type Action = (typeof ACTIONS)[number];

// Each action's legal starting state - a reject or approve only makes sense
// against a freshly submitted invoice, and only an approved one can be
// marked paid. Anything else is a stale click (e.g. two admins reviewing
// the same tab) or a bad request, not a state this endpoint should paper
// over silently.
const REQUIRED_FROM: Record<Action, string> = {
  approve: 'submitted',
  reject: 'submitted',
  mark_paid: 'approved',
};

/**
 * PATCH /api/admin/jobs/[id]/invoice - admin-only.
 * Body: { action: 'approve' | 'reject' | 'mark_paid', reason?: string }.
 * `reason` is required for `reject` (shown back to the vendor on the job
 * page so they know what to fix before resubmitting).
 *
 * No email notification here - see the KNOWN GAP note in the vendor-side
 * submit handler; this is the same gap on the other end of the same
 * lifecycle, not an oversight specific to this route.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const action = body.action;
  if (typeof action !== 'string' || !(ACTIONS as readonly string[]).includes(action)) {
    return json({ error: 'invalid_action' }, 400);
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : null;
  if (action === 'reject' && !reason) return json({ error: 'reason_required' }, 422);

  const job = await env.DB.prepare(`SELECT id, invoice_status FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  if (!job) return json({ error: 'not_found' }, 404);
  if (job.invoice_status !== REQUIRED_FROM[action as Action]) {
    return json({ error: 'invalid_invoice_state', expected: REQUIRED_FROM[action as Action], actual: job.invoice_status }, 409);
  }

  const now = Date.now();
  if (action === 'approve') {
    await env.DB.prepare(
      `UPDATE jobs SET invoice_status = 'approved', invoice_reviewed_at = ?1 WHERE id = ?2`
    ).bind(now, jobId).run();
  } else if (action === 'reject') {
    await env.DB.prepare(
      `UPDATE jobs SET invoice_status = 'rejected', invoice_reviewed_at = ?1, invoice_rejected_reason = ?2 WHERE id = ?3`
    ).bind(now, reason, jobId).run();
  } else {
    await env.DB.prepare(
      `UPDATE jobs SET invoice_status = 'paid', invoice_paid_at = ?1 WHERE id = ?2`
    ).bind(now, jobId).run();
  }

  return json({ ok: true, jobId, action });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
