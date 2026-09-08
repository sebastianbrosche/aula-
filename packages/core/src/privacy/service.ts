import { eq } from "drizzle-orm";
import { type Actor, type Ctx, requireRole } from "../actor.ts";
import { consents, guardianLinks, privacyPrefs } from "../db/schema.ts";
import { newId } from "../ids.ts";

export type PrivacyView = {
  photoOptOut: boolean;
  yolo: boolean;
  editable: boolean;
};

export async function getPrivacy(
  ctx: Ctx,
  actor: Actor | null,
): Promise<PrivacyView> {
  const current = requireRole(actor, [
    "guardian",
    "teacher",
    "school_admin",
    "super_admin",
  ]);
  if (current.role !== "guardian") {
    return { photoOptOut: false, yolo: false, editable: false };
  }
  const rows = await ctx.db
    .select()
    .from(privacyPrefs)
    .where(eq(privacyPrefs.userId, current.id))
    .limit(1);
  const row = rows[0];
  return {
    photoOptOut: row ? row.photoOptOut === 1 : false,
    yolo: row ? row.yolo === 1 : false,
    editable: true,
  };
}

export async function savePrivacy(
  ctx: Ctx,
  actor: Actor | null,
  input: { photoOptOut: boolean; yolo: boolean },
): Promise<PrivacyView> {
  const current = requireRole(actor, ["guardian"]);
  await ctx.db
    .insert(privacyPrefs)
    .values({
      userId: current.id,
      photoOptOut: input.photoOptOut ? 1 : 0,
      yolo: input.yolo ? 1 : 0,
      updatedAt: ctx.now(),
    })
    .onConflictDoUpdate({
      target: privacyPrefs.userId,
      set: {
        photoOptOut: input.photoOptOut ? 1 : 0,
        yolo: input.yolo ? 1 : 0,
        updatedAt: ctx.now(),
      },
    });
  if (input.yolo && current.schoolId) {
    const links = await ctx.db
      .select()
      .from(guardianLinks)
      .where(eq(guardianLinks.guardianId, current.id));
    for (const link of links) {
      for (const type of ["media_story", "excursion"] as const) {
        await ctx.db.insert(consents).values({
          id: newId(),
          studentId: link.studentId,
          guardianId: current.id,
          schoolId: current.schoolId,
          type,
          granted: 1,
          source: "yolo",
          recordedAt: ctx.now(),
        });
      }
    }
  }
  return getPrivacy(ctx, current);
}
