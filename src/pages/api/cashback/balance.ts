import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../lib/auth';
import { json } from '../../../lib/http';

export const prerender = false;

/**
 * GET /api/cashback/balance - SUM over the append-only ledger.
 * The ledger is append-only by design (see db/schema.sql) - there is no
 * `balance` column anywhere to drift out of sync, so this is the one and only
 * place a balance is computed, every time, from the rows themselves.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) AS cents FROM cashback_ledger WHERE account_id = ?1`
  ).bind(session.user.id).first<{ cents: number }>();

  return json({ balanceCents: row?.cents ?? 0 });
};
