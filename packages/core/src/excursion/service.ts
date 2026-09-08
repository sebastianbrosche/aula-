import { and, eq } from "drizzle-orm";
import {
  type Actor,
  type Ctx,
  type Locale,
  requireAdult,
  requireRole,
} from "../actor.ts";
import {
  consents,
  excursionAsks,
  guardianLinks,
  privacyPrefs,
} from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { classIdFor } from "../group/service.ts";
import { newId } from "../ids.ts";
import { localizeSeedExcursion } from "../seed/copy.ts";

export type ExcursionView = {
  id: string;
  title: string;
  status: "pending" | "approved" | "auto";
  source?: "tap" | "yolo";
};

export async function getExcursion(
  ctx: Ctx,
  actor: Actor,
  locale: Locale,
  classId: string,
  day: string,
): Promise<ExcursionView | undefined> {
  const asks = await ctx.db
    .select()
    .from(excursionAsks)
    .where(eq(excursionAsks.classId, classId));
  const ask =
    asks.find((row) => row.day === day) ??
    asks.find((row) => row.day === "standing") ??
    asks[0];
  if (!ask) {
    return undefined;
  }
  const title = localizeSeedExcursion(ask.id, locale, ask.title);
  if (actor.role !== "guardian") {
    const anyGrant = await ctx.db
      .select()
      .from(consents)
      .where(and(eq(consents.type, "excursion"), eq(consents.granted, 1)));
    return {
      id: ask.id,
      title,
      status: anyGrant[0] ? "approved" : "pending",
    };
  }
  const prefs = await ctx.db
    .select()
    .from(privacyPrefs)
    .where(eq(privacyPrefs.userId, actor.id))
    .limit(1);
  if (prefs[0]?.yolo === 1) {
    await ensureYoloExcursionConsent(ctx, actor);
    return { id: ask.id, title, status: "auto", source: "yolo" };
  }
  const granted = await ctx.db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.guardianId, actor.id),
        eq(consents.type, "excursion"),
        eq(consents.granted, 1),
      ),
    );
  if (granted[0]) {
    return {
      id: ask.id,
      title,
      status: "approved",
      source: granted[0].source === "yolo" ? "yolo" : "tap",
    };
  }
  return { id: ask.id, title, status: "pending" };
}

async function ensureYoloExcursionConsent(
  ctx: Ctx,
  actor: Actor,
): Promise<void> {
  if (!actor.schoolId) {
    return;
  }
  const links = await ctx.db
    .select()
    .from(guardianLinks)
    .where(eq(guardianLinks.guardianId, actor.id));
  const existing = await ctx.db
    .select()
    .from(consents)
    .where(
      and(
        eq(consents.guardianId, actor.id),
        eq(consents.type, "excursion"),
        eq(consents.granted, 1),
      ),
    );
  if (existing[0]) {
    return;
  }
  for (const link of links) {
    await ctx.db.insert(consents).values({
      id: newId(),
      studentId: link.studentId,
      guardianId: actor.id,
      schoolId: actor.schoolId,
      type: "excursion",
      granted: 1,
      source: "yolo",
      recordedAt: ctx.now(),
    });
  }
}

export async function approveExcursion(
  ctx: Ctx,
  actor: Actor | null,
  askId: string,
): Promise<ExcursionView> {
  const guardian = requireRole(actor, ["guardian"]);
  requireAdult(guardian);
  const found = await ctx.db
    .select()
    .from(excursionAsks)
    .where(eq(excursionAsks.id, askId))
    .limit(1);
  const ask = found[0];
  if (!ask) {
    throw new AppError("not_found", 404);
  }
  const classId = await classIdFor(ctx, guardian);
  if (ask.classId !== classId) {
    throw new AppError("forbidden", 403);
  }
  const prefs = await ctx.db
    .select()
    .from(privacyPrefs)
    .where(eq(privacyPrefs.userId, guardian.id))
    .limit(1);
  if (prefs[0]?.yolo === 1) {
    const view = await getExcursion(
      ctx,
      guardian,
      guardian.locale,
      classId,
      ask.day,
    );
    if (!view) {
      throw new AppError("not_found", 404);
    }
    return view;
  }
  if (!guardian.schoolId) {
    throw new AppError("forbidden", 403);
  }
  const links = await ctx.db
    .select()
    .from(guardianLinks)
    .where(eq(guardianLinks.guardianId, guardian.id));
  for (const link of links) {
    await ctx.db.insert(consents).values({
      id: newId(),
      studentId: link.studentId,
      guardianId: guardian.id,
      schoolId: guardian.schoolId,
      type: "excursion",
      granted: 1,
      source: "tap",
      recordedAt: ctx.now(),
    });
  }
  return {
    id: ask.id,
    title: localizeSeedExcursion(ask.id, guardian.locale, ask.title),
    status: "approved",
    source: "tap",
  };
}

export async function resetExcursion(
  ctx: Ctx,
  actor: Actor | null,
): Promise<{ reset: true; status: "pending" }> {
  requireRole(actor, ["teacher", "school_admin"]);
  await ctx.db
    .update(consents)
    .set({ granted: 0, revokedAt: ctx.now() })
    .where(and(eq(consents.type, "excursion"), eq(consents.granted, 1)));
  return { reset: true, status: "pending" };
}
