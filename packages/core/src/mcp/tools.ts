import type { Actor, Ctx, Locale } from "../actor.ts";
import { askHome } from "../ask/service.ts";
import { AppError } from "../errors.ts";
import { listFeed } from "../feed/service.ts";
import { pickHighlights, type SummaryHighlight } from "../summary/service.ts";
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
    description:
      "Week notes (library bag and last-minute) plus feed highlights. Read only.",
  },
  {
    name: "aula_story",
    description: "Recent class story posts the actor may see. Read only.",
  },
  {
    name: "aula_ask",
    description:
      "Quiet Home ask from feed and tomorrow. Template only. Read only.",
  },
] as const;

export type WeekView = {
  tomorrow: Awaited<ReturnType<typeof getTomorrow>>;
  story: Awaited<ReturnType<typeof listFeed>>;
  highlights: SummaryHighlight[];
  notes: { id: string; body: string; createdAt: number }[];
};

export type McpToolArgs = {
  q?: string;
  question?: string;
};

export async function getWeek(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<WeekView> {
  const tomorrow = await getTomorrow(ctx, actor, locale);
  const story = await listFeed(ctx, actor, locale);
  return {
    tomorrow,
    story,
    highlights: pickHighlights(story),
    notes: tomorrow.updates,
  };
}

export async function callMcpTool(
  ctx: Ctx,
  actor: Actor | null,
  name: string,
  locale?: Locale,
  args?: McpToolArgs,
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
  if (name === "aula_ask") {
    return askHome(ctx, actor, args?.q ?? args?.question ?? "", locale);
  }
  throw new AppError("invalid", 400);
}
