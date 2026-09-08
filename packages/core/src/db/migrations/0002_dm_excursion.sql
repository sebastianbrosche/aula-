CREATE TABLE IF NOT EXISTS dm_requests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  guardian_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS excursion_asks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
