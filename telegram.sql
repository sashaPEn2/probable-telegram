-- Telegram binding + notifications storage for Vercel (Neon Postgres)

-- Binds user record_book_id <-> telegram_user_id via numeric token sent to user in Telegram.

CREATE TABLE IF NOT EXISTS telegram_bind_tokens (
  token TEXT PRIMARY KEY,
  record_book_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_bind_tokens_expires_at ON telegram_bind_tokens (expires_at);

CREATE TABLE IF NOT EXISTS telegram_users (
  telegram_user_id BIGINT PRIMARY KEY,
  record_book_id TEXT NOT NULL,
  telegram_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_record_book_id ON telegram_users (record_book_id);

-- Optional: ensure a record_book_id maps to at most one telegram_user_id.
-- If you want strict one-to-one, uncomment the unique constraint.
--
-- ALTER TABLE telegram_users
--   ADD CONSTRAINT telegram_users_record_book_unique UNIQUE (record_book_id);

