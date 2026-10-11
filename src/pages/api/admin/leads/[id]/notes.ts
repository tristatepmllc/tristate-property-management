import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../../lib/http';
import { ensureAdminSchema, addLeadNote } from '../../../../../lib/admin';

export const prerender = false;

/**
 * POST /api/admin/leads/[id]/notes - admin only.
 * Body: { kind: 'note'|'call', outcome?, body? }. A call with an outcome
 * and no text is fine ("No answer"); an empty note is not. Logging a call
 * on an unhandled lead moves it to Contacted, so the "not contacted"
 * count stays honest without a second click.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'leads.edit');
  if (!admin) return json({ error: 'forbidden' }, 403);

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const kind = raw.kind === 'call' ? 'call' : 'note';
  const outcome = typeof raw.outcome === 'string' ? raw.outcome.trim().slice(0, 80) : '';
  const text = typeof raw.body === 'string' ? raw.body.trim().slice(0, 4000) : '';
  const entry = [outcome, text].filter(Boolean).join(' - ');
  if (!entry) return json({ error: 'validation_failed', fields: ['notes'] }, 422);

  await ensureAdminSchema(env.DB);
  const lead = await env.DB.prepare(`SELECT id, status FROM leads WHERE id = ?1`)
    .bind(params.id ?? '')
    .first<{ id: string; status: string }>();
  if (!lead) return json({ error: 'not_found' }, 404);

  await addLeadNote(env.DB, lead.id, admin, kind, entry);

  const spoke = kind === 'call' && outcome !== 'Wrong number';
  if (spoke && (lead.status === 'new' || lead.status === 'needs_review')) {
    await env.DB.prepare(`UPDATE leads SET status = 'contacted' WHERE id = ?1`).bind(lead.id).run();
    await addLeadNote(env.DB, lead.id, admin, 'status', 'Moved to Contacted (call logged)');
  }
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
