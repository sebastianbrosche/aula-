import { and, eq, isNull } from "drizzle-orm";
import {
  type Actor,
  type Ctx,
  type Locale,
  requireAdult,
  requireRole,
} from "../actor.ts";
import { guardianLinks, posts, privacyPrefs } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { classIdFor } from "../group/service.ts";
import { newId } from "../ids.ts";
import { localizeSeedPost } from "../seed/copy.ts";

export type MediaStore = {
  put: (key: string, data: ArrayBuffer, contentType: string) => Promise<void>;
};

export type MediaFile = {
  data: ArrayBuffer;
  contentType: string;
};

export type FeedPost = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  createdAt: number;
  storage?: "r2" | "stub";
  uploaded?: boolean;
  mediaKey?: string;
};

export async function listFeed(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<FeedPost[]> {
  const current = requireAdult(actor);
  const lang = locale ?? current.locale;
  const classId = await classIdFor(ctx, current);
  const rows = await ctx.db
    .select()
    .from(posts)
    .where(and(eq(posts.classId, classId), isNull(posts.deletedAt)));
  const hiddenChildIds = new Set<string>();
  if (current.role !== "teacher" && current.role !== "school_admin") {
    const opted = await ctx.db
      .select()
      .from(privacyPrefs)
      .where(eq(privacyPrefs.photoOptOut, 1));
    const optedGuardians = new Set(opted.map((row) => row.userId));
    const links = await ctx.db.select().from(guardianLinks);
    for (const link of links) {
      if (
        optedGuardians.has(link.guardianId) &&
        link.guardianId !== current.id
      ) {
        hiddenChildIds.add(link.studentId);
      }
    }
  }
  return rows
    .filter((row) => {
      if (!row.childIds) {
        return true;
      }
      const ids = JSON.parse(row.childIds) as string[];
      return !ids.some((id) => hiddenChildIds.has(id));
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((row) => {
      const copy = localizeSeedPost(row.id, lang, {
        title: row.title,
        body: row.body,
      });
      return {
        id: row.id,
        type: row.type,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    });
}

export async function createPost(
  ctx: Ctx,
  actor: Actor | null,
  input: {
    type?: string;
    title?: string;
    body?: string;
    file?: MediaFile | undefined;
  },
  media?: MediaStore | undefined,
): Promise<FeedPost> {
  const current = requireRole(actor, ["teacher", "school_admin"]);
  const classId = await classIdFor(ctx, current);
  const type =
    input.type === "photo" ||
    input.type === "video" ||
    input.type === "announcement"
      ? input.type
      : "story";
  const body = (input.body ?? "").trim();
  if (!body) {
    throw new AppError("invalid", 400);
  }
  if (input.file && input.file.data.byteLength > 8 * 1024 * 1024) {
    throw new AppError("invalid", 400);
  }
  const id = newId();
  let storage: "r2" | "stub" | undefined;
  let uploaded = false;
  let mediaKey: string | undefined;
  if (type === "photo" || type === "video") {
    if (media && input.file && input.file.data.byteLength > 0) {
      mediaKey = `feed/${id}`;
      try {
        await media.put(
          mediaKey,
          input.file.data,
          input.file.contentType || "application/octet-stream",
        );
        storage = "r2";
        uploaded = true;
      } catch {
        storage = "stub";
        uploaded = false;
        mediaKey = undefined;
      }
    } else {
      storage = "stub";
      uploaded = false;
    }
  }
  await ctx.db.insert(posts).values({
    id,
    classId,
    authorId: current.id,
    type,
    title: input.title?.trim() || null,
    body,
    pinned: 0,
    allowComments: 1,
    createdAt: ctx.now(),
    updatedAt: ctx.now(),
  });
  return {
    id,
    type,
    title: input.title?.trim() || null,
    body,
    createdAt: ctx.now(),
    ...(storage ? { storage } : {}),
    ...(type === "photo" || type === "video" ? { uploaded } : {}),
    ...(mediaKey ? { mediaKey } : {}),
  };
}
