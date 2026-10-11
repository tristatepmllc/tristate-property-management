import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../lib/require-admin';
import { json, methodNotAllowed } from '../../../lib/http';
import { dollarsToCents } from '../../../lib/admin';

export const prerender = false;

/**
 * POST /api/admin/cashback - admin only. Manual ledger entry for a client.
 * Body: { accountId, amount: "$", direction: 'earn'|'redeem', reason, jobId? }
 * Append-only: corrections are a new opposite entry, never an edit.
 * A redeem larger than the balance is refused.
 */
export const POST: APIRoute = async ({ request }) => {
  const admin = await requireAdmin(request.headers, 'clients.edit');
  if (!admin) return json({ error: 'forbidden' }, 403);

  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const accountId = typeof b.accountId === 'string' ? b.accountId : '';
  const cents = dollarsToCents(b.amount);
  const direction = b.direction === 'redeem' ? 'redeem' : 'earn';
  const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 200) : '';
  const jobId = typeof b.jobId === 'string' && b.jobId ? b.jobId : null;

  const errors: string[] = [];
  if (!cents || cents <= 0) errors.push('amount');
  if (!reason) errors.push('reason');
  if (errors.length) return json({ error: 'validation_failed', fields: errors }, 422);

  const acc = await env.DB.prepare(`SELECT id, role FROM accounts WHERE id = ?1`).bind(accountId).first<{ id: string; role: string }>();
  if (!acc || acc.role !== 'client') return json({ error: 'not_found' }, 404);

  if (direction === 'redeem') {
    const bal = await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS c FROM cashback_ledger WHERE account_id = ?1`)
      .bind(acc.id).first<{ c: number }>();
    if ((bal?.c ?? 0) < (cents ?? 0)) return json({ error: 'validation_failed', fields: ['amount is more than the balance'] }, 422);
  }

  await env.DB.prepare(
    `INSERT INTO cashback_ledger (id, account_id, job_id, amount_cents, reason, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(crypto.randomUUID(), acc.id, jobId, direction === 'redeem' ? -(cents ?? 0) : cents, `${reason} (by ${admin.name || admin.email})`, Date.now()).run();
  return json({ ok: true });
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
