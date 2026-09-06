import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '../../lib/auth';
import { json } from '../../lib/http';

export const prerender = false;

const PROPERTY_TYPES = ['single_family', 'multifamily', 'commercial', 'mixed_use', 'other'] as const;
const CONTACT_METHODS = ['email', 'phone', 'text'] as const;
// Matches the site's actual /services/* categories - keeping this list in
// sync with src/data/site.ts (or wherever that nav is generated) is a manual
// step for now; there is no shared single source of truth between the two.
const TRADES = ['cleaning', 'plumbing', 'electrical', 'hvac', 'handyman', 'painting', 'grounds', 'projects'] as const;

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
};

/**
 * NO_CHANGE exists so a malformed/unexpected value can never overwrite good
 * data with null. There are two genuinely different cases a caller can send
 * for a dropdown or date field, and they must not collapse into one:
 *   - "" (the blank "Select one" option, or a cleared date input) - the user
 *     deliberately wants the field empty. Returns null; the column gets set
 *     to NULL, correctly.
 *   - any other value not in the allowed set (a bug upstream, a stale
 *     client, or someone hand-crafting a request) - NOT the same as "clear
 *     it". Returns NO_CHANGE; the caller below must skip adding the column
 *     to `set` entirely so the existing value survives untouched.
 * Confirmed this distinction was missing before this comment existed: a
 * PATCH with trade: "not-a-real-trade" against a vendor account that had
 * trade: "hvac" set silently wrote NULL over "hvac" - caught in this
 * session's own testing, not before.
 */
const NO_CHANGE = Symbol('no_change');
type NoChange = typeof NO_CHANGE;

const oneOf = <T extends readonly string[]>(v: unknown, allowed: T): T[number] | null | NoChange => {
  if (v === '') return null;
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T[number];
  return NO_CHANGE;
};
const bool01 = (v: unknown): 0 | 1 => (v === true || v === 'true' || v === 'on' || v === 1 ? 1 : 0);
const dateMs = (v: unknown): number | null | NoChange => {
  if (typeof v !== 'string') return NO_CHANGE;
  if (v.trim() === '') return null;
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? NO_CHANGE : ms;
};

/**
 * GET/PATCH /api/me - current account profile.
 * httpOnly session cookie on web; the future mobile app sends
 * `Authorization: Bearer <token>` instead - both are read by
 * `auth.api.getSession`, via the `bearer()` plugin in src/lib/auth.ts.
 */
export const GET: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);
  return json(profileShape(session.user));
};

/**
 * PATCH /api/me - update profile fields for the signed-in account only.
 *
 * Deliberately NOT routed through Better Auth's own update-user endpoint:
 * that endpoint has no concept of "these fields belong to role=vendor,
 * those to role=client" - it would happily let a client account set
 * license_number. This handler decides which field set applies from the
 * account's own role (read from the session, never from the request body),
 * validates each field, and writes only those columns.
 *
 * Fields not present in the request body are left untouched (partial
 * update) - the client-side form only ever sends the fields for its own
 * role's section, but this also means a stray field name in the body from
 * anything else is silently ignored rather than rejected; that is
 * intentional, not an oversight - there is no untrusted-field attack here
 * worth a 400 for, since anything not in the allowed set for the role is
 * dropped either way.
 */
export const PATCH: APIRoute = async ({ request }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json({ error: 'unauthorized' }, 401);

  const user = session.user as typeof session.user & { role?: string };
  const role = user.role === 'vendor' ? 'vendor' : user.role === 'admin' ? 'admin' : 'client';

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const set: Record<string, string | number | null> = {};
  const assign = (key: string, value: string | number | null | NoChange): void => {
    if (value !== NO_CHANGE) set[key] = value;
  };

  // Shared fields, editable regardless of role.
  if ('name' in body) set.name = str(body.name, 120);
  if ('company' in body) set.company = str(body.company, 160);
  if ('phone' in body) set.phone = str(body.phone, 40);

  if (role === 'client') {
    if ('address' in body) set.address = str(body.address, 200);
    if ('city' in body) set.city = str(body.city, 100);
    if ('state' in body) set.state = str(body.state, 40);
    if ('zip' in body) set.zip = str(body.zip, 20);
    if ('propertyType' in body) assign('property_type', oneOf(body.propertyType, PROPERTY_TYPES));
    if ('preferredContact' in body) assign('preferred_contact', oneOf(body.preferredContact, CONTACT_METHODS));
    if ('notes' in body) set.notes = str(body.notes, 1000);
  } else if (role === 'vendor') {
    if ('trade' in body) assign('trade', oneOf(body.trade, TRADES));
    if ('tradesOther' in body) set.trades_other = str(body.tradesOther, 200);
    if ('serviceArea' in body) set.service_area = str(body.serviceArea, 300);
    if ('licenseNumber' in body) set.license_number = str(body.licenseNumber, 80);
    if ('licenseExpires' in body) assign('license_expires', dateMs(body.licenseExpires));
    if ('insuranceOnFile' in body) set.insurance_on_file = bool01(body.insuranceOnFile);
    if ('yearsInBusiness' in body) set.years_in_business = str(body.yearsInBusiness, 40);
    if ('emergencyAvailable' in body) set.emergency_available = bool01(body.emergencyAvailable);
  }
  // role === 'admin': no profile fields of its own yet - shared fields above
  // still apply.

  const columns = Object.keys(set);
  if (columns.length === 0) return json({ error: 'no_fields' }, 400);

  const assignments = columns.map((col, i) => `${col} = ?${i + 1}`).join(', ');
  const values = columns.map((col) => set[col]);
  const now = new Date().toISOString();

  await env.DB.prepare(`UPDATE accounts SET ${assignments}, updated_at = ?${columns.length + 1} WHERE id = ?${columns.length + 2}`)
    .bind(...values, now, user.id)
    .run();

  const refreshed = await getAuth().api.getSession({ headers: request.headers });
  return json(profileShape(refreshed!.user));
};

function profileShape(u: unknown) {
  const user = u as Record<string, unknown>;
  const {
    id, email, name, role, company, phone, createdAt,
    address, city, state, zip, propertyType, preferredContact, notes,
    trade, tradesOther, serviceArea, licenseNumber, licenseExpires,
    insuranceOnFile, yearsInBusiness, emergencyAvailable,
  } = user;
  return {
    id, email, name, role, company, phone, createdAt,
    address, city, state, zip, propertyType, preferredContact, notes,
    trade, tradesOther, serviceArea, licenseNumber, licenseExpires,
    insuranceOnFile, yearsInBusiness, emergencyAvailable,
  };
}

