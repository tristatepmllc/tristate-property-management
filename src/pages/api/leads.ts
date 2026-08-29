import type { APIRoute } from 'astro';
import { validateLead } from '../../lib/validate';
import { verifyTurnstile } from '../../lib/turnstile';
import { sendEmail, escapeHtml } from '../../lib/email';
import { json, methodNotAllowed } from '../../lib/http';

export const prerender = false;

/**
 * POST /api/leads
 * Accepts JSON or form-encoded. Same endpoint serves the website and the future mobile app.
 * Order matters: validate -> anti-spam -> WRITE TO D1 -> notify.
 * The DB write happens before the email so a Resend failure never loses a lead.
 */
export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = locals.runtime.env;

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

  // Honeypot — bots fill hidden fields, humans do not.
  if (typeof raw.company_website === 'string' && raw.company_website.trim() !== '') {
    return json({ ok: true }); // pretend success, drop silently
  }

  const parsed = validateLead(raw);
  if (!parsed.ok) return json({ error: 'validation_failed', fields: parsed.errors }, 422);

  const token = typeof raw['cf-turnstile-response'] === 'string' ? raw['cf-turnstile-response'] : undefined;
  if (env.TURNSTILE_SECRET_KEY) {
    const passed = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, clientAddress);
    if (!passed) return json({ error: 'challenge_failed' }, 403);
  }

  const lead = parsed.value;
  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO leads (id, name, email, phone, company, address, service, urgency,
                          building, message, source, utm_source, utm_medium, utm_campaign,
                          referrer, status, created_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,'new',?16)`
    ).bind(
      id, lead.name, lead.email, lead.phone,
      lead.company ?? null, lead.address ?? null, lead.service ?? null, lead.urgency ?? null,
      lead.building ?? null, lead.message ?? null, lead.source ?? null,
      lead.utm_source ?? null, lead.utm_medium ?? null, lead.utm_campaign ?? null,
      request.headers.get('referer'), now
    ).run();
  } catch (e) {
    console.error('lead_insert_failed', e);
    return json({ error: 'storage_failed' }, 500);
  }

  if (env.RESEND_API_KEY && env.LEAD_NOTIFY_TO) {
    const rows = Object.entries({
      Name: lead.name, Email: lead.email, Phone: lead.phone,
      Company: lead.company, Address: lead.address, Service: lead.service,
      Urgency: lead.urgency, Building: lead.building, Details: lead.message,
      Source: lead.source,
    })
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5D6E85">${k}</td><td>${escapeHtml(String(v))}</td></tr>`)
      .join('');

    await sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.LEAD_NOTIFY_FROM,
      to: env.LEAD_NOTIFY_TO,
      replyTo: lead.email,
      subject: `New quote request — ${lead.name}${lead.urgency ? ` (${lead.urgency})` : ''}`,
      html: `<h2 style="font-family:Arial">New lead from the website</h2>
             <table style="font-family:Arial;font-size:14px;border-collapse:collapse">${rows}</table>
             <p style="color:#8798AC;font-size:12px">Lead ID ${id}</p>`,
    });
  }

  return json({ ok: true, id }, 201);
};

export const ALL: APIRoute = () => methodNotAllowed('POST');
