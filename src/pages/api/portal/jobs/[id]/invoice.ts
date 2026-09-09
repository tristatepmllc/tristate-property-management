import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../../../lib/auth';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

type JobRow = { id: string; vendor_id: string | null; status: string; invoice_status: string };

const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000 - a guardrail, not a real business limit

/**
 * POST /api/portal/jobs/[id]/invoice - vendor-only.
 * Body: { amountCents: number, notes?: string }.
 *
 * Gated on job.status === 'completed' (invoicing unfinished work is not a
 * real workflow) and invoice_status in ('none', 'rejected') - a submitted,
 * approved or paid invoice cannot be resubmitted over; rejected is the one
 * status that loops back here; see /api/admin/jobs/[id]/invoice for the
 * approve/reject/mark_paid side of this same lifecycle.
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

  const amountCents = body.amountCents;
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return json({ error: 'invalid_amount' }, 422);
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;

  const job = await env.DB.prepare(`SELECT id, vendor_id, status, invoice_status FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  if (!job || job.vendor_id !== user.id) return json({ error: 'not_found' }, 404);
  if (job.status !== 'completed') return json({ error: 'job_not_completed' }, 409);
  if (job.invoice_status !== 'none' && job.invoice_status !== 'rejected') {
    return json({ error: 'already_submitted' }, 409);
  }

  const now = Date.now();
  await env.DB.prepare(
    `UPDATE jobs
     SET invoice_status = 'submitted', invoice_amount_cents = ?1, invoice_notes = ?2,
         invoice_submitted_at = ?3, invoice_rejected_reason = NULL
     WHERE id = ?4`
  )
    .bind(amountCents, notes, now, jobId)
    .run();

  // KNOWN GAP: nothing notifies admin that an invoice is waiting for review,
  // same posture as the decline-notify gap in respond.ts - admin has to
  // check the job detail page. Flagged rather than silently left out.

  return json({ ok: true, jobId, invoiceStatus: 'submitted' });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
