import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { ensureChatSchema, visitorConversation, serveMedia } from '../../../lib/chat';

export const prerender = false;

/**
 * POST /api/chat/media - visitor fetches a photo/voice note in their own
 * chat. Body: { id, token, msgId }. POST + token (never a public URL), the
 * widget turns the bytes into a blob: URL.
 */
export const POST: APIRoute = async ({ request }) => {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  await ensureChatSchema(env.DB);
  const conv = await visitorConversation(env.DB, String(raw.id ?? ''), String(raw.token ?? ''));
  if (!conv) return json({ error: 'not_found' }, 404);
  const msg = await env.DB.prepare(`SELECT media_key, media_type FROM chat_messages WHERE id = ?1 AND conversation_id = ?2`)
    .bind(String(raw.msgId ?? ''), conv.id).first<{ media_key: string | null; media_type: string | null }>();
  if (!msg?.media_key) return json({ error: 'not_found' }, 404);
  return (await serveMedia(env.MEDIA, msg.media_key, msg.media_type)) ?? json({ error: 'not_found' }, 404);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
