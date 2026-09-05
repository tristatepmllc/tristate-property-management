import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateVendor } from '../../lib/validate';
import { verifyTurnstile } from '../../lib/turnstile';
import { sendEmail, escapeHtml } from '../../lib/email';
import { json, methodNotAllowed } from '../../lib/http';

export const prerender = false;

/**
 * POST /api/vendors
 * Trade-partner applications for the vendor network.
 *
 * Same order and same anti-spam posture as /api/leads: validate -> honeypot ->
 * Turnstile -> WRITE TO D1 -> notify. It writes to `vendors`, not `leads`, so
 * supplier applications never inflate the lead pipeline or the source report.
 */
export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('cf-connecting-ip') ?? undefined;

  let raw: Record<string, unknown>;
  const ctype = request.headers.get('content-type') ?? '';
  try {
    if (ctype.includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      raw = Object.fromEntries(await request.formData());
    }
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  // Honeypot - bots fill hidden fields, humans do not.
  if (typeof raw.company_website === 'string' && raw.company_website.trim() !== '') {
    return json({ ok: true });
  }

  const parsed = validateVendor(raw);
  if (!parsed.ok) return json({ error: 'validation_failed', fields: parsed.errors }, 422);

  // A wrong token is a hard reject; a missing one is quarantined rather than
  // dropped, because challenges.cloudflare.com is blocked on some networks.
  const token = typeof raw['cf-turnstile-response'] === 'string' ? raw['cf-turnstile-response'].trim() : '';
  let status = 'new';
  if (env.TURNSTILE_SECRET_KEY) {
    if (token) {
      const passed = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, ip);
      if (!passed) return json({ error: 'challenge_failed' }, 403);
    } else {
      status = 'needs_review';
    }
  }

  const v = parsed.value;
  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO vendors (id, name, business, email, phone, address, trade, trades_other,
                            area, credentials, years, notes, source, referrer, status, created_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`
    ).bind(
      id, v.name, v.business ?? null, v.email, v.phone, v.address ?? null,
      v.trade, v.tradesOther ?? null, v.area ?? null, v.credentials ?? null,
      v.years ?? null, v.notes ?? null, v.source ?? null,
      request.headers.get('referer'), status, now
    ).run();
  } catch (e) {
    console.error('vendor_insert_failed', e);
    return json({ error: 'storage_failed' }, 500);
  }

  if (env.RESEND_API_KEY && env.LEAD_NOTIFY_TO) {
    const rows = Object.entries({
      Name: v.name, Business: v.business, Email: v.email, Phone: v.phone,
      Address: v.address, Trade: v.trade, 'Other trades': v.tradesOther,
      'Area covered': v.area, 'Licence / insurance': v.credentials,
      'Years trading': v.years, Notes: v.notes, Source: v.source,
    })
      .filter(([, val]) => val)
      .map(([k, val]) => `<tr><td style="padding:4px 12px 4px 0;color:#5D6E85">${k}</td><td>${escapeHtml(String(val))}</td></tr>`)
      .join('');

    const sent = await sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.LEAD_NOTIFY_FROM,
      to: env.LEAD_NOTIFY_TO,
      replyTo: v.email,
      subject: `${status === 'needs_review' ? '[unverified] ' : ''}Vendor application - ${v.trade} - ${v.business || v.name}`,
      html: `<h2 style="font-family:Arial">New vendor network application</h2>
             ${status === 'needs_review' ? '<p style="font-family:Arial;color:#A9161C"><strong>Spam check did not run</strong> - the applicant could not load Turnstile. Treat with normal caution.</p>' : ''}
             <table style="font-family:Arial;font-size:14px;border-collapse:collapse">${rows}</table>
             <p style="color:#8798AC;font-size:12px">Vendor ID ${id}. Licence and insurance above are self-declared - collect certificates before the first job.</p>`,
    });

    // Same reasoning as the lead route: the send is best-effort and must never
    // fail the request, but a silently dropped notification is indistinguishable
    // from no application having arrived.
    if (!sent.ok) console.error('vendor_notify_failed', { id, error: sent.error });
  } else {
    console.warn('vendor_notify_skipped', { id, reason: 'RESEND_API_KEY or LEAD_NOTIFY_TO not set' });
  }

  return json({ ok: true, id, status }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
