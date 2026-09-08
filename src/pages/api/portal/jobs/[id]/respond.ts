import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../../../lib/auth';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

type JobRow = { id: string; vendor_id: string | null; vendor_response: string };

/**
 * POST /api/portal/jobs/[id]/respond - vendor-only.
 * Body: { action: 'accept' | 'decline', reason?: string }.
 *
 * Only legal from vendor_response === 'pending' - a job that's already
 * accepted or declined needs a fresh assignment (admin re-offers it, which
 * resets vendor_response to 'pending' - see PATCH /api/admin/jobs/[id]) to
 * be responded to again, not a second response tacked onto the first.
 *
 * Declining does NOT clear vendor_id. The decision here is that the
 * decline stays attached to the vendor who made it (decline_reason is
 * their own words, not anonymous), and it's admin's job to notice
 * vendor_response = 'declined' and reassign - see the known-gap note below
 * this handler for what isn't built yet on that side.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const user = session.user as typeof session.user & { role?: string };
  if (user.role !== 'vendor') return json({ error: 'forbidden' }, 403);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const action = body.action;
  if (action !== 'accept' && action !== 'decline') return json({ error: 'invalid_action' }, 400);

  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : null;
  if (action === 'decline' && !reason) return json({ error: 'reason_required' }, 422);

  const job = await env.DB.prepare(`SELECT id, vendor_id, vendor_response FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  if (!job || job.vendor_id !== user.id) return json({ error: 'not_found' }, 404);
  if (job.vendor_response !== 'pending') return json({ error: 'not_pending' }, 409);

  const now = Date.now();
  await env.DB.prepare(
    `UPDATE jobs SET vendor_response = ?1, vendor_responded_at = ?2, decline_reason = ?3 WHERE id = ?4`
  )
    .bind(action === 'accept' ? 'accepted' : 'declined', now, action === 'decline' ? reason : null, jobId)
    .run();

  // KNOWN GAP: nothing notifies admin when a vendor declines. Admin has to
  // notice vendor_response = 'declined' in the /admin/ jobs table and
  // reassign by hand. Flagging this rather than silently leaving it - a
  // decline-notify-to-admin email is the obvious next email to wire up
  // after the assignment one, not built here because it wasn't asked for.

  return json({ ok: true, jobId, vendorResponse: action === 'accept' ? 'accepted' : 'declined' });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
