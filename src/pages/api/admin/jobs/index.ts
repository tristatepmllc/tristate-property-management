import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema, addLeadNote, dollarsToCents, dateInputToMs } from '../../../../lib/admin';

export const prerender = false;

type Account = { id: string; role: string; name: string | null };
type Lead = { id: string; name: string; email: string; phone: string; address: string | null; account_id: string | null; status: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/admin/jobs - admin only. Create a job.
 * Body: { leadId?, accountId?, email?, service, description?, amount?,
 *         scheduledDate?, vendorId? }
 *
 * Client resolution, in order: accountId -> the lead's linked account ->
 * an existing account with that email -> a new client account created for
 * that email (no password yet; they set one with "Forgot password" once
 * email sending is live). An email that belongs to a vendor/admin account
 * is refused rather than silently turned into a client.
 *
 * From a lead: links job.lead_id, marks the lead Won, logs it on the lead.
 */
export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const s = (k: string, max = 2000) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');

  const service = s('service', 120);
  const description = s('description', 4000);
  const amountCents = dollarsToCents(b.amount);
  const scheduledAt = dateInputToMs(b.scheduledDate);
  const vendorId = s('vendorId', 64) || null;
  const leadId = s('leadId', 64) || null;
  let accountId = s('accountId', 64) || null;
  const email = s('email', 200).toLowerCase();

  const errors: string[] = [];
  if (!service) errors.push('service');
  if (s('amount') && amountCents === null) errors.push('price');
  if (errors.length) return json({ error: 'validation_failed', fields: errors }, 422);

  await ensureAdminSchema(env.DB);

  let lead: Lead | null = null;
  if (leadId) {
    lead = await env.DB.prepare(`SELECT id, name, email, phone, address, account_id, status FROM leads WHERE id = ?1`)
      .bind(leadId).first<Lead>();
    if (!lead) return json({ error: 'not_found' }, 404);
    if (!accountId && lead.account_id) accountId = lead.account_id;
  }

  if (accountId) {
    const acc = await env.DB.prepare(`SELECT id, role, name FROM accounts WHERE id = ?1`).bind(accountId).first<Account>();
    if (!acc) return json({ error: 'not_found' }, 404);
    if (acc.role !== 'client') return json({ error: 'validation_failed', fields: ['client account'] }, 422);
  } else {
    if (!EMAIL_RE.test(email)) return json({ error: 'email_required' }, 422);
    const existing = await env.DB.prepare(`SELECT id, role, name FROM accounts WHERE lower(email) = ?1`).bind(email).first<Account>();
    if (existing) {
      if (existing.role !== 'client') return json({ error: 'validation_failed', fields: ['email belongs to a vendor/admin account'] }, 422);
      accountId = existing.id;
    } else {
      accountId = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO accounts (id, email, name, phone, address, role, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'client', ?6, ?6)`
      ).bind(accountId, email, lead?.name ?? (s('name', 120) || email), lead?.phone ?? null, lead?.address ?? null, now).run();
    }
  }

  if (vendorId) {
    const v = await env.DB.prepare(`SELECT id, role FROM accounts WHERE id = ?1`).bind(vendorId).first<{ id: string; role: string }>();
    if (!v || v.role !== 'vendor') return json({ error: 'not_a_vendor' }, 422);
  }

  const jobId = crypto.randomUUID();
  const now = Date.now();
  try {
    await env.DB.prepare(
      `INSERT INTO jobs (id, account_id, lead_id, vendor_id, service, description, status, vendor_response,
                         scheduled_at, amount_cents, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'scheduled', ?7, ?8, ?9, ?10)`
    ).bind(jobId, accountId, leadId, vendorId, service, description || null, vendorId ? 'pending' : 'unassigned',
      scheduledAt, amountCents, now).run();
  } catch (e) {
    console.error('admin_job_create_failed', String(e).slice(0, 300));
    return json({ error: 'storage_failed' }, 500);
  }

  if (lead) {
    try {
      if (!lead.account_id) await env.DB.prepare(`UPDATE leads SET account_id = ?1 WHERE id = ?2`).bind(accountId, lead.id).run();
      if (lead.status !== 'won') await env.DB.prepare(`UPDATE leads SET status = 'won' WHERE id = ?1`).bind(lead.id).run();
      await addLeadNote(env.DB, lead.id, admin, 'status', `Converted to job: ${service}`);
    } catch (e) {
      console.error('admin_job_lead_update_failed', String(e).slice(0, 300));
    }
  }

  return json({ ok: true, jobId, accountId, redirect: `/admin/jobs/?highlight=${jobId}` }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
