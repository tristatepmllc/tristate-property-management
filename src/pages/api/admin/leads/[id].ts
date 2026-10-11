import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema, addLeadNote, LEAD_STATUS_VALUES, leadStatusLabel } from '../../../../lib/admin';

export const prerender = false;

/**
 * PATCH /api/admin/leads/[id] - admin only. Body: { status }.
 * Every change is written to the lead's activity log with who made it.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'leads.edit');
  if (!admin) return json({ error: 'forbidden' }, 403);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!LEAD_STATUS_VALUES.includes(status)) return json({ error: 'invalid_status' }, 422);

  await ensureAdminSchema(env.DB);
  const lead = await env.DB.prepare(`SELECT id, status FROM leads WHERE id = ?1`)
    .bind(params.id ?? '')
    .first<{ id: string; status: string }>();
  if (!lead) return json({ error: 'not_found' }, 404);
  if (lead.status === status) return json({ ok: true, unchanged: true });

  await env.DB.prepare(`UPDATE leads SET status = ?1 WHERE id = ?2`).bind(status, lead.id).run();
  try {
    await addLeadNote(env.DB, lead.id, admin, 'status', `${leadStatusLabel(lead.status)} -> ${leadStatusLabel(status)}`);
  } catch (e) {
    console.error('lead_status_note_failed', lead.id, String(e).slice(0, 200));
  }
  return json({ ok: true, id: lead.id, status });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
