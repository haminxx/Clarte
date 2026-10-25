-- Clarte plan sections 6.4 and 6.6.
-- documents.url stays the canonical source URL (NASA T2 page, NTRS citation,
-- arXiv abs page, DOI). Do not add a second URL column.

ALTER TABLE sessions ADD COLUMN vapi_call_id TEXT;
ALTER TABLE sessions ADD COLUMN user_id TEXT;
ALTER TABLE sessions ADD COLUMN transcript_json TEXT;

CREATE TABLE IF NOT EXISTS citations (
  session_id TEXT NOT NULL,
  doc_id     TEXT NOT NULL,
  url        TEXT,
  title      TEXT,
  stage      TEXT,
  ts         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (session_id, doc_id)
);

CREATE INDEX IF NOT EXISTS idx_citations_session ON citations (session_id);

-- kind: concept | system_diagram | paper_figure | video
-- image_url may be temporary (Grok Imagine) or null for the video stub.
CREATE TABLE IF NOT EXISTS visuals (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  kind       TEXT NOT NULL,
  prompt     TEXT,
  image_url  TEXT,
  model      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visuals_session ON visuals (session_id);

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email      TEXT,
  name       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);

-- provider is 'xai'. ciphertext is AES-GCM. The plaintext key is never returned.
CREATE TABLE IF NOT EXISTS user_keys (
  user_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  iv         TEXT NOT NULL,
  last4      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);
