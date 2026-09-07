import { and, eq, isNull } from "drizzle-orm";
import type { Actor, Ctx } from "../actor.ts";
import { magicLinks, sessions, users } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId, randomToken, sha256Hex } from "../ids.ts";
import { SEED } from "../seed/ids.ts";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAGIC_MS = 15 * 60 * 1000;

export type Mailer = {
  sendMagicLink: (email: string, url: string) => Promise<boolean>;
};

function toActor(row: typeof users.$inferSelect): Actor {
  return {
    id: row.id,
    role: row.role as Actor["role"],
    schoolId: row.schoolId,
    locale: row.locale === "en" ? "en" : "pt-PT",
    email: row.email,
    displayName: row.displayName,
    firstName: row.firstName,
  };
}

export async function actorFromSession(
  ctx: Ctx,
  token: string | undefined,
): Promise<Actor | null> {
  if (!token) {
    return null;
  }
  const tokenHash = await sha256Hex(token);
  const found = await ctx.db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  const session = found[0];
  if (!session || session.expiresAt <= ctx.now()) {
    return null;
  }
  const userRows = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || user.deletedAt) {
    return null;
  }
  if (user.role === "student") {
    return null;
  }
  return toActor(user);
}

export async function createSession(ctx: Ctx, userId: string): Promise<string> {
  const token = randomToken();
  await ctx.db.insert(sessions).values({
    id: newId(),
    userId,
    tokenHash: await sha256Hex(token),
    expiresAt: ctx.now() + SESSION_MS,
    createdAt: ctx.now(),
  });
  return token;
}

export async function requestMagicLink(
  ctx: Ctx,
  mailer: Mailer,
  input: { email: string; origin: string; demoLogin: boolean },
): Promise<{ sent: boolean; previewUrl?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new AppError("invalid", 400);
  }
  const token = randomToken();
  await ctx.db.insert(magicLinks).values({
    id: newId(),
    email,
    tokenHash: await sha256Hex(token),
    expiresAt: ctx.now() + MAGIC_MS,
  });
  const previewUrl = `${input.origin}/auth/verify?t=${token}`;
  const sent = await mailer.sendMagicLink(email, previewUrl);
  if (sent) {
    return { sent: true };
  }
  if (input.demoLogin) {
    return { sent: false, previewUrl };
  }
  throw new AppError("unavailable", 503);
}

export async function consumeMagicLink(
  ctx: Ctx,
  token: string,
): Promise<string> {
  const tokenHash = await sha256Hex(token);
  const found = await ctx.db
    .select()
    .from(magicLinks)
    .where(and(eq(magicLinks.tokenHash, tokenHash), isNull(magicLinks.usedAt)))
    .limit(1);
  const link = found[0];
  if (!link || link.expiresAt <= ctx.now()) {
    throw new AppError("invalid", 400);
  }
  const userRows = await ctx.db
    .select()
    .from(users)
    .where(eq(users.email, link.email))
    .limit(1);
  const user = userRows[0];
  if (!user || user.role === "student") {
    throw new AppError("forbidden", 403);
  }
  await ctx.db
    .update(magicLinks)
    .set({ usedAt: ctx.now() })
    .where(eq(magicLinks.id, link.id));
  return createSession(ctx, user.id);
}

export async function demoLogin(
  ctx: Ctx,
  role: "teacher" | "guardian",
  allowed: boolean,
): Promise<string> {
  if (!allowed) {
    throw new AppError("forbidden", 403);
  }
  const userId = role === "teacher" ? SEED.teacherId : SEED.parentId;
  const userRows = await ctx.db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!userRows[0]) {
    throw new AppError("not_found", 404);
  }
  return createSession(ctx, userId);
}

export async function logout(
  ctx: Ctx,
  token: string | undefined,
): Promise<void> {
  if (!token) {
    return;
  }
  const tokenHash = await sha256Hex(token);
  await ctx.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
