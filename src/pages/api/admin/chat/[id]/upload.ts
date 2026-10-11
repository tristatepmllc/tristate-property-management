import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../../lib/http';
import { ensureChatSchema, checkMedia, addMediaMessage } from '../../../../../lib/chat';

export const prerender = false;

/** POST /api/admin/chat/[id]/upload - staff send a photo or voice note (multipart: file, duration). */
export const POST: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'forbidden' }, 403);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  await ensureChatSchema(env.DB);
  const conv = await env.DB.prepare(`SELECT id, lead_id FROM chat_conversations WHERE id = ?1`).bind(params.id ?? '')
    .first<{ id: string; lead_id: string | null }>();
  if (!conv) return json({ error: 'not_found' }, 404);
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return json({ error: 'validation_failed', fields: ['file'] }, 422);
  const check = checkMedia(file);
  if (!check.ok) return json({ error: 'validation_failed', fields: [check.error] }, 422);
  try {
    const message = await addMediaMessage(env.DB, env.MEDIA, {
      conversationId: conv.id, sender: 'agent', authorId: admin.id, authorName: (admin.name || admin.email).split(' ')[0],
      file, kind: check.kind, type: check.type, durationMs: Number(form.get('duration')) || null,
    });
    if (conv.lead_id) {
      await env.DB.prepare(`UPDATE leads SET status = 'contacted' WHERE id = ?1 AND status IN ('new','needs_review')`).bind(conv.lead_id).run();
    }
    return json({ ok: true, message });
  } catch (e) {
    console.error('admin_chat_upload_failed', String(e).slice(0, 200));
    return json({ error: 'storage_failed' }, 500);
  }
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
