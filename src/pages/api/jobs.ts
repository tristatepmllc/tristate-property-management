import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../lib/auth';
import { json } from '../../lib/http';

export const prerender = false;

type JobRow = {
  id: string;
  service: string | null;
  description: string | null;
  status: string;
  scheduled_at: number | null;
  completed_at: number | null;
  amount_cents: number | null;
  created_at: number;
};

/**
 * GET /api/jobs - service history for the signed-in account.
 * Nothing writes to `jobs` yet - there is no scheduling flow in this repo -
 * so a real account correctly gets back an empty array today. That is an
 * honest state, not a bug: the alternative is fabricating job rows, which is
 * the same mistake the testimonials file was cleared of.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT id, service, description, status, scheduled_at, completed_at, amount_cents, created_at
     FROM jobs WHERE account_id = ?1 ORDER BY created_at DESC LIMIT 100`
  ).bind(session.user.id).all<JobRow>();

  return json({ jobs: results ?? [] });
};
