-- Clarte data model — plan section 6.4.
-- Every row in `documents` is one node of the knowledge graph; the Vectorize
-- index `paber-docs` (cosine) uses `documents.id` as the vector id.

CREATE TABLE IF NOT EXISTS documents (
  id             TEXT PRIMARY KEY,           -- "<source>:<source_id>", e.g. "arxiv:2403.01234"
  source         TEXT NOT NULL,              -- nasa_t2 | ntrs | arxiv | europepmc | patentsview | openalex
  source_id      TEXT NOT NULL,
  type           TEXT NOT NULL,              -- paper | patent | report | software | spinoff
  title          TEXT NOT NULL,
  abstract       TEXT,
  summary        TEXT,                       -- Gemma 4
  domains        TEXT,                       -- JSON array of Gemma 4 domain tags
  url            TEXT,
  published      TEXT,
  center         TEXT,                       -- NASA center / publishing organisation
  license_status TEXT,                       -- e.g. "Licensable (NASA T2)", "arXiv preprint"
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (type);
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents (source);

-- Top-5 similarity edges per document, written by the ingest script.
-- `reason` is Gemma 4's one-line explanation of the link (plan section 6.3, find_related).
CREATE TABLE IF NOT EXISTS edges (
  src          TEXT NOT NULL,
  dst          TEXT NOT NULL,
  weight       REAL NOT NULL DEFAULT 0.5,
  reason       TEXT,
  cross_domain INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (src, dst)
);

CREATE INDEX IF NOT EXISTS idx_edges_src ON edges (src);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges (dst);

-- One voice brainstorming conversation.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  stage      TEXT NOT NULL DEFAULT 'five_whys',  -- five_whys | why_how_what | debate
  root_cause TEXT,
  idea_json  TEXT,                                -- final idea card
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents the coach touched, in order. The website polls this to light up nodes.
CREATE TABLE IF NOT EXISTS mentions (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  doc_id     TEXT NOT NULL,
  ts         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mentions_session ON mentions (session_id, seq);
