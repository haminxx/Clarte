-- Cache Exa search responses so a repeated voice query does not pay twice.
-- Citations for live hits store source and type here because those rows are
-- not in the documents graph.

CREATE TABLE IF NOT EXISTS exa_cache (
  cache_key  TEXT PRIMARY KEY,
  query      TEXT NOT NULL,
  payload    TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE citations ADD COLUMN source TEXT;
ALTER TABLE citations ADD COLUMN type TEXT;
