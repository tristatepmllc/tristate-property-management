import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ASSIGNABLE_ROLE_VALUES } from '../../../../lib/admin';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/admin/team - Super Admin and Admins only. Add a new user.
 * Body: { name, email, staffRole: 'admin'|'editor', password } (10+ chars).
 * Super Admin can never be assigned here.
 * Creates an admin-role account with that staff role and a Better Auth
 * credential. An email already used by a client/vendor account is refused
 * - staff logins are kept separate from customer logins on purpose.
 */
export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request.headers, 'team');
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const s = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');
  const name = s('name', 120);
  const email = s('email', 200).toLowerCase();
  const staffRole = s('staffRole', 20);
  const password = typeof b.password === 'string' ? b.password : '';

  const errors: string[] = [];
  if (!name) errors.push('name');
  if (!EMAIL_RE.test(email)) errors.push('email');
  if (!ASSIGNABLE_ROLE_VALUES.includes(staffRole)) errors.push('role');
  if (password.length < 10 || password.length > 128) errors.push('password (10+ characters)');
  if (errors.length) return json({ error: 'validation_failed', fields: errors }, 422);

  const existing = await env.DB.prepare(`SELECT id, role FROM accounts WHERE lower(email) = ?1`).bind(email).first<{ id: string; role: string }>();
  if (existing) return json({ error: 'validation_failed', fields: [`an account already uses ${email}`] }, 409);

  const id = crypto.randomUUID();
  const now = Date.now();
  const hash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO accounts (id, email, name, role, staff_role, email_verified, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'admin', ?4, 1, ?5, ?5)`
    ).bind(id, email, name, staffRole, now),
    env.DB.prepare(
      `INSERT INTO auth_credentials (id, account_id, provider_id, provider_account_id, password, created_at, updated_at)
       VALUES (?1, ?2, 'credential', ?2, ?3, ?4, ?4)`
    ).bind(crypto.randomUUID(), id, hash, now),
  ]);
  return json({ ok: true, id }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
