import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { STAFF_ROLE_VALUES, staffRoleOf } from '../../../../lib/admin';

export const prerender = false;

/**
 * PATCH /api/admin/team/[id] - admins only (Users page). One of:
 *   { staffRole }            change role
 *   { password }             set a temporary password (signs them out)
 *   { action: 'disable' }    remove admin access: role -> 'disabled',
 *                            password removed, all sessions ended
 * Guards: you cannot change or disable yourself, and the last admin can
 * never be made an editor or removed.
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'team');
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const target = await env.DB.prepare(`SELECT id, role, staff_role FROM accounts WHERE id = ?1`)
    .bind(params.id ?? '').first<{ id: string; role: string; staff_role: string | null }>();
  if (!target || target.role !== 'admin') return json({ error: 'not_found' }, 404);

  const isSelf = target.id === admin.id;
  const targetIsAdmin = staffRoleOf(target.staff_role) === 'admin';
  const admins = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM accounts WHERE role = 'admin' AND (staff_role IS NULL OR staff_role NOT IN ('editor','dispatch','sales','viewer'))`
  ).first<{ n: number }>();
  const lastOwner = targetIsAdmin && (admins?.n ?? 0) <= 1;

  if (typeof b.password === 'string') {
    const pw = b.password;
    if (pw.length < 10 || pw.length > 128) return json({ error: 'validation_failed', fields: ['password (10+ characters)'] }, 422);
    const hash = await hashPassword(pw);
    const now = Date.now();
    const cred = await env.DB.prepare(`SELECT id FROM auth_credentials WHERE account_id = ?1 AND provider_id = 'credential'`)
      .bind(target.id).first<{ id: string }>();
    await env.DB.batch([
      cred
        ? env.DB.prepare(`UPDATE auth_credentials SET password = ?1, updated_at = ?2 WHERE id = ?3`).bind(hash, now, cred.id)
        : env.DB.prepare(
            `INSERT INTO auth_credentials (id, account_id, provider_id, provider_account_id, password, created_at, updated_at)
             VALUES (?1, ?2, 'credential', ?2, ?3, ?4, ?4)`
          ).bind(crypto.randomUUID(), target.id, hash, now),
      ...(isSelf ? [] : [env.DB.prepare(`DELETE FROM session WHERE account_id = ?1`).bind(target.id)]),
    ]);
    return json({ ok: true });
  }

  if (isSelf) return json({ error: 'validation_failed', fields: ['you cannot change your own role or access'] }, 422);

  if (b.action === 'disable') {
    if (lastOwner) return json({ error: 'validation_failed', fields: ['the last admin cannot be removed'] }, 422);
    await env.DB.batch([
      env.DB.prepare(`UPDATE accounts SET role = 'disabled', updated_at = ?1 WHERE id = ?2`).bind(Date.now(), target.id),
      env.DB.prepare(`DELETE FROM auth_credentials WHERE account_id = ?1`).bind(target.id),
      env.DB.prepare(`DELETE FROM session WHERE account_id = ?1`).bind(target.id),
    ]);
    return json({ ok: true });
  }

  if (typeof b.staffRole === 'string') {
    if (!STAFF_ROLE_VALUES.includes(b.staffRole)) return json({ error: 'invalid_status' }, 422);
    if (lastOwner && b.staffRole !== 'admin') return json({ error: 'validation_failed', fields: ['the last admin cannot be made an editor'] }, 422);
    await env.DB.prepare(`UPDATE accounts SET staff_role = ?1, updated_at = ?2 WHERE id = ?3`).bind(b.staffRole, Date.now(), target.id).run();
    return json({ ok: true });
  }

  return json({ ok: true, unchanged: true });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
