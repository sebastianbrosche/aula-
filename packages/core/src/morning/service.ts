import { type Actor, type Ctx, type Locale, requireAdult } from "../actor.ts";
import { getTomorrow } from "../tomorrow/service.ts";

export type MorningView = {
  happening: string | null;
  bring: string | null;
  updates: { id: string; body: string; createdAt: number }[];
  excursion: Awaited<ReturnType<typeof getTomorrow>>["excursion"] | null;
  source: "template";
};

export async function getMorning(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<MorningView> {
  const current = requireAdult(actor);
  const plan = await getTomorrow(ctx, current, locale ?? current.locale);
  return {
    happening: plan.happening,
    bring: plan.bring,
    updates: plan.updates,
    excursion: plan.excursion ?? null,
    source: "template",
  };
}
