CREATE TABLE IF NOT EXISTS drafts (
  path TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  version TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  saved_by TEXT NOT NULL
);
