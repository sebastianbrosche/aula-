import { eq } from "drizzle-orm";
import { type Actor, type Ctx, requireAdult, requireRole } from "../actor.ts";
import { featureRequests } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId } from "../ids.ts";

export type FeatureStatus = "open" | "accepted" | "rejected";

export type FeatureView = {
  id: string;
  actorId: string;
  role: string;
  note: string;
  status: FeatureStatus;
  createdAt: number;
  decidedBy: string | null;
  decidedAt: number | null;
};

function toView(row: {
  id: string;
  actorId: string;
  role: string;
  body: string;
  status: string;
  createdAt: number;
  decidedBy: string | null;
  decidedAt: number | null;
}): FeatureView {
  const status: FeatureStatus =
    row.status === "accepted" || row.status === "rejected"
      ? row.status
      : "open";
  return {
    id: row.id,
    actorId: row.actorId,
    role: row.role,
    note: row.body,
    status,
    createdAt: row.createdAt,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt,
  };
}

export async function submitFeature(
  ctx: Ctx,
  actor: Actor | null,
  body: string,
): Promise<FeatureView> {
  const current = requireAdult(actor);
  const trimmed = body.trim();
  if (!trimmed) {
    throw new AppError("invalid", 400);
  }
  const id = newId();
  await ctx.db.insert(featureRequests).values({
    id,
    actorId: current.id,
    role: current.role,
    body: trimmed.slice(0, 2000),
    status: "open",
    createdAt: ctx.now(),
  });
  return {
    id,
    actorId: current.id,
    role: current.role,
    note: trimmed.slice(0, 2000),
    status: "open",
    createdAt: ctx.now(),
    decidedBy: null,
    decidedAt: null,
  };
}

export async function listOpenFeatures(
  ctx: Ctx,
  actor: Actor | null,
): Promise<FeatureView[]> {
  requireAdult(actor);
  const rows = await ctx.db.select().from(featureRequests);
  return rows
    .filter((row) => row.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)
    .map(toView);
}

export async function decideFeature(
  ctx: Ctx,
  actor: Actor | null,
  id: string,
  action: string,
): Promise<FeatureView> {
  const current = requireRole(actor, ["teacher", "school_admin"]);
  if (action !== "accept" && action !== "reject") {
    throw new AppError("invalid", 400);
  }
  const found = await ctx.db
    .select()
    .from(featureRequests)
    .where(eq(featureRequests.id, id))
    .limit(1);
  const row = found[0];
  if (!row) {
    throw new AppError("not_found", 404);
  }
  if (row.status !== "open") {
    throw new AppError("invalid", 400);
  }
  const status: FeatureStatus = action === "accept" ? "accepted" : "rejected";
  const decidedAt = ctx.now();
  await ctx.db
    .update(featureRequests)
    .set({
      status,
      decidedBy: current.id,
      decidedAt,
    })
    .where(eq(featureRequests.id, id));
  return {
    id: row.id,
    actorId: row.actorId,
    role: row.role,
    note: row.body,
    status,
    createdAt: row.createdAt,
    decidedBy: current.id,
    decidedAt,
  };
}
