/**
 * Two-way live chat between website visitors and staff.
 *
 * Transport is short polling over D1 (visitor: every ~3s while the chat is
 * open, ~20s while closed; admin inbox: every ~3s). That keeps everything on
 * the existing Pages + D1 stack - no separate Worker / Durable Object to
 * deploy - and gives a 2-3 second round trip, which reads as instant in a
 * support chat. If volume ever makes polling expensive, the API shape here
 * (start / send / poll) maps 1:1 onto a WebSocket upgrade later.
 *
 * Visitor identity: starting a chat returns a random 32-byte token that
 * only the visitor's browser holds (localStorage). We store its SHA-256,
 * never the token, so a database read cannot be used to impersonate a
 * visitor. Every visitor call must present id + token.
 *
 * Tables are created on first use (CREATE IF NOT EXISTS), same pattern as
 * lib/admin.ts; db/migrations/0010_live_chat.sql records the shape.
 */

const DDL = [
  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id               TEXT PRIMARY KEY,
    token_hash       TEXT NOT NULL,
    lead_id          TEXT,
    name             TEXT,
    contact          TEXT,
    page             TEXT,
    ip_hash          TEXT,
    status           TEXT NOT NULL DEFAULT 'open',
    unread_admin     INTEGER NOT NULL DEFAULT 0,
    unread_visitor   INTEGER NOT NULL DEFAULT 0,
    last_message_at  INTEGER NOT NULL,
    last_preview     TEXT,
    visitor_seen_at  INTEGER,
    created_at       INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_conv_last ON chat_conversations(last_message_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_conv_ip ON chat_conversations(ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id               TEXT PRIMARY KEY,
    conversation_id  TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender           TEXT NOT NULL,
    author_id        TEXT,
    author_name      TEXT,
    body             TEXT NOT NULL,
    created_at       INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at)`,
];

let ensured = false;
export async function ensureChatSchema(db: D1Database): Promise<void> {
  if (ensured) return;
  for (const sql of DDL) await db.prepare(sql).run();
  ensured = true;
}

export type ChatMessage = {
  id: string;
  sender: 'visitor' | 'agent' | 'system';
  author_name: string | null;
  body: string;
  created_at: number;
};

export const MAX_BODY = 2000;

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function newToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time-ish compare for two hex strings of equal length. */
export function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Conv = { id: string; token_hash: string; status: string };

/** Resolve a visitor's conversation from id + token, or null. */
export async function visitorConversation(db: D1Database, id: string, token: string): Promise<Conv | null> {
  if (!id || !/^[0-9a-f]{64}$/.test(token)) return null;
  const conv = await db.prepare(`SELECT id, token_hash, status FROM chat_conversations WHERE id = ?1`).bind(id).first<Conv>();
  if (!conv) return null;
  return sameHex(conv.token_hash, await sha256Hex(token)) ? conv : null;
}

export function cleanBody(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim().slice(0, MAX_BODY) : '';
}
