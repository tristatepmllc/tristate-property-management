import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { ensureChatSchema, visitorConversation } from '../../../lib/chat';

export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/chat/details - visitor. Saves the name and / or phone-or-email
 * the widget asks for after the chat has opened.
 * Body: { id, token, name?, contact? }. Updates the conversation and its lead.
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

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 120) : '';
  const contact = typeof raw.contact === 'string' ? raw.contact.trim().slice(0, 200) : '';
  const stmts: D1PreparedStatement[] = [];
  const lead = await env.DB.prepare(`SELECT lead_id FROM chat_conversations WHERE id = ?1`).bind(conv.id).first<{ lead_id: string | null }>();

  if (name.length >= 2) {
    stmts.push(env.DB.prepare(`UPDATE chat_conversations SET name = ?1 WHERE id = ?2`).bind(name, conv.id));
    if (lead?.lead_id) stmts.push(env.DB.prepare(`UPDATE leads SET name = ?1 WHERE id = ?2`).bind(name, lead.lead_id));
  }
  if (contact) {
    const isEmail = EMAIL.test(contact);
    if (!isEmail && contact.replace(/\D/g, '').length < 7) return json({ error: 'validation_failed', fields: ['contact'] }, 422);
    stmts.push(env.DB.prepare(`UPDATE chat_conversations SET contact = ?1 WHERE id = ?2`).bind(contact, conv.id));
    if (lead?.lead_id) {
      stmts.push(
        isEmail
          ? env.DB.prepare(`UPDATE leads SET email = ?1 WHERE id = ?2`).bind(contact, lead.lead_id)
          : env.DB.prepare(`UPDATE leads SET phone = ?1 WHERE id = ?2`).bind(contact, lead.lead_id)
      );
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
