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
  vendor_id: string | null;
  vendor_response: string;
  scheduled_at: number | null;
  completed_at: number | null;
  amount_cents: number | null;
  created_at: number;
};

/**
 * GET /api/jobs - service history for the signed-in account, either as the
 * client the job belongs to or the vendor it's assigned to.
 * There is still no job-creation flow (nothing converts a lead into a job
 * row) - only assignment onto existing rows exists (PATCH
 * /api/admin/jobs/[id]). An account with no jobs correctly gets back an
 * empty array; that is an honest state, not a bug.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  // account_id = client jobs, vendor_id = jobs assigned to this account as
  // the vendor - a signed-in user can be either depending on role, and this
  // endpoint returns "jobs relevant to me" either way rather than assuming
  // client-only, which is what it did before job assignment existed.
  const { results } = await env.DB.prepare(
    `SELECT id, service, description, status, vendor_id, vendor_response, scheduled_at, completed_at, amount_cents, created_at
     FROM jobs WHERE account_id = ?1 OR vendor_id = ?1 ORDER BY created_at DESC LIMIT 100`
  ).bind(session.user.id).all<JobRow>();

  return json({ jobs: results ?? [] });
};
