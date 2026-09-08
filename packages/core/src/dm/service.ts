import { and, eq } from "drizzle-orm";
import { type Actor, type Ctx, requireAdult, requireRole } from "../actor.ts";
import { dmMessages, dmRequests, users } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { classIdFor, getGroup } from "../group/service.ts";
import { newId } from "../ids.ts";

export type DmRequestView = {
  id: string;
  teacherId: string;
  guardianId: string;
  status: "pending" | "accepted" | "declined";
  peerName: string;
  createdAt: number;
};

export type DmThreadView = {
  id: string;
  status: "pending" | "accepted" | "declined";
  peerName: string;
  messages: { id: string; authorId: string; body: string; createdAt: number }[];
};

function asStatus(value: string): "pending" | "accepted" | "declined" {
  if (value === "accepted" || value === "declined") {
    return value;
  }
  return "pending";
}

async function peerName(
  ctx: Ctx,
  actor: Actor,
  row: typeof dmRequests.$inferSelect,
): Promise<string> {
  const peerId = actor.id === row.teacherId ? row.guardianId : row.teacherId;
  const found = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, peerId))
    .limit(1);
  return found[0]?.displayName ?? peerId;
}

export async function requestDm(
  ctx: Ctx,
  actor: Actor | null,
  guardianId: string,
): Promise<DmRequestView> {
  const teacher = requireRole(actor, ["teacher", "school_admin"]);
  const group = await getGroup(ctx, teacher);
  const parent = group.adults.find(
    (person) => person.id === guardianId && person.role === "guardian",
  );
  if (!parent) {
    throw new AppError("not_found", 404);
  }
  const existing = await ctx.db
    .select()
    .from(dmRequests)
    .where(
      and(
        eq(dmRequests.teacherId, teacher.id),
        eq(dmRequests.guardianId, guardianId),
      ),
    );
  const pending = existing
    .filter((row) => row.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (pending) {
    return {
      id: pending.id,
      teacherId: pending.teacherId,
      guardianId: pending.guardianId,
      status: "pending",
      peerName: parent.displayName,
      createdAt: pending.createdAt,
    };
  }
  const classId = await classIdFor(ctx, teacher);
  const id = newId();
  await ctx.db.insert(dmRequests).values({
    id,
    teacherId: teacher.id,
    guardianId,
    classId,
    status: "pending",
    createdAt: ctx.now(),
  });
  return {
    id,
    teacherId: teacher.id,
    guardianId,
    status: "pending",
    peerName: parent.displayName,
    createdAt: ctx.now(),
  };
}

export async function listDms(
  ctx: Ctx,
  actor: Actor | null,
): Promise<DmRequestView[]> {
  const current = requireAdult(actor);
  const rows =
    current.role === "guardian"
      ? await ctx.db
          .select()
          .from(dmRequests)
          .where(eq(dmRequests.guardianId, current.id))
      : await ctx.db
          .select()
          .from(dmRequests)
          .where(eq(dmRequests.teacherId, current.id));
  const views: DmRequestView[] = [];
  for (const row of rows.sort((a, b) => b.createdAt - a.createdAt)) {
    views.push({
      id: row.id,
      teacherId: row.teacherId,
      guardianId: row.guardianId,
      status: asStatus(row.status),
      peerName: await peerName(ctx, current, row),
      createdAt: row.createdAt,
    });
  }
  return views;
}

export async function respondDm(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
  action: "accept" | "decline",
): Promise<DmRequestView> {
  const guardian = requireRole(actor, ["guardian"]);
  const found = await ctx.db
    .select()
    .from(dmRequests)
    .where(eq(dmRequests.id, id))
    .limit(1);
  const row = found[0];
  if (!row || row.guardianId !== guardian.id) {
    throw new AppError("not_found", 404);
  }
  if (row.status !== "pending") {
    throw new AppError("invalid", 400);
  }
  const status = action === "accept" ? "accepted" : "declined";
  await ctx.db.update(dmRequests).set({ status }).where(eq(dmRequests.id, id));
  return {
    id: row.id,
    teacherId: row.teacherId,
    guardianId: row.guardianId,
    status,
    peerName: await peerName(ctx, guardian, row),
    createdAt: row.createdAt,
  };
}

export async function getDmThread(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
): Promise<DmThreadView> {
  const current = requireAdult(actor);
  const found = await ctx.db
    .select()
    .from(dmRequests)
    .where(eq(dmRequests.id, id))
    .limit(1);
  const row = found[0];
  if (!row || (row.teacherId !== current.id && row.guardianId !== current.id)) {
    throw new AppError("not_found", 404);
  }
  const messages = await ctx.db
    .select()
    .from(dmMessages)
    .where(eq(dmMessages.threadId, id));
  return {
    id: row.id,
    status: asStatus(row.status),
    peerName: await peerName(ctx, current, row),
    messages: messages
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((message) => ({
        id: message.id,
        authorId: message.authorId,
        body: message.body,
        createdAt: message.createdAt,
      })),
  };
}

export async function postDmMessage(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
  body: string,
): Promise<DmThreadView> {
  const current = requireAdult(actor);
  const thread = await getDmThread(ctx, current, id);
  if (thread.status !== "accepted") {
    throw new AppError("forbidden", 403);
  }
  const trimmed = body.trim();
  if (!trimmed) {
    throw new AppError("invalid", 400);
  }
  await ctx.db.insert(dmMessages).values({
    id: newId(),
    threadId: id,
    authorId: current.id,
    body: trimmed.slice(0, 2000),
    createdAt: ctx.now(),
  });
  return getDmThread(ctx, current, id);
}
