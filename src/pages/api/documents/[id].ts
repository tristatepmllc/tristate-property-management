import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../lib/auth';
import { requireAdmin } from '../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../lib/http';

export const prerender = false;

type Doc = {
  id: string; job_id: string; filename: string; content_type: string | null; r2_key: string;
  job_account_id: string | null; job_vendor_id: string | null;
};

// Only these render in the browser; everything else downloads, so an
// uploaded .html/.svg can never run as a page on this domain.
const INLINE = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']);

/**
 * GET /api/documents/[id] - a file attached to a job (COI, photos...).
 * Allowed: any staff member who can view jobs or vendors, or the job's own
 * client or vendor. Everyone else gets the same 404.
 */
export const GET: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'not_found' }, 404);

  const doc = await env.DB.prepare(
    `SELECT d.id, d.job_id, d.filename, d.content_type, d.r2_key,
            j.account_id AS job_account_id, j.vendor_id AS job_vendor_id
     FROM job_documents d LEFT JOIN jobs j ON j.id = d.job_id WHERE d.id = ?1`
  ).bind(params.id ?? '').first<Doc>();
  if (!doc) return json({ error: 'not_found' }, 404);

  const uid = session.user.id;
  const participant = doc.job_account_id === uid || doc.job_vendor_id === uid;
  const staff = participant
    ? null
    : (await requireAdmin(request.headers, 'jobs.view')) ?? (await requireAdmin(request.headers, 'vendors.view'));
  if (!participant && !staff) return json({ error: 'not_found' }, 404);

  const obj = await env.MEDIA.get(doc.r2_key);
  if (!obj) return json({ error: 'not_found' }, 404);

  const type = (doc.content_type || '').toLowerCase();
  const inline = INLINE.has(type);
  const safeName = doc.filename.replace(/[^\w.\- ]+/g, '_').slice(0, 150) || 'document';
  return new Response(obj.body, {
    headers: {
      'content-type': inline ? type : 'application/octet-stream',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
      'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
};

export const ALL: APIRoute = () => methodNotAllowed('GET');
