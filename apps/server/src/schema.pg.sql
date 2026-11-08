-- Postgres port of schema.sql (M7). Same tables, keys, and constraints; the
-- dialect diffs are:
--   AUTOINCREMENT       -> GENERATED ALWAYS AS IDENTITY (int4: node-pg parses
--                          int4 to a JS number; int8 would arrive as a string)
--   passed INTEGER 0/1  -> BOOLEAN
--   REAL                -> DOUBLE PRECISION (SQLite REAL is an 8-byte IEEE double)
--   invites gains an identity id so "newest first" listing can ORDER BY id
--     where SQLite orders by rowid
--   the identity index is a plain unique index: NULLs are distinct in BOTH
--     engines (SQLite NULL<>NULL, Postgres default NULLS DISTINCT), so no
--     partial-index WHERE clause is needed.
-- Timestamps stay TEXT ISO strings, exactly like the SQLite schema.
-- Every statement is IF NOT EXISTS: this runs on every boot against a
-- persistent cluster (idempotent migration).
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','learner')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  identity_id TEXT,
  email TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local'
);
CREATE UNIQUE INDEX IF NOT EXISTS users_identity_id ON users (identity_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  code TEXT PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  uses_left INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  track TEXT NOT NULL,
  module TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done','in-progress')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  attempt_id TEXT NOT NULL,
  module TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  per_question TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  attempt_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  score_pct DOUBLE PRECISION NOT NULL,
  per_tag TEXT NOT NULL,
  responses TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);

CREATE TABLE IF NOT EXISTS card_states (
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  ease DOUBLE PRECISION NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id)
);

CREATE TABLE IF NOT EXISTS card_reviews (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  ease DOUBLE PRECISION NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_drafts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  exam_id TEXT NOT NULL,
  draft TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, exam_id)
);
