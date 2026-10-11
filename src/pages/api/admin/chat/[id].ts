import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureChatSchema, cleanBody, type ChatMessage } from '../../../../lib/chat';

export const prerender = false;

/**
 * Staff side of one conversation (perm: messages).
 *   GET   ?after=ms        messages newer than `after`; marks it read for staff
 *   POST  { body }         reply as the signed-in staff member; the linked
 *                          lead moves to Contacted if it was still new
 *   PATCH { status }       'open' | 'closed'
 */
type Conv = { id: string; lead_id: string | null; status: string; visitor_seen_at: number | null };

async function load(id: string): Promise<Conv | null> {
  return env.DB.prepare(`SELECT id, lead_id, status, visitor_seen_at FROM chat_conversations WHERE id = ?1`).bind(id).first<Conv>();
}

export const GET: APIRoute = async ({ request, params, url }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'forbidden' }, 403);
  await ensureChatSchema(env.DB);
  const conv = await load(params.id ?? '');
  if (!conv) return json({ error: 'not_found' }, 404);
  const after = Math.max(0, Number(url.searchParams.get('after')) || 0);
  const msgs = await env.DB.prepare(
    `SELECT id, sender, author_name, body, created_at FROM chat_messages
     WHERE conversation_id = ?1 AND created_at > ?2 ORDER BY created_at ASC LIMIT 500`
  ).bind(conv.id, after).all<ChatMessage>();
  await env.DB.prepare(`UPDATE chat_conversations SET unread_admin = 0 WHERE id = ?1 AND unread_admin > 0`).bind(conv.id).run();
  return json({ ok: true, status: conv.status, visitorSeenAt: conv.visitor_seen_at, messages: msgs.results ?? [] });
};

export const POST: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'forbidden' }, 403);
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  await ensureChatSchema(env.DB);
  const conv = await load(params.id ?? '');
  if (!conv) return json({ error: 'not_found' }, 404);
  const body = cleanBody(raw.body);
  if (!body) return json({ error: 'validation_failed', fields: ['message'] }, 422);

  const now = Date.now();
  const id = crypto.randomUUID();
  const authorName = (admin.name || admin.email).split(' ')[0];
  const stmts = [
    env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_id, author_name, body, created_at) VALUES (?1, ?2, 'agent', ?3, ?4, ?5, ?6)`
    ).bind(id, conv.id, admin.id, authorName, body, now),
    env.DB.prepare(
      `UPDATE chat_conversations SET unread_visitor = unread_visitor + 1, unread_admin = 0, last_message_at = ?1, last_preview = ?2, status = 'open' WHERE id = ?3`
    ).bind(now, `You: ${body}`.slice(0, 140), conv.id),
  ];
  if (conv.lead_id) {
    stmts.push(env.DB.prepare(`UPDATE leads SET status = 'contacted' WHERE id = ?1 AND status IN ('new','needs_review')`).bind(conv.lead_id));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, message: { id, sender: 'agent', author_name: authorName, body, created_at: now } });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'forbidden' }, 403);
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const status = raw.status === 'closed' ? 'closed' : raw.status === 'open' ? 'open' : '';
  if (!status) return json({ error: 'invalid_status' }, 422);
  await ensureChatSchema(env.DB);
  const conv = await load(params.id ?? '');
  if (!conv) return json({ error: 'not_found' }, 404);
  await env.DB.prepare(`UPDATE chat_conversations SET status = ?1, unread_admin = 0 WHERE id = ?2`).bind(status, conv.id).run();
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('GET, POST, PATCH');
