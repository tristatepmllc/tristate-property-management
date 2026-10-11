import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureAdminSchema } from '../../../../lib/admin';

export const prerender = false;

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * POST /api/admin/me/photo - any staff user, OWN photo only.
 * multipart/form-data, field "photo": JPG/PNG/WebP up to 2 MB, stored in
 * R2 under avatars/<accountId>/. DELETE removes it. There is no way to
 * set someone else's photo.
 */
export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get('photo');
    file = f instanceof File ? f : null;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!file || file.size === 0) return json({ error: 'validation_failed', fields: ['photo'] }, 422);
  const ext = TYPES[file.type];
  if (!ext) return json({ error: 'validation_failed', fields: ['photo must be JPG, PNG or WebP'] }, 422);
  if (file.size > MAX_BYTES) return json({ error: 'validation_failed', fields: ['photo must be 2 MB or smaller'] }, 413);

  await ensureAdminSchema(env.DB);
  const prev = await env.DB.prepare(`SELECT avatar_key FROM accounts WHERE id = ?1`).bind(admin.id).first<{ avatar_key: string | null }>();
  const key = `avatars/${admin.id}/${Date.now()}.${ext}`;
  try {
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  } catch (e) {
    console.error('avatar_put_failed', String(e).slice(0, 200));
    return json({ error: 'storage_failed' }, 500);
  }
  await env.DB.prepare(`UPDATE accounts SET avatar_key = ?1, image = ?2 WHERE id = ?3`)
    .bind(key, `/api/avatar/${admin.id}`, admin.id).run();
  if (prev?.avatar_key) {
    try { await env.MEDIA.delete(prev.avatar_key); } catch { /* old file left behind is harmless */ }
  }
  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'forbidden' }, 403);
  await ensureAdminSchema(env.DB);
  const prev = await env.DB.prepare(`SELECT avatar_key FROM accounts WHERE id = ?1`).bind(admin.id).first<{ avatar_key: string | null }>();
  await env.DB.prepare(`UPDATE accounts SET avatar_key = NULL, image = NULL WHERE id = ?1`).bind(admin.id).run();
  if (prev?.avatar_key) {
    try { await env.MEDIA.delete(prev.avatar_key); } catch { /* ignore */ }
  }
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('POST, DELETE');
