import { type Actor, type Ctx, type Locale, requireAdult } from "../actor.ts";
import { listFeed } from "../feed/service.ts";
import { t } from "../i18n/t.ts";
import { getTomorrow } from "../tomorrow/service.ts";

export type SummaryHighlight = {
  id: string;
  title: string | null;
  preview: string;
};

export type SummaryView = {
  title: string;
  body: string;
  source: "template";
  happening: string | null;
  bring: string | null;
  highlights: SummaryHighlight[];
};

function pickHighlights(
  feed: Awaited<ReturnType<typeof listFeed>>,
): SummaryHighlight[] {
  const chosen: typeof feed = [];
  const seen = new Set<string>();
  const candidates = [
    ...feed.slice(0, 5),
    ...feed.filter((post) => post.redacted),
  ];
  for (const post of candidates) {
    if (seen.has(post.id)) {
      continue;
    }
    seen.add(post.id);
    chosen.push(post);
    if (chosen.length >= 5) {
      break;
    }
  }
  return chosen.map((post) => ({
    id: post.id,
    title: post.title,
    preview: post.preview,
  }));
}

export async function getSummary(
  ctx: Ctx,
  actor: Actor | null,
  locale?: Locale,
): Promise<SummaryView> {
  const current = requireAdult(actor);
  const lang = locale ?? current.locale;
  const feed = await listFeed(ctx, current, lang);
  const tomorrow = await getTomorrow(ctx, current, lang);
  const highlights = pickHighlights(feed);
  const parts: string[] = [];
  if (highlights.length > 0) {
    parts.push(t(lang, "summary.today_label"));
    for (const item of highlights) {
      parts.push(item.title ? `${item.title}. ${item.preview}` : item.preview);
    }
  }
  if (tomorrow.happening || tomorrow.bring || tomorrow.updates[0]) {
    parts.push(t(lang, "summary.tomorrow_label"));
    if (tomorrow.happening) {
      parts.push(tomorrow.happening);
    }
    if (tomorrow.bring) {
      parts.push(`${t(lang, "summary.bring_label")}. ${tomorrow.bring}`);
    }
    const note = tomorrow.updates[0];
    if (note) {
      parts.push(`${t(lang, "summary.note_label")}. ${note.body}`);
    }
  }
  if (tomorrow.excursion) {
    parts.push(tomorrow.excursion.title);
  }
  const body = parts.length > 0 ? parts.join(" ") : t(lang, "summary.empty");
  return {
    title: t(lang, "summary.title"),
    body,
    source: "template",
    happening: tomorrow.happening,
    bring: tomorrow.bring,
    highlights,
  };
}
