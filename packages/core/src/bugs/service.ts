import { type Actor, type Ctx, requireAdult } from "../actor.ts";
import { bugReports } from "../db/schema.ts";
import { AppError } from "../errors.ts";
import { newId } from "../ids.ts";

export async function reportBug(
  ctx: Ctx,
  actor: Actor | null,
  body: string,
): Promise<{ id: string }> {
  const current = requireAdult(actor);
  const trimmed = body.trim();
  if (!trimmed) {
    throw new AppError("invalid", 400);
  }
  const id = newId();
  await ctx.db.insert(bugReports).values({
    id,
    actorId: current.id,
    body: trimmed.slice(0, 2000),
    createdAt: ctx.now(),
  });
  return { id };
}
