import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { ensureChatSchema, visitorConversation, cleanBody } from '../../../lib/chat';

export const prerender = false;

/**
 * POST /api/chat/send - public, visitor side. Body: { id, token, body }.
 * Reopens a closed conversation. Max 15 visitor messages per minute.
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
  const body = cleanBody(raw.body);
  if (!body) return json({ error: 'validation_failed', fields: ['message'] }, 422);

  const now = Date.now();
  const burst = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ?1 AND sender = 'visitor' AND created_at > ?2`
  ).bind(conv.id, now - 60_000).first<{ n: number }>();
  if ((burst?.n ?? 0) >= 15) return json({ error: 'rate_limited' }, 429);

  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, body, created_at) VALUES (?1, ?2, 'visitor', ?3, ?4)`
    ).bind(id, conv.id, body, now),
    env.DB.prepare(
      `UPDATE chat_conversations SET unread_admin = unread_admin + 1, last_message_at = ?1, last_preview = ?2, status = 'open' WHERE id = ?3`
    ).bind(now, body.slice(0, 140), conv.id),
  ]);
  return json({ ok: true, message: { id, sender: 'visitor', author_name: null, body, created_at: now } });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
