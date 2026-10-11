import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema } from '../../../../lib/admin';

export const prerender = false;

/**
 * PATCH /api/admin/accounts/[id] - admin only.
 * Body: { verified?: "1"|"0", insuranceOnFile?: "1"|"0" } on a vendor
 * account. "Verified" = staff checked licence/insurance/ID; it is the flag
 * dispatch looks at before assigning work.
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
  const acc = await env.DB.prepare(`SELECT id, role FROM accounts WHERE id = ?1`).bind(params.id ?? '').first<{ id: string; role: string }>();
  if (!acc) return json({ error: 'not_found' }, 404);

  const flag = (v: unknown) => v === true || v === '1' || v === 1;
  const sets: string[] = [];
  const binds: unknown[] = [];
  if ('verified' in b) {
    if (flag(b.verified)) {
      binds.push(Date.now(), admin.id);
      sets.push(`verified_at = ?${binds.length - 1}`, `verified_by = ?${binds.length}`);
    } else {
      sets.push('verified_at = NULL', 'verified_by = NULL');
    }
  }
  if ('insuranceOnFile' in b) {
    binds.push(flag(b.insuranceOnFile) ? 1 : 0);
    sets.push(`insurance_on_file = ?${binds.length}`);
  }
  if (!sets.length) return json({ ok: true, unchanged: true });
  binds.push(acc.id);
  await env.DB.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?${binds.length}`).bind(...binds).run();
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
