import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../../../../lib/auth';
import { json, methodNotAllowed } from '../../../../../lib/http';

export const prerender = false;

const KINDS = ['coi', 'photo', 'other'] as const;
const MAX_BYTES = 15 * 1024 * 1024; // 15MB - generous for a COI PDF or a phone photo, not for video

type JobRow = { id: string; account_id: string; vendor_id: string | null };
type DocRow = {
  id: string; job_id: string; account_id: string; kind: string;
  filename: string; content_type: string | null; size_bytes: number | null; created_at: number;
};

async function loadJobForParticipant(jobId: string, userId: string): Promise<JobRow | null> {
  const job = await env.DB.prepare(`SELECT id, account_id, vendor_id FROM jobs WHERE id = ?1`)
    .bind(jobId)
    .first<JobRow>();
  if (!job) return null;
  if (job.account_id !== userId && job.vendor_id !== userId) return null;
  return job;
}

/** GET /api/portal/jobs/[id]/documents - list docs for a job. Job's client or assigned vendor only. */
export const GET: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  const job = await loadJobForParticipant(jobId, session.user.id);
  if (!job) return json({ error: 'not_found' }, 404);

  const { results } = await env.DB.prepare(
    `SELECT id, job_id, account_id, kind, filename, content_type, size_bytes, created_at
     FROM job_documents WHERE job_id = ?1 ORDER BY created_at DESC`
  ).bind(jobId).all<DocRow>();

  return json({ documents: results ?? [] });
};

/**
 * POST /api/portal/jobs/[id]/documents - upload a file against a job.
 * multipart/form-data: `file` (required), `kind` (optional, coi|photo|other,
 * defaults to other). Job's client or assigned vendor only - not admin;
 * admin isn't a job participant and has no upload UI built for this.
 *
 * First real write path through the R2 `MEDIA` binding (see wrangler.jsonc
 * / docs/ops-context.md - bound since the bucket rename, unused until now).
 * No download/signed-URL route exists yet - this stores the file and the
 * row, nothing serves it back out. That is a real, known gap, not an
 * oversight: retrieval was not asked for, only upload.
 */
export const POST: APIRoute = async ({ request, params }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const jobId = params.id;
  if (!jobId) return json({ error: 'missing_id' }, 400);

  const job = await loadJobForParticipant(jobId, session.user.id);
  if (!job) return json({ error: 'not_found' }, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return json({ error: 'file_required' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'file_too_large', maxBytes: MAX_BYTES }, 413);

  const kindRaw = form.get('kind');
  const kind = typeof kindRaw === 'string' && (KINDS as readonly string[]).includes(kindRaw) ? kindRaw : 'other';

  const id = crypto.randomUUID();
  const now = Date.now();
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 160) || 'upload';
  const r2Key = `jobs/${jobId}/${id}-${safeName}`;

  try {
    await env.MEDIA.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });
  } catch (e) {
    console.error('job_document_r2_put_failed', { jobId, error: e });
    return json({ error: 'storage_failed' }, 500);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO job_documents (id, job_id, account_id, kind, filename, content_type, size_bytes, r2_key, created_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    )
      .bind(id, jobId, session.user.id, kind, safeName, file.type || null, file.size, r2Key, now)
      .run();
  } catch (e) {
    // The object is already in R2 at this point. Not cleaning it up on a D1
    // failure - an orphaned R2 object costs nothing and is recoverable by
    // hand; silently losing track of which key it was would be worse.
    console.error('job_document_insert_failed', { jobId, r2Key, error: e });
    return json({ error: 'storage_failed' }, 500);
  }

  return json({ ok: true, id, filename: safeName, kind }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
