import type { Actor, Ctx, Locale } from "../actor.ts";
import { AppError } from "../errors.ts";
import { listFeed } from "../feed/service.ts";
import { getTomorrow } from "../tomorrow/service.ts";

export const MCP_TOOLS = [
  {
    name: "aula_tomorrow",
    description:
      "What is school tomorrow, what to bring, last-minute notes. Read only.",
  },
  {
    name: "aula_bring",
    description: "What to bring tomorrow. Read only.",
  },
  {
    name: "aula_week",
    description: "Week summary: recent story posts plus tomorrow. Read only.",
  },
  {
    name: "aula_story",
    description: "Recent class story posts the actor may see. Read only.",
  },
] as const;

export type WeekView = {
  tomorrow: Awaited<ReturnType<typeof getTomorrow>>;
  story: Awaited<ReturnType<typeof listFeed>>;
};

export async function getWeek(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<WeekView> {
  const tomorrow = await getTomorrow(ctx, actor, locale);
  const story = await listFeed(ctx, actor, locale);
  return { tomorrow, story };
}

export async function callMcpTool(
  ctx: Ctx,
  actor: Actor | null,
  name: string,
  locale?: Locale,
): Promise<unknown> {
  if (name === "aula_tomorrow") {
    return getTomorrow(ctx, actor, locale);
  }
  if (name === "aula_bring") {
    const plan = await getTomorrow(ctx, actor, locale);
    return { bring: plan.bring, updates: plan.updates };
  }
  if (name === "aula_week") {
    return getWeek(ctx, actor, locale);
  }
  if (name === "aula_story") {
    return listFeed(ctx, actor, locale);
  }
  throw new AppError("invalid", 400);
}
