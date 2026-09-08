CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  decided_by TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL
);
