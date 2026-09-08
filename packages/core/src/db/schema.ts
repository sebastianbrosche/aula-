import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  locale: text("locale").notNull().default("pt-PT"),
  timezone: text("timezone").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  schoolId: text("school_id"),
  role: text("role").notNull(),
  email: text("email").unique(),
  emailVerifiedAt: integer("email_verified_at"),
  displayName: text("display_name").notNull(),
  firstName: text("first_name").notNull(),
  lastInitial: text("last_initial"),
  avatarSeed: text("avatar_seed").notNull(),
  locale: text("locale").notNull().default("pt-PT"),
  createdAt: integer("created_at").notNull(),
  deletedAt: integer("deleted_at"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
});

export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  schoolId: text("school_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject"),
  gradeLevel: text("grade_level"),
  inviteCode: text("invite_code").notNull().unique(),
  commentsEnabled: integer("comments_enabled").notNull().default(1),
  archivedAt: integer("archived_at"),
  createdAt: integer("created_at").notNull(),
});

export const classMembers = sqliteTable(
  "class_members",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    joinedAt: integer("joined_at").notNull(),
  },
  (table) => [
    uniqueIndex("class_members_class_user").on(table.classId, table.userId),
  ],
);

export const guardianLinks = sqliteTable(
  "guardian_links",
  {
    id: text("id").primaryKey(),
    guardianId: text("guardian_id").notNull(),
    studentId: text("student_id").notNull(),
    relationship: text("relationship").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("guardian_links_pair").on(table.guardianId, table.studentId),
  ],
);

export const consents = sqliteTable("consents", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  guardianId: text("guardian_id"),
  schoolId: text("school_id").notNull(),
  type: text("type").notNull(),
  granted: integer("granted").notNull(),
  source: text("source").notNull(),
  recordedAt: integer("recorded_at").notNull(),
  revokedAt: integer("revoked_at"),
});

export const privacyPrefs = sqliteTable("privacy_prefs", {
  userId: text("user_id").primaryKey(),
  photoOptOut: integer("photo_opt_out").notNull().default(0),
  yolo: integer("yolo").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  authorId: text("author_id").notNull(),
  type: text("type").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  childIds: text("child_ids"),
  eventAt: integer("event_at"),
  pinned: integer("pinned").notNull().default(0),
  allowComments: integer("allow_comments").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  deletedAt: integer("deleted_at"),
  mediaKey: text("media_key"),
});

export const dayPlans = sqliteTable(
  "day_plans",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").notNull(),
    day: text("day").notNull(),
    happening: text("happening"),
    bring: text("bring"),
    updatedBy: text("updated_by").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("day_plans_class_day").on(table.classId, table.day)],
);

export const dayUpdates = sqliteTable("day_updates", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  day: text("day").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  schoolId: text("school_id"),
  details: text("details"),
  ipHash: text("ip_hash"),
  createdAt: integer("created_at").notNull(),
});

export const bugReports = sqliteTable("bug_reports", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  role: text("role"),
  path: text("path"),
  body: text("body").notNull(),
  sha: text("sha"),
  createdAt: integer("created_at").notNull(),
});

export const dmRequests = sqliteTable("dm_requests", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  guardianId: text("guardian_id").notNull(),
  classId: text("class_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
});

export const dmMessages = sqliteTable("dm_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  authorId: text("author_id").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const excursionAsks = sqliteTable("excursion_asks", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull(),
  day: text("day").notNull(),
  title: text("title").notNull(),
  createdAt: integer("created_at").notNull(),
});
