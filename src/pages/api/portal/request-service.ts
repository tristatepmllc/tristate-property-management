import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../lib/auth';
import { json, methodNotAllowed } from '../../../lib/http';

export const prerender = false;

// Exported so portal.astro can compute the exact same throttle state
// server-side and decide whether to show the form at all - the API is the
// real gate, the UI check just has to agree with it, not duplicate its own
// separate rule that could drift out of sync.
export const THROTTLE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const THROTTLE_MAX = 3;

/**
 * POST /api/portal/request-service - client-role only.
 *
 * A signed-in client can submit a service request without leaving the
 * portal to re-fill the public /contact/ form. Writes into the SAME `leads`
 * table the public form uses, populating `leads.account_id` (nullable,
 * always null for guest submissions) - so it lands in the same admin leads
 * list automatically. Not a parallel intake system.
 *
 * No Turnstile: the authenticated session is the anti-abuse gate for this
 * path. In its place, a per-account throttle (max 3 requests / rolling
 * 24h) is enforced here - portal.astro checks the same window server-side
 * to decide whether to render the form at all, so the two layers can never
 * silently disagree.
 */
export const POST: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== 'client') return json({ error: 'forbidden' }, 403);

  const since = Date.now() - THROTTLE_WINDOW_MS;
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM leads WHERE account_id = ?1 AND created_at > ?2`
  )
    .bind(session.user.id, since)
    .first<{ n: number }>();
  if ((countRow?.n ?? 0) >= THROTTLE_MAX) {
    return json({ error: 'rate_limited' }, 429);
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const str = (k: string, max = 2000) => {
    const v = raw[k];
    return typeof v === 'string' ? v.trim().slice(0, max) : '';
  };

  // Phone is collected in this form (pre-filled from the profile client-side
  // when set) rather than pulled straight from the account row, because
  // leads.phone is NOT NULL and an account that never filled in a profile
  // phone number would otherwise fail this insert with no clear reason why.
  const phone = str('phone', 40);
  const service = str('service', 80);
  const urgency = str('urgency', 40);
  const message = str('details', 4000);

  const errors: string[] = [];
  if (!phone || phone.replace(/\D/g, '').length < 7) errors.push('phone');
  if (!service) errors.push('service');
  if (errors.length) return json({ error: 'validation_failed', fields: errors }, 422);

  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO leads (id, account_id, name, email, phone, company, address, service, urgency,
                          message, source, referrer, status, created_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`
    )
      .bind(
        id,
        session.user.id,
        user.name || user.email,
        user.email,
        phone,
        (user as typeof user & { company?: string | null }).company ?? null,
        (user as typeof user & { address?: string | null }).address ?? null,
        service,
        urgency || null,
        message || null,
        'portal-request-service',
        request.headers.get('referer'),
        'new',
        now
      )
      .run();
  } catch (e) {
    console.error('portal_request_service_insert_failed', e);
    return json({ error: 'storage_failed' }, 500);
  }

  return json({ ok: true, id }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
