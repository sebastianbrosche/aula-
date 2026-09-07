import { eq } from "drizzle-orm";
import type { Ctx } from "../actor.ts";
import { users } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { createSession } from "./service.ts";

export type GoogleConfig = {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
};

export function googleReady(config: GoogleConfig): boolean {
  return Boolean(config.clientId && config.clientSecret);
}

export function googleAuthorizeUrl(
  config: GoogleConfig,
  origin: string,
  state: string,
): string {
  if (!config.clientId) {
    throw new AppError("unavailable", 503);
  }
  const redirect = `${origin}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function finishGoogleLogin(
  ctx: Ctx,
  config: GoogleConfig,
  origin: string,
  code: string,
): Promise<string> {
  if (!config.clientId || !config.clientSecret) {
    throw new AppError("unavailable", 503);
  }
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${origin}/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    throw new AppError("invalid", 400);
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new AppError("invalid", 400);
  }
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) {
    throw new AppError("invalid", 400);
  }
  const info = (await infoRes.json()) as { email?: string };
  const email = info.email?.trim().toLowerCase();
  if (!email) {
    throw new AppError("invalid", 400);
  }
  const rows = await ctx.db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];
  if (!user || user.role === "student") {
    throw new AppError("forbidden", 403);
  }
  return createSession(ctx, user.id);
}
