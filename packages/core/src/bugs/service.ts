import { eq } from "drizzle-orm";
import { type Actor, type Ctx, requireAdult } from "../actor.ts";
import { bugReports } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId } from "../ids.ts";

export type BugReportInput = {
  body: string;
  path?: string | undefined;
  sha?: string | undefined;
};

export type BugStatus = "open" | "done";

export type BugReportView = {
  id: string;
  actorId: string;
  role: string;
  path: string | null;
  note: string;
  createdAt: number;
  sha: string | null;
  status: BugStatus;
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

function toView(
  row: {
    id: string;
    actorId: string;
    role: string | null;
    path: string | null;
    body: string;
    createdAt: number;
    sha: string | null;
    status?: string | null;
  },
  fallbackRole: string,
): BugReportView {
  return {
    id: row.id,
    actorId: row.actorId,
    role: row.role ?? fallbackRole,
    path: row.path,
    note: row.body,
    createdAt: row.createdAt,
    sha: row.sha,
    status: row.status === "done" ? "done" : "open",
  };
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
    status: "open",
  });
  return {
    id,
    actorId: current.id,
    role: current.role,
    path,
    note: trimmed.slice(0, 2000),
    createdAt: ctx.now(),
    sha,
    status: "open",
  };
}

export function shouldRecordAutoBug(error: AppError): boolean {
  return error.code === "unavailable" || error.status >= 500;
}

export async function recordAutoBug(
  ctx: Ctx,
  actor: Actor | null,
  input: { path?: string; sha?: string; body: string },
): Promise<void> {
  if (!actor || actor.role === "student") {
    return;
  }
  try {
    await reportBug(ctx, actor, {
      body: input.body,
      ...(input.path ? { path: input.path } : {}),
      ...(input.sha ? { sha: input.sha } : {}),
    });
  } catch {
    // Never block the user response.
  }
}

export async function listOpenBugs(
  ctx: Ctx,
  actor: Actor | null,
): Promise<BugReportView[]> {
  const current = requireAdult(actor);
  const rows = await ctx.db.select().from(bugReports);
  return rows
    .filter((row) => !row.status || row.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)
    .map((row) => toView(row, current.role));
}

export async function closeBug(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
): Promise<BugReportView> {
  const current = requireAdult(actor);
  const trimmed = id.trim();
  if (!trimmed) {
    throw new AppError("invalid", 400);
  }
  const found = await ctx.db
    .select()
    .from(bugReports)
    .where(eq(bugReports.id, trimmed))
    .limit(1);
  const row = found[0];
  if (!row) {
    throw new AppError("not_found", 404);
  }
  if (row.status && row.status !== "open") {
    throw new AppError("invalid", 400);
  }
  await ctx.db
    .update(bugReports)
    .set({ status: "done" })
    .where(eq(bugReports.id, trimmed));
  return toView({ ...row, status: "done" }, current.role);
}

export async function listOwnBugs(
  ctx: Ctx,
  actor: Actor | null,
): Promise<BugReportView[]> {
  const current = requireAdult(actor);
  const rows = await ctx.db
    .select()
    .from(bugReports)
    .where(eq(bugReports.actorId, current.id));
  return rows
    .filter((row) => !row.status || row.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20)
    .map((row) => toView(row, current.role));
}
