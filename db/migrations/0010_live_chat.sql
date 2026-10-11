-- Two-way live chat. Created automatically on first use by
-- src/lib/chat.ts ensureChatSchema(); recorded here for fresh installs.
CREATE TABLE IF NOT EXISTS chat_conversations (
  id               TEXT PRIMARY KEY,
  token_hash       TEXT NOT NULL,              -- SHA-256 of the visitor's token; the token itself is never stored
  lead_id          TEXT,                       -- the lead row written when the chat started
  name             TEXT,
  contact          TEXT,                       -- phone or email given in the pre-chat
  page             TEXT,                       -- path the chat started on
  ip_hash          TEXT,                       -- SHA-256 of 'chat:'+IP, only for the 5-per-hour limit
  status           TEXT NOT NULL DEFAULT 'open', -- open|closed
  unread_admin     INTEGER NOT NULL DEFAULT 0,
  unread_visitor   INTEGER NOT NULL DEFAULT 0,
  last_message_at  INTEGER NOT NULL,
  last_preview     TEXT,
  visitor_seen_at  INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_conv_last ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conv_ip ON chat_conversations(ip_hash, created_at);
CREATE TABLE IF NOT EXISTS chat_messages (
  id               TEXT PRIMARY KEY,
  conversation_id  TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender           TEXT NOT NULL,              -- visitor|agent|system
  author_id        TEXT,                       -- staff account id for agent messages
  author_name      TEXT,
  body             TEXT NOT NULL,
  created_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id, created_at);

-- Photos and voice notes (applied automatically by ensureChatSchema when missing).
-- Files live in R2 under chat/<conversation_id>/<message_id>.
ALTER TABLE chat_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'; -- text|image|audio
ALTER TABLE chat_messages ADD COLUMN media_key TEXT;
ALTER TABLE chat_messages ADD COLUMN media_type TEXT;
ALTER TABLE chat_messages ADD COLUMN media_size INTEGER;
ALTER TABLE chat_messages ADD COLUMN duration_ms INTEGER;
