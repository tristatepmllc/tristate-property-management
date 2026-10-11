import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../../lib/http';
import { ensureChatSchema } from '../../../../lib/chat';

export const prerender = false;

export type ConvRow = {
  id: string; name: string | null; contact: string | null; page: string | null; status: string;
  unread_admin: number; last_message_at: number; last_preview: string | null; lead_id: string | null;
  visitor_seen_at: number | null; created_at: number;
};

/** GET /api/admin/chat?status=open|closed|all - staff with chat access. Newest activity first. */
export const GET: APIRoute = async ({ request, url }) => {
  const admin = await requireAdmin(request.headers, 'messages');
  if (!admin) return json({ error: 'forbidden' }, 403);
  await ensureChatSchema(env.DB);
  const status = url.searchParams.get('status') || 'open';
  const where = status === 'closed' ? `WHERE status = 'closed'` : status === 'all' ? '' : `WHERE status = 'open'`;
  const r = await env.DB.prepare(
    `SELECT id, name, contact, page, status, unread_admin, last_message_at, last_preview, lead_id, visitor_seen_at, created_at
     FROM chat_conversations ${where} ORDER BY last_message_at DESC LIMIT 200`
  ).all<ConvRow>();
  const totals = await env.DB.prepare(
    `SELECT SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
            SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed,
            SUM(unread_admin) AS unread
     FROM chat_conversations`
  ).first<{ open: number | null; closed: number | null; unread: number | null }>();
  return json({
    ok: true,
    conversations: r.results ?? [],
    totals: { open: totals?.open ?? 0, closed: totals?.closed ?? 0, unread: totals?.unread ?? 0 },
  });
};

export const ALL: APIRoute = () => methodNotAllowed('GET');
