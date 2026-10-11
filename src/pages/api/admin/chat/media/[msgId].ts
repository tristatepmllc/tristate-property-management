import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../../lib/require-admin';
import { json } from '../../../../../lib/http';
import { ensureChatSchema, serveMedia } from '../../../../../lib/chat';

export const prerender = false;

/** GET /api/admin/chat/media/[msgId] - staff view a chat photo / voice note. */
export const GET: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'not_found' }, 404);
  await ensureChatSchema(env.DB);
  const msg = await env.DB.prepare(`SELECT media_key, media_type FROM chat_messages WHERE id = ?1`)
    .bind(params.msgId ?? '').first<{ media_key: string | null; media_type: string | null }>();
  if (!msg?.media_key) return json({ error: 'not_found' }, 404);
  return (await serveMedia(env.MEDIA, msg.media_key, msg.media_type)) ?? json({ error: 'not_found' }, 404);
};
