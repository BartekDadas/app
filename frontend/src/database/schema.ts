export const CREATE_TABLES = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS texts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  sentence_count INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sentences (
  id TEXT PRIMARY KEY,
  text_id TEXT NOT NULL,
  sentence_ko TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  romanization TEXT,
  reference_meaning TEXT,
  key_points TEXT, -- stored as JSON string
  difficulty_level TEXT DEFAULT 'A1',
  analyzed INTEGER DEFAULT 0, -- 0=false, 1=true
  FOREIGN KEY (text_id) REFERENCES texts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  sentence_id TEXT NOT NULL,
  text_id TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  passed INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sentence_id) REFERENCES sentences (id) ON DELETE CASCADE,
  FOREIGN KEY (text_id) REFERENCES texts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_points INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  sentences_completed INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO user_stats (user_id) VALUES ('default_user');
`;
