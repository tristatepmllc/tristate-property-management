import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../lib/require-admin';
import { json } from '../../../lib/http';
import { ensureAdminSchema } from '../../../lib/admin';

export const prerender = false;

/** GET /api/avatar/[id] - a staff user's profile photo; staff-only. */
export const GET: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers);
  if (!admin) return json({ error: 'not_found' }, 404);
  await ensureAdminSchema(env.DB);
  const row = await env.DB.prepare(`SELECT avatar_key FROM accounts WHERE id = ?1 AND role = 'admin'`)
    .bind(params.id ?? '').first<{ avatar_key: string | null }>();
  if (!row?.avatar_key) return json({ error: 'not_found' }, 404);
  const obj = await env.MEDIA.get(row.avatar_key);
  if (!obj) return json({ error: 'not_found' }, 404);
  const type = obj.httpMetadata?.contentType ?? 'image/jpeg';
  return new Response(obj.body, {
    headers: {
      'content-type': /^image\/(jpeg|png|webp)$/.test(type) ? type : 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, max-age=86400',
    },
  });
};
