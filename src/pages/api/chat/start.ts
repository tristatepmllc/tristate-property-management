import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { verifyTurnstile } from '../../../lib/turnstile';
import { ensureChatSchema, newToken, sha256Hex, cleanBody } from '../../../lib/chat';

export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/chat/start - public. Opens a live chat.
 * Body: { name, contact (phone or email), message, page?, cf-turnstile-response?, company_website? }
 * Returns { id, token, messages }. The token is the visitor's only key to
 * this conversation; only its hash is stored.
 *
 * Also writes a lead (source chat-widget) so every chat lands in the CRM
 * even if nobody answers it live. Abuse guards: honeypot, Turnstile when
 * configured (missing token -> lead quarantined as needs_review, same as
 * the forms), and max 5 new chats per IP per hour.
 */
export const POST: APIRoute = async ({ request }) => {
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (typeof raw.company_website === 'string' && raw.company_website.trim()) return json({ error: 'bad_request' }, 400);

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 120) : '';
  const contact = typeof raw.contact === 'string' ? raw.contact.trim().slice(0, 200) : '';
  const message = cleanBody(raw.message);
  const page = typeof raw.page === 'string' ? raw.page.slice(0, 300) : '';
  const isEmail = EMAIL.test(contact);
  const digits = contact.replace(/\D/g, '').length;

  const errors: string[] = [];
  if (name.length < 2) errors.push('name');
  if (!isEmail && digits < 7) errors.push('contact');
  if (!message) errors.push('message');
  if (errors.length) return json({ error: 'validation_failed', fields: errors }, 422);

  const ip = request.headers.get('cf-connecting-ip') ?? '';
  let leadStatus = 'new';
  const token = typeof raw['cf-turnstile-response'] === 'string' ? raw['cf-turnstile-response'].trim() : '';
  if (env.TURNSTILE_SECRET_KEY) {
    if (token) {
      if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip))) return json({ error: 'challenge_failed' }, 403);
    } else {
      leadStatus = 'needs_review';
    }
  }

  await ensureChatSchema(env.DB);
  const now = Date.now();
  const ipHash = ip ? await sha256Hex(`chat:${ip}`) : null;
  if (ipHash) {
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM chat_conversations WHERE ip_hash = ?1 AND created_at > ?2`)
      .bind(ipHash, now - 3_600_000).first<{ n: number }>();
    if ((recent?.n ?? 0) >= 5) return json({ error: 'rate_limited' }, 429);
  }

  const id = crypto.randomUUID();
  const leadId = crypto.randomUUID();
  const visitorToken = newToken();
  const tokenHash = await sha256Hex(visitorToken);
  const greeting = `Thanks ${name.split(' ')[0]}! You're through to the Tristate team - someone will reply right here. You can close this window; your chat is saved.`;
  const firstMsgId = crypto.randomUUID();
  const sysMsgId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO leads (id, name, email, phone, service, message, source, referrer, status, created_at)
       VALUES (?1, ?2, ?3, ?4, 'Live chat', ?5, 'chat-widget', ?6, ?7, ?8)`
    ).bind(leadId, name, isEmail ? contact : '', isEmail ? '' : contact, message, page || null, leadStatus, now),
    env.DB.prepare(
      `INSERT INTO chat_conversations (id, token_hash, lead_id, name, contact, page, ip_hash, status, unread_admin, unread_visitor,
                                       last_message_at, last_preview, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'open', 1, 0, ?8, ?9, ?8)`
    ).bind(id, tokenHash, leadId, name, contact, page || null, ipHash, now, message.slice(0, 140)),
    env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_name, body, created_at) VALUES (?1, ?2, 'visitor', ?3, ?4, ?5)`
    ).bind(firstMsgId, id, name, message, now),
    env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_name, body, created_at) VALUES (?1, ?2, 'system', 'Tristate', ?3, ?4)`
    ).bind(sysMsgId, id, greeting, now + 1),
  ]);

  return json({
    ok: true, id, token: visitorToken,
    messages: [
      { id: firstMsgId, sender: 'visitor', author_name: name, body: message, created_at: now },
      { id: sysMsgId, sender: 'system', author_name: 'Tristate', body: greeting, created_at: now + 1 },
    ],
  }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
