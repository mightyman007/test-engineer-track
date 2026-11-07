CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','learner')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
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
  passed INTEGER NOT NULL,
  score_pct REAL NOT NULL,
  per_tag TEXT NOT NULL,
  responses TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);
CREATE TABLE IF NOT EXISTS card_states (
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  ease REAL NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS card_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  ease REAL NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
