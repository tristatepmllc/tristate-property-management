import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { sendEmail, escapeHtml } from '../../../../lib/email';
import { json, methodNotAllowed } from '../../../../lib/http';
import { SITE } from '../../../../data/site';
import { dollarsToCents, dateInputToMs, JOB_STATUS_VALUES } from '../../../../lib/admin';

export const prerender = false;

type JobRow = {
  id: string;
  account_id: string;
  vendor_id: string | null;
  service: string | null;
  description: string | null;
};
type AccountRow = { id: string; name: string | null; email: string; role: string };

/**
 * PATCH /api/admin/jobs/[id] - admin-only. Body (every field optional):
 *   { vendorId?: string | null, status?, amount?: "$", scheduledDate?: "YYYY-MM-DD" }
 *
 * Assigning (or reassigning) a vendor always resets vendor_response to
 * 'pending' and clears vendor_responded_at/decline_reason - a fresh
 * assignment is a fresh question to that vendor. vendorId "" / null
 * unassigns. Sending the same vendor again changes nothing (so editing a
 * price from the jobs table never re-asks an accepted vendor).
 * status 'completed' stamps completed_at once.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'jobs.edit');
  if (!admin) return json({ error: 'forbidden' }, 403);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Each field is optional; only what is present in the body changes.
  // vendorId: string assigns (resets the response to pending), "" or null
  // unassigns. Status/amount/date edits never touch the assignment.
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  const job = await env.DB.prepare(
    `SELECT id, account_id, vendor_id, service, description FROM jobs WHERE id = ?1`
  ).bind(jobId).first<JobRow>();
  if (!job) return json({ error: 'not_found' }, 404);

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, v: unknown) => {
    binds.push(v);
    sets.push(`${col} = ?${binds.length}`);
  };

  if (has('status')) {
    const st = body.status;
    if (typeof st !== 'string' || !JOB_STATUS_VALUES.includes(st)) return json({ error: 'invalid_status' }, 422);
    set('status', st);
    if (st === 'completed') sets.push('completed_at = COALESCE(completed_at, ' + Date.now() + ')');
  }
  if (has('amount')) {
    const raw = body.amount;
    const cents = dollarsToCents(raw);
    if (cents === null && typeof raw === 'string' && raw.trim() !== '') {
      return json({ error: 'validation_failed', fields: ['price'] }, 422);
    }
    set('amount_cents', cents);
  }
  if (has('scheduledDate')) set('scheduled_at', dateInputToMs(body.scheduledDate));

  let vendor: AccountRow | null = null;
  const vendorRaw = has('vendorId') ? body.vendorId : undefined;
  const vendorId = typeof vendorRaw === 'string' && vendorRaw ? vendorRaw : null;
  const vendorChanged = has('vendorId') && vendorId !== job.vendor_id;
  if (has('vendorId') && vendorRaw !== null && typeof vendorRaw !== 'string') {
    return json({ error: 'invalid_vendor_id' }, 400);
  }
  if (vendorChanged) {
    if (vendorId) {
      vendor = await env.DB.prepare(`SELECT id, name, email, role FROM accounts WHERE id = ?1`)
        .bind(vendorId)
        .first<AccountRow>();
      if (!vendor || vendor.role !== 'vendor') return json({ error: 'not_a_vendor' }, 422);
    }
    set('vendor_id', vendorId);
    set('vendor_response', vendorId ? 'pending' : 'unassigned');
    sets.push('vendor_responded_at = NULL', 'decline_reason = NULL');
  }

  if (sets.length === 0) return json({ ok: true, jobId, unchanged: true });
  binds.push(jobId);
  await env.DB.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?${binds.length}`).bind(...binds).run();

  // Best-effort notify, same posture as every other Resend call in this repo:
  // the assignment already happened and must not fail because email did not
  // send. Silently no-ops without RESEND_API_KEY (see docs/ops-context.md) -
  // that is the current production state, not a bug in this handler.
  if (vendor && env.RESEND_API_KEY && env.LEAD_NOTIFY_FROM) {
    const sent = await sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.LEAD_NOTIFY_FROM,
      to: vendor.email,
      subject: `New job assignment - ${job.service || 'Tristate job'}`,
      html: `<p style="font-family:Arial">You've been assigned a job${job.service ? `: <strong>${escapeHtml(job.service)}</strong>` : ''}.</p>
             ${job.description ? `<p style="font-family:Arial">${escapeHtml(job.description)}</p>` : ''}
             <p style="font-family:Arial">Sign in to your portal to accept or decline: <a href="${escapeHtml(SITE.url)}/portal/jobs/${jobId}">${escapeHtml(SITE.url)}/portal/jobs/${jobId}</a></p>
             <p style="color:#8798AC;font-size:12px">Job ID ${jobId}.</p>`,
    });
    if (!sent.ok) console.error('job_assign_notify_failed', { jobId, vendorId, error: sent.error });
  } else if (vendor) {
    console.warn('job_assign_notify_skipped', { jobId, vendorId, reason: 'RESEND_API_KEY or LEAD_NOTIFY_FROM not set' });
  }

  return json({ ok: true, jobId });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
