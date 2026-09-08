import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { sendEmail, escapeHtml } from '../../../../lib/email';
import { json, methodNotAllowed } from '../../../../lib/http';
import { SITE } from '../../../../data/site';

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
 * PATCH /api/admin/jobs/[id] - admin-only. Body: { vendorId: string | null }.
 *
 * Assigning (or reassigning) always resets vendor_response to 'pending' and
 * clears vendor_responded_at/decline_reason - a fresh assignment is a fresh
 * question to that vendor, even if the same job was previously declined by
 * someone else, or by this same vendor and is being re-offered. Passing
 * vendorId: null unassigns and returns the job to 'unassigned', with the
 * same clearing.
 *
 * Deliberately the only admin job action built right now - no status
 * override, no job creation. Scaffolding for the vendor-assignment piece
 * specifically; the rest of the admin job surface (lead-to-job conversion,
 * manual status edits) is unbuilt on purpose, not an oversight.
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

  const vendorId = body.vendorId;
  if (vendorId !== null && typeof vendorId !== 'string') {
    return json({ error: 'invalid_vendor_id' }, 400);
  }

  const job = await env.DB.prepare(
    `SELECT id, account_id, vendor_id, service, description FROM jobs WHERE id = ?1`
  ).bind(jobId).first<JobRow>();
  if (!job) return json({ error: 'not_found' }, 404);

  let vendor: AccountRow | null = null;
  if (vendorId) {
    vendor = await env.DB.prepare(`SELECT id, name, email, role FROM accounts WHERE id = ?1`)
      .bind(vendorId)
      .first<AccountRow>();
    if (!vendor || vendor.role !== 'vendor') return json({ error: 'not_a_vendor' }, 422);
  }

  await env.DB.prepare(
    `UPDATE jobs
     SET vendor_id = ?1, vendor_response = ?2, vendor_responded_at = NULL, decline_reason = NULL
     WHERE id = ?3`
  )
    .bind(vendorId ?? null, vendorId ? 'pending' : 'unassigned', jobId)
    .run();

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

  return json({ ok: true, jobId, vendorId: vendorId ?? null });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
