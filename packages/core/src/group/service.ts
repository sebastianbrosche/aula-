import { and, eq } from "drizzle-orm";
import { type Actor, type Ctx, requireAdult } from "../actor.ts";
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

async function classIdFor(ctx: Ctx, actor: Actor): Promise<string> {
  if (actor.role === "teacher" || actor.role === "school_admin") {
    const membership = await ctx.db
      .select()
      .from(classMembers)
      .where(
        and(
          eq(classMembers.userId, actor.id),
          eq(classMembers.status, "active"),
        ),
      )
      .limit(1);
    const row = membership[0];
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
  if (!link) {
    throw new AppError("forbidden", 403);
  }
  const membership = await ctx.db
    .select()
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, link.studentId),
        eq(classMembers.status, "active"),
      ),
    )
    .limit(1);
  const row = membership[0];
  if (!row) {
    throw new AppError("forbidden", 403);
  }
  return row.classId;
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
    if (member.role === "teacher") {
      adults.push({
        id: user.id,
        displayName: user.displayName,
        role: "teacher",
      });
    }
    if (member.role === "student") {
      children.push({ id: user.id, displayName: user.displayName });
    }
  }
  if (current.role === "guardian") {
    adults.push({
      id: current.id,
      displayName: current.displayName,
      role: "guardian",
    });
  } else {
    const links = await ctx.db.select().from(guardianLinks);
    for (const link of links) {
      const guardian = byId.get(link.guardianId);
      if (guardian) {
        adults.push({
          id: guardian.id,
          displayName: guardian.displayName,
          role: "guardian",
        });
      }
    }
  }
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

export { classIdFor };
