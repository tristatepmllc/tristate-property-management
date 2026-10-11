import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema, VENDOR_APP_STATUS_VALUES } from '../../../../lib/admin';

export const prerender = false;

/**
 * PATCH /api/admin/vendor-applications/[id] - admin only.
 * Body: { status?, notes? } for a /vendor-network/ application (vendors table).
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  await ensureAdminSchema(env.DB);
  const app = await env.DB.prepare(`SELECT id FROM vendors WHERE id = ?1`).bind(params.id ?? '').first<{ id: string }>();
  if (!app) return json({ error: 'not_found' }, 404);

  const sets: string[] = [];
  const binds: unknown[] = [];
  if ('status' in b) {
    if (typeof b.status !== 'string' || !VENDOR_APP_STATUS_VALUES.includes(b.status)) return json({ error: 'invalid_status' }, 422);
    binds.push(b.status);
    sets.push(`status = ?${binds.length}`);
    binds.push(Date.now());
    sets.push(`reviewed_at = ?${binds.length}`);
  }
  if ('notes' in b) {
    binds.push(typeof b.notes === 'string' ? b.notes.trim().slice(0, 4000) || null : null);
    sets.push(`admin_notes = ?${binds.length}`);
  }
  if (!sets.length) return json({ ok: true, unchanged: true });
  binds.push(app.id);
  await env.DB.prepare(`UPDATE vendors SET ${sets.join(', ')} WHERE id = ?${binds.length}`).bind(...binds).run();
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
