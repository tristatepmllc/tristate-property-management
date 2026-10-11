import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, methodNotAllowed } from '../../../lib/http';
import { ensureChatSchema, visitorConversation, checkMedia, addMediaMessage } from '../../../lib/chat';

export const prerender = false;

/**
 * POST /api/chat/upload - visitor sends a photo or voice note.
 * multipart/form-data: id, token, file, duration (ms, voice only).
 * Images up to 8 MB, voice up to 6 MB; same 15-per-minute limit as text.
 */
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  await ensureChatSchema(env.DB);
  const conv = await visitorConversation(env.DB, String(form.get('id') ?? ''), String(form.get('token') ?? ''));
  if (!conv) return json({ error: 'not_found' }, 404);
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return json({ error: 'validation_failed', fields: ['file'] }, 422);
  const check = checkMedia(file);
  if (!check.ok) return json({ error: 'validation_failed', fields: [check.error] }, 422);

  const burst = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ?1 AND sender = 'visitor' AND created_at > ?2`
  ).bind(conv.id, Date.now() - 60_000).first<{ n: number }>();
  if ((burst?.n ?? 0) >= 15) return json({ error: 'rate_limited' }, 429);

  try {
    const message = await addMediaMessage(env.DB, env.MEDIA, {
      conversationId: conv.id, sender: 'visitor', file, kind: check.kind, type: check.type,
      durationMs: Number(form.get('duration')) || null,
    });
    return json({ ok: true, message });
  } catch (e) {
    console.error('chat_upload_failed', String(e).slice(0, 200));
    return json({ error: 'storage_failed' }, 500);
  }
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
