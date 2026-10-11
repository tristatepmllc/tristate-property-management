import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hashPassword } from 'better-auth/crypto';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema } from '../../../../lib/admin';

export const prerender = false;

type App = {
  id: string; name: string; business: string | null; email: string; phone: string; address: string | null;
  trade: string; trades_other: string | null; license_number: string | null; area: string | null; years: string | null;
};

/**
 * POST /api/admin/accounts - Super Admin / Admin only (it grants a login). Approve a vendor application and
 * create its portal login in one step.
 * Body: { applicationId, password }  (temporary password, min 10 chars;
 * staff give it to the vendor by phone and the vendor changes it under
 * Settings. Works today without any email sending set up.)
 *
 * Vendor accounts cannot be self-created (sign-up forces role=client), so
 * this is the vetted path: application -> review -> approve -> login.
 * The password is hashed with Better Auth's own hasher and stored in its
 * credential table exactly as a normal sign-up would.
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
  const applicationId = typeof b.applicationId === 'string' ? b.applicationId : '';
  const password = typeof b.password === 'string' ? b.password : '';
  if (password.length < 10 || password.length > 128) return json({ error: 'validation_failed', fields: ['password (10+ characters)'] }, 422);

  await ensureAdminSchema(env.DB);
  const app = await env.DB.prepare(
    `SELECT id, name, business, email, phone, address, trade, trades_other, license_number, area, years FROM vendors WHERE id = ?1`
  ).bind(applicationId).first<App>();
  if (!app) return json({ error: 'not_found' }, 404);

  const email = app.email.trim().toLowerCase();
  const existing = await env.DB.prepare(`SELECT id, role FROM accounts WHERE lower(email) = ?1`).bind(email).first<{ id: string; role: string }>();
  if (existing) return json({ error: 'validation_failed', fields: [`an account already exists for ${email}`] }, 409);

  const accountId = crypto.randomUUID();
  const now = Date.now();
  const hash = await hashPassword(password);
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO accounts (id, email, name, company, phone, address, role, trade, trades_other, service_area,
                               license_number, years_in_business, email_verified, verified_at, verified_by, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'vendor', ?7, ?8, ?9, ?10, ?11, 0, ?12, ?13, ?12, ?12)`
      ).bind(accountId, email, app.name, app.business, app.phone, app.address, app.trade, app.trades_other, app.area,
        app.license_number, app.years, now, admin.id),
      env.DB.prepare(
        `INSERT INTO auth_credentials (id, account_id, provider_id, provider_account_id, password, created_at, updated_at)
         VALUES (?1, ?2, 'credential', ?2, ?3, ?4, ?4)`
      ).bind(crypto.randomUUID(), accountId, hash, now),
      env.DB.prepare(`UPDATE vendors SET status = 'approved', reviewed_at = ?1 WHERE id = ?2`).bind(now, app.id),
    ]);
  } catch (e) {
    console.error('admin_vendor_account_create_failed', String(e).slice(0, 300));
    return json({ error: 'storage_failed' }, 500);
  }
  return json({ ok: true, accountId, redirect: `/admin/vendors/${accountId}?created=1` }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
