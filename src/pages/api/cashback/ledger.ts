import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../lib/auth';
import { json } from '../../../lib/http';

export const prerender = false;

type LedgerRow = {
  id: string;
  job_id: string | null;
  amount_cents: number;
  reason: string;
  created_at: number;
};

/** GET /api/cashback/ledger - full earn/redeem history, newest first. */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT id, job_id, amount_cents, reason, created_at
     FROM cashback_ledger WHERE account_id = ?1 ORDER BY created_at DESC LIMIT 200`
  ).bind(session.user.id).all<LedgerRow>();

  return json({ entries: results ?? [] });
};
