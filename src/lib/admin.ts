/**
 * Shared helpers for the admin panel (/admin/*).
 *
 * - Time: every admin date is shown in US Eastern (the business's clock),
 *   always with the zone label, so staff in another country read it right.
 * - Labels: one place for lead statuses and lead sources, so the overview,
 *   lists and detail pages can never disagree.
 * - ensureAdminSchema(): additive schema the admin panel needs (lead notes,
 *   vendor verification, application notes). Runs CREATE IF NOT EXISTS /
 *   ADD COLUMN-if-missing on first use, so nothing has to be run by hand on
 *   remote D1. db/migrations/0008_admin.sql records the same shape.
 */

export const TZ = 'America/New_York';
export const TZ_LABEL = 'ET';

// ---------------------------------------------------------------- time
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

function etParts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year, month: out.month, day: out.day,
    hour: (out.hour ?? 0) % 24, minute: out.minute ?? 0, second: out.second ?? 0,
  };
}

function offsetMs(ms: number): number {
  const p = etParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Start of the ET calendar day containing `ms`, as a UTC timestamp. */
export function etStartOfDay(ms: number): number {
  const p = etParts(ms);
  const guess = Date.UTC(p.year, p.month - 1, p.day);
  return guess - offsetMs(guess);
}

/** YYYY-MM-DD for the ET day containing `ms`. */
export function etDayKey(ms: number): string {
  const p = etParts(ms);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** 0-23, ET. */
export function etHour(ms: number): number {
  return etParts(ms).hour;
}

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ });
export const fmtTime = (ms: number) =>
  `${new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ })} ${TZ_LABEL}`;
export const fmtDateTime = (ms: number) => `${fmtDate(ms)}, ${fmtTime(ms)}`;
export const fmtShortDay = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ });

export function relTime(ms: number, now = Date.now()): string {
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(ms);
}

export const fmtCents = (c: number | null | undefined) =>
  ((c ?? 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ---------------------------------------------------------------- leads
export const LEAD_STATUSES = [
  { value: 'needs_review', label: 'Unverified', tone: 'red' },
  { value: 'new', label: 'New', tone: 'red' },
  { value: 'contacted', label: 'Contacted', tone: 'blue' },
  { value: 'quoted', label: 'Quoted', tone: 'blue' },
  { value: 'won', label: 'Won', tone: 'navy' },
  { value: 'lost', label: 'Lost', tone: 'grey' },
  { value: 'spam', label: 'Spam', tone: 'grey' },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]['value'];
export const LEAD_STATUS_VALUES: readonly string[] = LEAD_STATUSES.map((s) => s.value);
/** Statuses that still need someone to act. */
export const UNHANDLED: readonly string[] = ['needs_review', 'new'];

export function leadStatusLabel(v: string): string {
  return LEAD_STATUSES.find((s) => s.value === v)?.label ?? titleCase(v);
}
export function leadStatusTone(v: string): string {
  return LEAD_STATUSES.find((s) => s.value === v)?.tone ?? 'grey';
}

const SOURCE_LABELS: Record<string, string> = {
  'home-hero-form': 'Homepage form',
  'contact-page-form': 'Contact page',
  'popup-walkthrough': 'Walk-through popup',
  'chat-widget': 'Live chat',
  'client-registration': 'Become a client (call back)',
  'client-registration-account': 'New client account',
  'portal-request-service': 'Client portal request',
  'property-preservation': 'Property preservation page',
  'careers': 'Careers page',
  'vendor-network': 'Vendor network',
};

export function sourceLabel(src: string | null | undefined): string {
  if (!src) return 'Unknown';
  if (SOURCE_LABELS[src]) return SOURCE_LABELS[src];
  const pp = src.match(/^(.+)-property-preservation$/);
  if (pp) return `Preservation: ${titleCase(pp[1].replace(/-/g, ' '))}`;
  return titleCase(src.replace(/[-_]/g, ' '));
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------- jobs
export const JOB_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;
export const JOB_STATUS_VALUES: readonly string[] = JOB_STATUSES.map((s) => s.value);

export const VENDOR_APP_STATUSES = [
  { value: 'needs_review', label: 'Unverified' },
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
] as const;
export const VENDOR_APP_STATUS_VALUES: readonly string[] = VENDOR_APP_STATUSES.map((s) => s.value);

// ---------------------------------------------------------------- input
/** "$1,234.50" / "1234.5" -> 123450 cents, or null when empty/invalid. */
export function dollarsToCents(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100);
  if (typeof v !== 'string') return null;
  const n = Number(v.replace(/[$,\s]/g, ''));
  if (!v.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** "2026-10-14" (from <input type=date>) -> noon ET that day, or null. */
export function dateInputToMs(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split('-').map(Number);
  const noonUtc = Date.UTC(y, m - 1, d, 12);
  return noonUtc - offsetMs(noonUtc) + 0;
}

/** ms -> "YYYY-MM-DD" in ET for <input type=date value>. */
export function msToDateInput(ms: number | null | undefined): string {
  return ms ? etDayKey(ms) : '';
}

// ---------------------------------------------------------------- schema
const DDL = [
  `CREATE TABLE IF NOT EXISTS lead_notes (
    id          TEXT PRIMARY KEY,
    lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    author_id   TEXT,
    author_name TEXT,
    kind        TEXT NOT NULL DEFAULT 'note',
    body        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC)`,
];

const ADD_COLUMNS: { table: string; column: string; type: string }[] = [
  { table: 'accounts', column: 'verified_at', type: 'INTEGER' },
  { table: 'accounts', column: 'verified_by', type: 'TEXT' },
  { table: 'vendors', column: 'admin_notes', type: 'TEXT' },
  { table: 'vendors', column: 'reviewed_at', type: 'INTEGER' },
];

let ensured = false;

export async function ensureAdminSchema(db: D1Database): Promise<void> {
  if (ensured) return;
  for (const sql of DDL) await db.prepare(sql).run();
  const cache = new Map<string, Set<string>>();
  for (const { table, column, type } of ADD_COLUMNS) {
    let cols = cache.get(table);
    if (!cols) {
      const info = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
      cols = new Set((info.results ?? []).map((r) => r.name));
      cache.set(table, cols);
    }
    if (!cols.has(column)) {
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      cols.add(column);
    }
  }
  ensured = true;
}

/** Append an entry to a lead's activity log. Best effort. */
export async function addLeadNote(
  db: D1Database,
  leadId: string,
  author: { id: string; name: string | null; email: string },
  kind: 'note' | 'status' | 'call' | 'system',
  body: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO lead_notes (id, lead_id, author_id, author_name, kind, body, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(crypto.randomUUID(), leadId, author.id, author.name || author.email, kind, body.slice(0, 4000), Date.now())
    .run();
}

/**
 * Better Auth writes its own date columns (accounts.created_at etc.); this
 * app writes epoch ms. Read either shape safely.
 */
export function toMs(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n) && n > 1e11) return n;
    const p = Date.parse(v);
    return Number.isFinite(p) ? p : 0;
  }
  return 0;
}

/** SQL fragment: `col` is on/after a moment, whether stored as ms or ISO text. */
export function sinceSql(col: string, msParam: string, isoParam: string): string {
  return `((typeof(${col}) IN ('integer','real') AND ${col} >= ${msParam}) OR (typeof(${col}) = 'text' AND ${col} >= ${isoParam}))`;
}
