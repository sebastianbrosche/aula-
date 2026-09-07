import { eq } from "drizzle-orm";
import { type Actor, type Ctx, type Locale, requireAdult } from "../actor.ts";
import { dayPlans, dayUpdates } from "../db/schema.ts";
import { classIdFor } from "../group/service.ts";
import { localizeSeedPlan, localizeSeedUpdate } from "../seed/copy.ts";

export type TomorrowView = {
  day: string;
  happening: string | null;
  bring: string | null;
  updates: { id: string; body: string; createdAt: number }[];
};

export async function getTomorrow(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<TomorrowView> {
  const current = requireAdult(actor);
  const lang = locale ?? current.locale;
  const classId = await classIdFor(ctx, current);
  const plans = await ctx.db
    .select()
    .from(dayPlans)
    .where(eq(dayPlans.classId, classId));
  const today = new Date(ctx.now());
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  const iso = tomorrow.toISOString().slice(0, 10);
  const plan =
    plans.find((row) => row.day === iso) ??
    plans.find((row) => row.day === "standing") ??
    plans[0];
  if (!plan) {
    return { day: iso, happening: null, bring: null, updates: [] };
  }
  const updates = await ctx.db
    .select()
    .from(dayUpdates)
    .where(eq(dayUpdates.classId, classId));
  const copy = localizeSeedPlan(lang, {
    happening: plan.happening,
    bring: plan.bring,
  });
  return {
    day: plan.day === "standing" ? iso : plan.day,
    happening: copy.happening,
    bring: copy.bring,
    updates: updates
      .filter((row) => row.day === plan.day || row.day === iso)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        id: row.id,
        body: localizeSeedUpdate(row.id, lang, row.body),
        createdAt: row.createdAt,
      })),
  };
}
