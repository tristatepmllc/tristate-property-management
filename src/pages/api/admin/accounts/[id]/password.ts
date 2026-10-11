import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '../../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

/**
 * POST /api/admin/accounts/[id]/password - admin only. Body: { password }.
 * Sets a temporary password on a client or vendor account (creating the
 * credential row if the account never had one, e.g. a client account
 * created from a lead) and signs that account out everywhere. Admin
 * accounts are excluded on purpose - no admin can reset another admin.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 10 || password.length > 128) return json({ error: 'validation_failed', fields: ['password (10+ characters)'] }, 422);

  const acc = await env.DB.prepare(`SELECT id, role FROM accounts WHERE id = ?1`).bind(params.id ?? '').first<{ id: string; role: string }>();
  if (!acc) return json({ error: 'not_found' }, 404);
  if (acc.role === 'admin') return json({ error: 'forbidden' }, 403);

  const hash = await hashPassword(password);
  const now = Date.now();
  const cred = await env.DB.prepare(`SELECT id FROM auth_credentials WHERE account_id = ?1 AND provider_id = 'credential'`)
    .bind(acc.id).first<{ id: string }>();
  await env.DB.batch([
    cred
      ? env.DB.prepare(`UPDATE auth_credentials SET password = ?1, updated_at = ?2 WHERE id = ?3`).bind(hash, now, cred.id)
      : env.DB.prepare(
          `INSERT INTO auth_credentials (id, account_id, provider_id, provider_account_id, password, created_at, updated_at)
           VALUES (?1, ?2, 'credential', ?2, ?3, ?4, ?4)`
        ).bind(crypto.randomUUID(), acc.id, hash, now),
    env.DB.prepare(`DELETE FROM session WHERE account_id = ?1`).bind(acc.id),
  ]);
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
