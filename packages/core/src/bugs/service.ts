import { type Actor, type Ctx, requireAdult } from "../actor.ts";
import { bugReports } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId } from "../ids.ts";

export type BugReportInput = {
  body: string;
  path?: string | undefined;
  sha?: string | undefined;
};

export type BugReportView = {
  id: string;
  actorId: string;
  role: string;
  path: string | null;
  createdAt: number;
  sha: string | null;
};

export function safeReportPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return undefined;
  }
  if (trimmed.includes("://")) {
    return undefined;
  }
  return trimmed.slice(0, 200);
}

export async function reportBug(
  ctx: Ctx,
  actor: Actor | null,
  input: BugReportInput,
): Promise<BugReportView> {
  const current = requireAdult(actor);
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new AppError("invalid", 400);
  }
  const id = newId();
  const path = safeReportPath(input.path) ?? null;
  const sha = input.sha?.trim().slice(0, 64) || null;
  await ctx.db.insert(bugReports).values({
    id,
    actorId: current.id,
    role: current.role,
    path,
    body: trimmed.slice(0, 2000),
    sha,
    createdAt: ctx.now(),
  });
  return {
    id,
    actorId: current.id,
    role: current.role,
    path,
    createdAt: ctx.now(),
    sha,
  };
}
