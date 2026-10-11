import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { ensureChatSchema, visitorConversation, type ChatMessage } from '../../../lib/chat';

export const prerender = false;

/**
 * POST /api/chat/poll - public, visitor side (POST so the token never sits
 * in a URL or a log). Body: { id, token, after?: ms, seen?: boolean }.
 * Returns messages newer than `after` (or the full history when after = 0)
 * and the count of agent replies the visitor has not seen. `seen: true`
 * (chat window open) clears that count.
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

  const after = Math.max(0, Number(raw.after) || 0);
  const msgs = await env.DB.prepare(
    `SELECT id, sender, author_name, body, created_at FROM chat_messages
     WHERE conversation_id = ?1 AND created_at > ?2 ORDER BY created_at ASC LIMIT 200`
  ).bind(conv.id, after).all<ChatMessage>();

  let unread = 0;
  if (raw.seen === true) {
    await env.DB.prepare(`UPDATE chat_conversations SET unread_visitor = 0, visitor_seen_at = ?1 WHERE id = ?2`)
      .bind(Date.now(), conv.id).run();
  } else {
    const r = await env.DB.prepare(`SELECT unread_visitor FROM chat_conversations WHERE id = ?1`).bind(conv.id)
      .first<{ unread_visitor: number }>();
    unread = r?.unread_visitor ?? 0;
  }
  return json({ ok: true, status: conv.status, unread, messages: msgs.results ?? [] });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
