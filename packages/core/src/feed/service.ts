import { and, eq, isNull } from "drizzle-orm";
import {
  type Actor,
  type Ctx,
  type Locale,
  requireAdult,
  requireRole,
} from "../actor.ts";
import { guardianLinks, posts, privacyPrefs, users } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { classIdFor } from "../group/service.ts";
import { t } from "../i18n/t.ts";
import { newId } from "../ids.ts";
import { localizeSeedPost } from "../seed/copy.ts";

export const FEED_PREVIEW_CHARS = 160;

export type MediaStore = {
  put: (key: string, data: ArrayBuffer, contentType: string) => Promise<void>;
};

export type MediaFile = {
  data: ArrayBuffer;
  contentType: string;
};

export type FeedAttachment = {
  href: string;
  label: string;
  stub: boolean;
};

export type FeedPost = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  preview: string;
  truncated: boolean;
  createdAt: number;
  redacted?: boolean;
  label?: string;
  attachment?: FeedAttachment;
  storage?: "r2" | "stub";
  uploaded?: boolean;
  mediaKey?: string;
};

async function optedOutChildHandles(
  ctx: Ctx,
  actor: Actor,
): Promise<{ ids: Set<string>; handles: string[] }> {
  const opted = await ctx.db
    .select()
    .from(privacyPrefs)
    .where(eq(privacyPrefs.photoOptOut, 1));
  const optedGuardians = new Set(opted.map((row) => row.userId));
  const links = await ctx.db.select().from(guardianLinks);
  const ids = new Set<string>();
  for (const link of links) {
    if (optedGuardians.has(link.guardianId) && link.guardianId !== actor.id) {
      ids.add(link.studentId);
    }
  }
  const people = await ctx.db.select().from(users);
  const handles = people
    .filter((user) => ids.has(user.id))
    .map((user) => user.displayName);
  return { ids, handles };
}

function previewOf(body: string): { preview: string; truncated: boolean } {
  if (body.length <= FEED_PREVIEW_CHARS) {
    return { preview: body, truncated: false };
  }
  return {
    preview: `${body.slice(0, FEED_PREVIEW_CHARS).trimEnd()}...`,
    truncated: true,
  };
}

function toFeedPost(
  id: string,
  type: string,
  title: string | null,
  body: string,
  createdAt: number,
  locale: Locale,
  redacted: boolean,
  extra?: Partial<FeedPost>,
): FeedPost {
  const cut = previewOf(body);
  const attachment =
    type === "photo" || type === "video"
      ? {
          href: `#${id}`,
          label: t(locale, "feed.attachment_stub"),
          stub: true,
        }
      : undefined;
  return {
    id,
    type,
    title,
    body,
    preview: cut.preview,
    truncated: cut.truncated,
    createdAt,
    ...(redacted
      ? { redacted: true, label: t(locale, "feed.photo_refused") }
      : {}),
    ...(attachment ? { attachment } : {}),
    ...extra,
  };
}

function applyRedaction(
  text: string,
  handles: string[],
  label: string,
): string {
  let next = text;
  for (const handle of handles) {
    next = next.split(handle).join(label);
  }
  return next;
}

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
  const opted = await optedOutChildHandles(ctx, current);
  const label = t(lang, "feed.photo_refused");
  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((row) => {
      const copy = localizeSeedPost(row.id, lang, {
        title: row.title,
        body: row.body,
      });
      const named = row.childIds ? (JSON.parse(row.childIds) as string[]) : [];
      const hitsOptOut =
        named.some((id) => opted.ids.has(id)) ||
        opted.handles.some(
          (handle) =>
            (copy.title ?? "").includes(handle) || copy.body.includes(handle),
        );
      const redacted = hitsOptOut;
      const title = redacted
        ? copy.title
          ? applyRedaction(copy.title, opted.handles, label)
          : copy.title
        : copy.title;
      const body = redacted
        ? applyRedaction(copy.body, opted.handles, label)
        : copy.body;
      return toFeedPost(
        row.id,
        row.type,
        title,
        body,
        row.createdAt,
        lang,
        redacted,
      );
    });
}

export async function getPost(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
  locale?: Locale,
): Promise<FeedPost> {
  const items = await listFeed(ctx, actor, locale);
  const post = items.find((item) => item.id === id);
  if (!post) {
    throw new AppError("not_found", 404);
  }
  return post;
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
  const lang = current.locale;
  return toFeedPost(
    id,
    type,
    input.title?.trim() || null,
    body,
    ctx.now(),
    lang,
    false,
    {
      ...(storage ? { storage } : {}),
      ...(type === "photo" || type === "video" ? { uploaded } : {}),
      ...(mediaKey ? { mediaKey } : {}),
    },
  );
}
