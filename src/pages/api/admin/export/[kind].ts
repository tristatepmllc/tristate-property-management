import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { requireAdmin } from '../../../../lib/require-admin';
import { json } from '../../../../lib/http';
import { fmtDateTime, sourceLabel, leadStatusLabel, toMs } from '../../../../lib/admin';

export const prerender = false;

/**
 * GET /api/admin/export/{leads|clients|jobs|vendors} - CSV download for
 * staff with the 'export' permission (owner, manager). Dates in ET.
 * Cells starting with = + - @ are prefixed with ' so a spreadsheet never
 * runs them as formulas (CSV injection).
 */
const cell = (v: unknown): string => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (head: string[], rows: unknown[][]) =>
  '﻿' + [head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
const when = (v: unknown) => (toMs(v) ? fmtDateTime(toMs(v)) : '');

export const GET: APIRoute = async ({ request, params }) => {
  const admin = await requireAdmin(request.headers, 'export');
  if (!admin) return json({ error: 'forbidden' }, 403);

  const kind = params.kind;
  let csv = '';
  if (kind === 'leads') {
    const r = await env.DB.prepare(
      `SELECT created_at, name, phone, email, company, address, service, urgency, source, status, message, utm_source, utm_campaign
       FROM leads ORDER BY created_at DESC LIMIT 20000`
    ).all<Record<string, unknown>>();
    csv = toCsv(
      ['Received (ET)', 'Name', 'Phone', 'Email', 'Company', 'Address', 'Service', 'Urgency', 'Source', 'Status', 'Message', 'UTM source', 'UTM campaign'],
      (r.results ?? []).map((x) => [when(x.created_at), x.name, x.phone, x.email, x.company, x.address, x.service, x.urgency,
        sourceLabel(x.source as string | null), leadStatusLabel(String(x.status)), x.message, x.utm_source, x.utm_campaign])
    );
  } else if (kind === 'clients') {
    const r = await env.DB.prepare(
      `SELECT a.name, a.company, a.email, a.phone, a.address, a.city, a.state, a.zip, a.property_type, a.created_at,
              (SELECT COUNT(*) FROM jobs j WHERE j.account_id = a.id) AS jobs,
              (SELECT SUM(amount_cents) FROM jobs j WHERE j.account_id = a.id AND j.status = 'completed') AS billed
       FROM accounts a WHERE a.role = 'client' ORDER BY a.rowid DESC`
    ).all<Record<string, unknown>>();
    csv = toCsv(
      ['Name', 'Company', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Property type', 'Joined (ET)', 'Jobs', 'Billed ($)'],
      (r.results ?? []).map((x) => [x.name, x.company, x.email, x.phone, x.address, x.city, x.state, x.zip, x.property_type,
        when(x.created_at), x.jobs, ((Number(x.billed) || 0) / 100).toFixed(2)])
    );
  } else if (kind === 'jobs') {
    const r = await env.DB.prepare(
      `SELECT j.created_at, j.service, j.description, j.status, j.vendor_response, j.scheduled_at, j.completed_at, j.amount_cents,
              j.invoice_status, j.invoice_amount_cents, c.name AS client, c.email AS client_email, COALESCE(v.company, v.name) AS vendor
       FROM jobs j LEFT JOIN accounts c ON c.id = j.account_id LEFT JOIN accounts v ON v.id = j.vendor_id
       ORDER BY j.created_at DESC LIMIT 20000`
    ).all<Record<string, unknown>>();
    csv = toCsv(
      ['Created (ET)', 'Service', 'Description', 'Status', 'Vendor response', 'Scheduled (ET)', 'Completed (ET)', 'Price ($)',
        'Invoice status', 'Invoice ($)', 'Client', 'Client email', 'Vendor'],
      (r.results ?? []).map((x) => [when(x.created_at), x.service, x.description, x.status, x.vendor_response, when(x.scheduled_at),
        when(x.completed_at), x.amount_cents != null ? (Number(x.amount_cents) / 100).toFixed(2) : '', x.invoice_status,
        x.invoice_amount_cents != null ? (Number(x.invoice_amount_cents) / 100).toFixed(2) : '', x.client, x.client_email, x.vendor])
    );
  } else if (kind === 'vendors') {
    const r = await env.DB.prepare(
      `SELECT created_at, name, business, email, phone, trade, license_number, area, credentials, years, status FROM vendors ORDER BY created_at DESC`
    ).all<Record<string, unknown>>();
    csv = toCsv(
      ['Applied (ET)', 'Name', 'Business', 'Email', 'Phone', 'Trade', 'Licence', 'Area', 'Credentials', 'Years', 'Status'],
      (r.results ?? []).map((x) => [when(x.created_at), x.name, x.business, x.email, x.phone, x.trade, x.license_number, x.area,
        x.credentials, x.years, x.status])
    );
  } else {
    return json({ error: 'not_found' }, 404);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="tristate-${kind}-${stamp}.csv"`,
      'cache-control': 'no-store',
    },
  });
};
