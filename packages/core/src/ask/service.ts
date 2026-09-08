import { type Actor, type Ctx, type Locale, requireAdult } from "../actor.ts";
import { AppError } from "../errors.ts";
import { t } from "../i18n/t.ts";
import { getSummary } from "../summary/service.ts";

export type AskView = {
  question: string;
  answer: string;
  source: "template";
  happening: string | null;
  bring: string | null;
};

export async function askHome(
  ctx: Ctx,
  actor: Actor | null,
  question: string,
  locale?: Locale,
): Promise<AskView> {
  const current = requireAdult(actor);
  const lang = locale ?? current.locale;
  const asked = question.trim();
  if (!asked) {
    throw new AppError("invalid", 400);
  }
  const digest = await getSummary(ctx, current, lang);
  return {
    question: asked,
    answer: `${t(lang, "ask.heard", { question: asked })} ${digest.body}`,
    source: "template",
    happening: digest.happening,
    bring: digest.bring,
  };
}
