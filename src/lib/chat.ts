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

// Media columns (images / voice notes), added after the first release -
// applied only when PRAGMA shows them missing.
const MEDIA_COLUMNS: [string, string][] = [
  ['kind', "TEXT NOT NULL DEFAULT 'text'"],
  ['media_key', 'TEXT'],
  ['media_type', 'TEXT'],
  ['media_size', 'INTEGER'],
  ['duration_ms', 'INTEGER'],
];

let ensured = false;
export async function ensureChatSchema(db: D1Database): Promise<void> {
  if (ensured) return;
  for (const sql of DDL) await db.prepare(sql).run();
  const info = await db.prepare(`PRAGMA table_info(chat_messages)`).all<{ name: string }>();
  const have = new Set((info.results ?? []).map((r) => r.name));
  for (const [col, type] of MEDIA_COLUMNS) {
    if (!have.has(col)) await db.prepare(`ALTER TABLE chat_messages ADD COLUMN ${col} ${type}`).run();
  }
  ensured = true;
}

export type ChatMessage = {
  id: string;
  sender: 'visitor' | 'agent' | 'system';
  author_name: string | null;
  body: string;
  created_at: number;
  kind?: 'text' | 'image' | 'audio';
  media_type?: string | null;
  duration_ms?: number | null;
};

/** Columns every message query selects (media bytes are fetched separately). */
export const MSG_COLS = 'id, sender, author_name, body, created_at, kind, media_type, duration_ms';

// ---------------------------------------------------------------- media
export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);
export const AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/wav']);
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_AUDIO = 6 * 1024 * 1024;

/** 'audio/webm;codecs=opus' -> 'audio/webm' */
export function baseType(t: string): string {
  return (t || '').split(';')[0].trim().toLowerCase();
}

export function checkMedia(file: File): { ok: true; kind: 'image' | 'audio'; type: string } | { ok: false; error: string } {
  const type = baseType(file.type);
  if (IMAGE_TYPES.has(type)) {
    return file.size > MAX_IMAGE ? { ok: false, error: 'Image is larger than 8 MB' } : { ok: true, kind: 'image', type };
  }
  if (AUDIO_TYPES.has(type)) {
    return file.size > MAX_AUDIO ? { ok: false, error: 'Voice message is too long' } : { ok: true, kind: 'audio', type };
  }
  return { ok: false, error: 'Only photos and voice messages can be sent' };
}

/**
 * Store an image / voice note and add it to the conversation as a message.
 * Updates unread counters and the list preview the same way a text does.
 */
export async function addMediaMessage(
  db: D1Database,
  bucket: R2Bucket,
  opts: {
    conversationId: string; sender: 'visitor' | 'agent'; authorId?: string | null; authorName?: string | null;
    file: File; kind: 'image' | 'audio'; type: string; durationMs?: number | null;
  }
): Promise<ChatMessage> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const key = `chat/${opts.conversationId}/${id}`;
  await bucket.put(key, opts.file.stream(), { httpMetadata: { contentType: opts.type } });
  const preview = opts.kind === 'image' ? 'Photo' : 'Voice message';
  const duration = opts.durationMs && opts.durationMs > 0 ? Math.min(Math.round(opts.durationMs), 600_000) : null;
  await db.batch([
    db.prepare(
      `INSERT INTO chat_messages (id, conversation_id, sender, author_id, author_name, body, created_at, kind, media_key, media_type, media_size, duration_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, '', ?6, ?7, ?8, ?9, ?10, ?11)`
    ).bind(id, opts.conversationId, opts.sender, opts.authorId ?? null, opts.authorName ?? null, now, opts.kind, key, opts.type, opts.file.size, duration),
    opts.sender === 'visitor'
      ? db.prepare(
          `UPDATE chat_conversations SET unread_admin = unread_admin + 1, last_message_at = ?1, last_preview = ?2, status = 'open' WHERE id = ?3`
        ).bind(now, preview, opts.conversationId)
      : db.prepare(
          `UPDATE chat_conversations SET unread_visitor = unread_visitor + 1, unread_admin = 0, last_message_at = ?1, last_preview = ?2, status = 'open' WHERE id = ?3`
        ).bind(now, `You: ${preview}`, opts.conversationId),
  ]);
  return { id, sender: opts.sender, author_name: opts.authorName ?? null, body: '', created_at: now, kind: opts.kind, media_type: opts.type, duration_ms: duration };
}

/** Stream a stored chat file with safe headers. */
export async function serveMedia(bucket: R2Bucket, key: string, type: string | null): Promise<Response | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  const t = baseType(type || '');
  const safe = IMAGE_TYPES.has(t) || AUDIO_TYPES.has(t) ? t : 'application/octet-stream';
  return new Response(obj.body, {
    headers: {
      'content-type': safe,
      'content-length': String(obj.size),
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, max-age=3600',
      'content-security-policy': "default-src 'none'; sandbox",
    },
  });
}

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
