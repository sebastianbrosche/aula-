import type { Actor, Locale } from "@aula/core";
import { t } from "@aula/core";
import type { Child } from "hono/jsx";
import { appSha } from "../sha.ts";

export function css(): string {
  return `
    :root { color-scheme: light; --ink: #1c1917; --muted: #57534e; --paper: #faf7f2; --card: #fff; --line: #e7e5e4; --accent: #0f766e; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: var(--paper); color: var(--ink); line-height: 1.5; }
    header, main { max-width: 40rem; margin: 0 auto; padding: 1.25rem; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    nav { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.95rem; }
    a { color: var(--accent); }
    h1, h2 { font-weight: 600; letter-spacing: -0.02em; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.1rem; margin: 0.75rem 0; }
    .muted { color: var(--muted); }
    label { display: block; margin: 0.75rem 0 0.35rem; }
    input[type=email], input[type=text], textarea, select { width: 100%; padding: 0.6rem 0.7rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
    button, .btn { display: inline-block; border: 0; border-radius: 999px; padding: 0.65rem 1rem; background: var(--accent); color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
    button.secondary, .btn.secondary { background: #44403c; }
    form.stack { display: grid; gap: 0.5rem; }
    .row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .banner { background: #ecfdf5; border: 1px solid #99f6e4; padding: 0.75rem 1rem; border-radius: 10px; }
    footer { max-width: 40rem; margin: 0 auto; padding: 0 1.25rem 1.25rem; font-size: 0.75rem; }
  `;
}

export function Layout(props: {
  locale: Locale;
  actor: Actor | null;
  title: string;
  description?: string | undefined;
  children: Child;
}) {
  const { locale, actor, title, description, children } = props;
  const home = actor?.role === "guardian" ? "/g" : "/t";
  return (
    <html lang={locale}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description ? <meta name="description" content={description} /> : null}
        <style>{css()}</style>
      </head>
      <body>
        <header>
          <strong>{t(locale, "app.name")}</strong>
          <nav>
            {actor ? (
              <>
                <a href={home}>{t(locale, "nav.home")}</a>
                <a href={`${home}/group`}>{t(locale, "nav.group")}</a>
                <a href={`${home}/feed`}>{t(locale, "nav.feed")}</a>
                <a href={`${home}/tomorrow`}>{t(locale, "nav.tomorrow")}</a>
                {actor.role === "guardian" ? (
                  <a href="/g/privacy">{t(locale, "nav.privacy")}</a>
                ) : null}
                <a href="/bugs">{t(locale, "nav.bugs")}</a>
                <form method="post" action="/logout" style="display:inline">
                  <button class="secondary" type="submit">
                    {t(locale, "nav.logout")}
                  </button>
                </form>
              </>
            ) : null}
            <a href="/locale/en">{t(locale, "nav.en")}</a>
            <a href="/locale/pt-PT">{t(locale, "nav.pt")}</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer class="muted">{appSha()}</footer>
      </body>
    </html>
  );
}
