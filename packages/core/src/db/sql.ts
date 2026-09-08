export const FOUNDATION_SQL = `
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  role TEXT NOT NULL,
  email TEXT UNIQUE,
  email_verified_at INTEGER,
  display_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_initial TEXT,
  avatar_seed TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE TABLE IF NOT EXISTS magic_links (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  grade_level TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  comments_enabled INTEGER NOT NULL DEFAULT 1,
  archived_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS class_members (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS class_members_class_user ON class_members (class_id, user_id);
CREATE TABLE IF NOT EXISTS guardian_links (
  id TEXT PRIMARY KEY,
  guardian_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS guardian_links_pair ON guardian_links (guardian_id, student_id);
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  guardian_id TEXT,
  school_id TEXT NOT NULL,
  type TEXT NOT NULL,
  granted INTEGER NOT NULL,
  source TEXT NOT NULL,
  recorded_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE TABLE IF NOT EXISTS privacy_prefs (
  user_id TEXT PRIMARY KEY,
  photo_opt_out INTEGER NOT NULL DEFAULT 0,
  yolo INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  child_ids TEXT,
  event_at INTEGER,
  pinned INTEGER NOT NULL DEFAULT 0,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  media_key TEXT
);
CREATE TABLE IF NOT EXISTS day_plans (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  happening TEXT,
  bring TEXT,
  updated_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS day_plans_class_day ON day_plans (class_id, day);
CREATE TABLE IF NOT EXISTS day_updates (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  school_id TEXT,
  details TEXT,
  ip_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bug_reports (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  role TEXT,
  path TEXT,
  body TEXT NOT NULL,
  sha TEXT,
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
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
`;

export const BUG_REPORT_ALTERS = [
  "ALTER TABLE bug_reports ADD COLUMN role TEXT",
  "ALTER TABLE bug_reports ADD COLUMN path TEXT",
  "ALTER TABLE bug_reports ADD COLUMN sha TEXT",
];

export const EXTRA_TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS dm_requests (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  guardian_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS excursion_asks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  decided_by TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL
)`,
];

export const POST_MEDIA_ALTERS = [
  "ALTER TABLE posts ADD COLUMN media_key TEXT",
];

export const BUG_STATUS_ALTERS = [
  "ALTER TABLE bug_reports ADD COLUMN status TEXT DEFAULT 'open'",
];

export function foundationStatements(): string[] {
  return FOUNDATION_SQL.split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
