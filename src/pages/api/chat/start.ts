import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { verifyTurnstile } from '../../../lib/turnstile';
import { ensureChatSchema, newToken, sha256Hex, cleanBody } from '../../../lib/chat';

export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/chat/start - public. Opens a live chat.
 * Body: { message (or media:true), name?, contact? (phone or email), page?, cf-turnstile-response?, company_website? }
 * Returns { id, token, messages }. The token is the visitor's only key to
 * this conversation; only its hash is stored.
 *
 * Also writes a lead (source chat-widget) so every chat lands in the CRM
 * even if nobody answers it live. Abuse guards: honeypot, Turnstile when
 * configured (missing token -> lead quarantined as needs_review, same as
 * the forms), and max 10 new chats per IP per hour.
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

  // Name / contact are optional now: the chat opens on the very first
  // message (or photo / voice note) and the widget asks for them inside the
  // live chat afterwards (saved via /api/chat/details).
  const hasContact = isEmail || digits >= 7;
  const media = raw.media === true;
  if (!message && !media) return json({ error: 'validation_failed', fields: ['message'] }, 422);
  const displayName = name.length >= 2 ? name : '';

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
    if ((recent?.n ?? 0) >= 10) return json({ error: 'rate_limited' }, 429);
  }

  const id = crypto.randomUUID();
  const leadId = crypto.randomUUID();
  const visitorToken = newToken();
  const tokenHash = await sha256Hex(visitorToken);
  const greeting = displayName
    ? `Thanks ${displayName.split(' ')[0]}! You're through to the Tristate team - someone will reply right here. You can close this window; your chat is saved.`
    : `You're through to the Tristate team - someone will reply right here, usually within minutes. You can close this window; your chat is saved.`;
  const preview = message ? message.slice(0, 140) : 'New chat';
  const leadName = displayName || 'Website visitor';
  const leadContact = hasContact ? contact : '';
  const firstMsgId = crypto.randomUUID();
  const sysMsgId = crypto.randomUUID();

  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO leads (id, name, email, phone, service, message, source, referrer, status, created_at)
       VALUES (?1, ?2, ?3, ?4, 'Live chat', ?5, 'chat-widget', ?6, ?7, ?8)`
    ).bind(leadId, leadName, isEmail ? leadContact : '', isEmail ? '' : leadContact, message || '(photo / voice message)', page || null, leadStatus, now),
    env.DB.prepare(
      `INSERT INTO chat_conversations (id, token_hash, lead_id, name, contact, page, ip_hash, status, unread_admin, unread_visitor,
                                       last_message_at, last_preview, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'open', ?10, 0, ?8, ?9, ?8)`
    ).bind(id, tokenHash, leadId, displayName || null, leadContact || null, page || null, ipHash, now, preview, message ? 1 : 0),
  ];
  if (message) {
    stmts.push(env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_name, body, created_at) VALUES (?1, ?2, 'visitor', ?3, ?4, ?5)`
    ).bind(firstMsgId, id, displayName || null, message, now));
  }
  stmts.push(env.DB.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_name, body, created_at) VALUES (?1, ?2, 'system', 'Tristate', ?3, ?4)`
    ).bind(sysMsgId, id, greeting, now + 1));
  await env.DB.batch(stmts);

  return json({
    ok: true, id, token: visitorToken,
    needs: { name: !displayName, contact: !hasContact },
    messages: [
      ...(message ? [{ id: firstMsgId, sender: 'visitor', author_name: displayName || null, body: message, created_at: now }] : []),
      { id: sysMsgId, sender: 'system', author_name: 'Tristate', body: greeting, created_at: now + 1 },
    ],
  }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
