import { and, eq } from "drizzle-orm";
import { type Actor, type Ctx, requireAdult, requireRole } from "../actor.ts";
import {
  auditLog,
  classes,
  classMembers,
  guardianLinks,
  schools,
  users,
} from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId } from "../ids.ts";

export type GroupView = {
  schoolName: string;
  className: string;
  inviteCode: string;
  adults: { id: string; displayName: string; role: string }[];
  children: { id: string; displayName: string }[];
};

export type JoinResult = GroupView & { already: boolean };

async function activeMembership(
  ctx: Ctx,
  userId: string,
): Promise<{ classId: string } | undefined> {
  const membership = await ctx.db
    .select()
    .from(classMembers)
    .where(
      and(eq(classMembers.userId, userId), eq(classMembers.status, "active")),
    )
    .limit(1);
  return membership[0];
}

async function classIdFor(ctx: Ctx, actor: Actor): Promise<string> {
  if (actor.role === "teacher" || actor.role === "school_admin") {
    const row = await activeMembership(ctx, actor.id);
    if (!row) {
      throw new AppError("forbidden", 403);
    }
    return row.classId;
  }
  const links = await ctx.db
    .select()
    .from(guardianLinks)
    .where(eq(guardianLinks.guardianId, actor.id))
    .limit(1);
  const link = links[0];
  if (link) {
    const row = await activeMembership(ctx, link.studentId);
    if (row) {
      return row.classId;
    }
  }
  const own = await activeMembership(ctx, actor.id);
  if (!own) {
    throw new AppError("forbidden", 403);
  }
  return own.classId;
}

export async function getGroup(
  ctx: Ctx,
  actor: Actor | null,
): Promise<GroupView> {
  const current = requireAdult(actor);
  const classId = await classIdFor(ctx, current);
  const classRows = await ctx.db
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1);
  const klass = classRows[0];
  if (!klass) {
    throw new AppError("not_found", 404);
  }
  const schoolRows = await ctx.db
    .select()
    .from(schools)
    .where(eq(schools.id, klass.schoolId))
    .limit(1);
  const school = schoolRows[0];
  if (!school) {
    throw new AppError("not_found", 404);
  }
  const members = await ctx.db
    .select()
    .from(classMembers)
    .where(eq(classMembers.classId, classId));
  const people = await ctx.db.select().from(users);
  const byId = new Map(people.map((user) => [user.id, user]));
  const adults: GroupView["adults"] = [];
  const children: GroupView["children"] = [];
  for (const member of members) {
    const user = byId.get(member.userId);
    if (!user) {
      continue;
    }
    if (member.role === "teacher" || member.role === "school_admin") {
      adults.push({
        id: user.id,
        displayName: user.displayName,
        role: "teacher",
      });
    }
    if (member.role === "guardian") {
      adults.push({
        id: user.id,
        displayName: user.displayName,
        role: "guardian",
      });
    }
    if (member.role === "student") {
      children.push({ id: user.id, displayName: user.displayName });
    }
  }
  if (
    current.role === "guardian" &&
    !adults.some((person) => person.id === current.id)
  ) {
    adults.push({
      id: current.id,
      displayName: current.displayName,
      role: "guardian",
    });
  } else if (current.role !== "guardian") {
    const links = await ctx.db.select().from(guardianLinks);
    for (const link of links) {
      const guardian = byId.get(link.guardianId);
      if (guardian && !adults.some((person) => person.id === guardian.id)) {
        adults.push({
          id: guardian.id,
          displayName: guardian.displayName,
          role: "guardian",
        });
      }
    }
  }
  adults.sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "teacher" ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
  children.sort((a, b) => a.displayName.localeCompare(b.displayName));
  await ctx.db.insert(auditLog).values({
    id: newId(),
    actorId: current.id,
    action: "roster.read",
    targetType: "class",
    targetId: classId,
    schoolId: klass.schoolId,
    createdAt: ctx.now(),
  });
  return {
    schoolName: school.name,
    className: klass.name,
    inviteCode: klass.inviteCode,
    adults,
    children,
  };
}

export async function createGroup(
  ctx: Ctx,
  actor: Actor | null,
  input: { name?: string },
): Promise<GroupView> {
  const current = requireRole(actor, ["teacher", "school_admin"]);
  try {
    return await getGroup(ctx, current);
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== "forbidden") {
      throw error;
    }
  }
  if (!current.schoolId) {
    throw new AppError("forbidden", 403);
  }
  const inviteCode = newId().slice(0, 8).toUpperCase();
  const classId = newId();
  await ctx.db.insert(classes).values({
    id: classId,
    schoolId: current.schoolId,
    name: input.name?.trim() || "Group",
    inviteCode,
    commentsEnabled: 1,
    createdAt: ctx.now(),
  });
  await ctx.db.insert(classMembers).values({
    id: newId(),
    classId,
    userId: current.id,
    role: "teacher",
    status: "active",
    joinedAt: ctx.now(),
  });
  return getGroup(ctx, current);
}

export async function inviteGroup(
  ctx: Ctx,
  actor: Actor | null,
): Promise<{ inviteCode: string }> {
  requireRole(actor, ["teacher", "school_admin"]);
  const group = await getGroup(ctx, actor);
  return { inviteCode: group.inviteCode };
}

export async function lookupInviteClass(ctx: Ctx, inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  if (!code) {
    throw new AppError("invalid", 400);
  }
  const found = await ctx.db
    .select()
    .from(classes)
    .where(eq(classes.inviteCode, code))
    .limit(1);
  const klass = found[0];
  if (!klass) {
    throw new AppError("invalid", 400);
  }
  return klass;
}

async function alreadyInClass(
  ctx: Ctx,
  actor: Actor,
  classId: string,
): Promise<boolean> {
  try {
    return (await classIdFor(ctx, actor)) === classId;
  } catch (error) {
    if (error instanceof AppError && error.code === "forbidden") {
      return false;
    }
    throw error;
  }
}

export async function joinGroup(
  ctx: Ctx,
  actor: Actor | null,
  inviteCode: string,
): Promise<JoinResult> {
  const current = requireAdult(actor);
  const klass = await lookupInviteClass(ctx, inviteCode);
  if (await alreadyInClass(ctx, current, klass.id)) {
    const group = await getGroup(ctx, current);
    return { ...group, already: true };
  }
  const memberRole =
    current.role === "teacher" || current.role === "school_admin"
      ? current.role
      : "guardian";
  await ctx.db.insert(classMembers).values({
    id: newId(),
    classId: klass.id,
    userId: current.id,
    role: memberRole,
    status: "active",
    joinedAt: ctx.now(),
  });
  const group = await getGroup(ctx, current);
  return { ...group, already: false };
}

export { classIdFor };
