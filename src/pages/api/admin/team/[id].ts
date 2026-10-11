import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ASSIGNABLE_ROLE_VALUES, canManageUser } from '../../../../lib/admin';

export const prerender = false;

/**
 * PATCH /api/admin/team/[id] - Super Admin and Admins only. One of:
 *   { staffRole: 'admin'|'editor' }  change role
 *   { password }                     set a new password (they are signed out)
 *   { action: 'disable' }            remove access: role -> 'disabled',
 *                                    password removed, sessions ended
 *
 * canManageUser(): nobody can act on the Super Admin, nobody can act on
 * themselves here (own password/photo live under My account), Editors
 * cannot act on anyone. Super Admin is never assignable.
 * Passwords are only ever written as a hash; nothing returns them.
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
  if (!canManageUser(admin.staffRole, admin.id, target)) return json({ error: 'forbidden' }, 403);

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
      env.DB.prepare(`DELETE FROM session WHERE account_id = ?1`).bind(target.id),
    ]);
    return json({ ok: true });
  }

  if (b.action === 'disable') {
    await env.DB.batch([
      env.DB.prepare(`UPDATE accounts SET role = 'disabled', updated_at = ?1 WHERE id = ?2`).bind(Date.now(), target.id),
      env.DB.prepare(`DELETE FROM auth_credentials WHERE account_id = ?1`).bind(target.id),
      env.DB.prepare(`DELETE FROM session WHERE account_id = ?1`).bind(target.id),
    ]);
    return json({ ok: true });
  }

  if (typeof b.staffRole === 'string') {
    if (!ASSIGNABLE_ROLE_VALUES.includes(b.staffRole)) return json({ error: 'invalid_status' }, 422);
    await env.DB.prepare(`UPDATE accounts SET staff_role = ?1, updated_at = ?2 WHERE id = ?3`).bind(b.staffRole, Date.now(), target.id).run();
    return json({ ok: true });
  }

  return json({ ok: true, unchanged: true });
};

export const ALL: APIRoute = () => methodNotAllowed('PATCH');
