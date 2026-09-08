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
    input[type=email], input[type=text], input[type=file], textarea, select { width: 100%; padding: 0.6rem 0.7rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
    button, .btn { display: inline-block; border: 0; border-radius: 999px; padding: 0.65rem 1rem; background: var(--accent); color: #fff; font: inherit; text-decoration: none; cursor: pointer; }
    button.secondary, .btn.secondary { background: #44403c; }
    form.stack { display: grid; gap: 0.5rem; }
    .row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .banner { background: #ecfdf5; border: 1px solid #99f6e4; padding: 0.75rem 1rem; border-radius: 10px; }
    footer { max-width: 40rem; margin: 0 auto; padding: 0 1.25rem 1.25rem; font-size: 0.75rem; }
    label.switch { display: flex; align-items: flex-start; gap: 0.65rem; margin: 0.85rem 0; }
    label.switch input { width: 1.2rem; height: 1.2rem; margin-top: 0.15rem; flex: 0 0 auto; }
    .hold-hint { font-size: 0.8rem; margin: 0; }
    .thumb { max-width: 100%; max-height: 14rem; border-radius: 8px; display: block; }
    body.landing { font-family: "Trebuchet MS", "Segoe UI", sans-serif; background:
      radial-gradient(900px 420px at 10% -10%, #ffe7c2 0%, transparent 58%),
      radial-gradient(700px 380px at 110% 8%, #c7f0e8 0%, transparent 52%),
      linear-gradient(180deg, #fff8ee 0%, #faf7f2 42%, #f4f1ec 100%); }
    body.landing header, body.landing main, body.landing footer { max-width: 46rem; }
    body.landing header strong { font-size: 1.2rem; color: #0f766e; }
    .landing .hero { background: #fff; border-radius: 28px; padding: 1.6rem 1.4rem 1.5rem; box-shadow: 0 14px 36px rgba(28, 25, 23, 0.08); margin: 0 0 1.25rem; border: 1px solid #f3e7d4; }
    .landing .hero h1 { font-size: clamp(1.7rem, 5.4vw, 2.45rem); line-height: 1.15; color: #1a3a4a; margin: 0 0 0.7rem; }
    .landing .hero-sub { font-size: 1.05rem; color: #44403c; margin: 0; }
    .pillars { display: grid; gap: 0.9rem; margin: 0 0 1.25rem; }
    @media (min-width: 640px) { .pillars { grid-template-columns: 1fr 1fr; } }
    .pillar { border-radius: 22px; padding: 1.15rem 1.15rem 1.05rem; box-shadow: 0 10px 28px rgba(28, 25, 23, 0.07); border: 0; margin: 0; min-width: 0; }
    .pillar h2 { font-size: 1.12rem; margin: 0.55rem 0 0.4rem; color: #1c1917; }
    .pillar p, .pillar li { font-size: 0.96rem; margin: 0 0 0.45rem; }
    .pillar ul { margin: 0.35rem 0 0; padding-left: 1.1rem; }
    .pillar-icon { width: 2.6rem; height: 2.6rem; border-radius: 14px; display: grid; place-items: center; }
    .pillar.route { background: #fff1df; }
    .pillar.route .pillar-icon { background: #fb923c; }
    .pillar.ask { background: #def4ff; }
    .pillar.ask .pillar-icon { background: #38bdf8; }
    .pillar.dials { background: #efe4ff; }
    .pillar.dials .pillar-icon { background: #c084fc; }
    .pillar.privacy { background: #ddf7e8; }
    .pillar.privacy .pillar-icon { background: #34d399; }
    .landing .panel { border-radius: 22px; box-shadow: 0 10px 28px rgba(28, 25, 23, 0.07); border: 1px solid #f0e6d6; }
    .landing .panel h2 { margin-top: 0; }
    .landing button, .landing .btn { box-shadow: 0 6px 16px rgba(15, 118, 110, 0.22); }
  `;
}

function IconRoute() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <circle cx="8" cy="8" r="4" fill="#fff7ed" />
      <circle cx="24" cy="24" r="4" fill="#fff7ed" />
      <path
        d="M10 10 C16 10 16 22 22 22"
        fill="none"
        stroke="#fff7ed"
        stroke-width="2.4"
        stroke-linecap="round"
      />
    </svg>
  );
}

function IconAsk() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <rect x="6" y="8" width="20" height="14" rx="6" fill="#f0f9ff" />
      <circle cx="13" cy="15" r="1.6" fill="#0369a1" />
      <circle cx="19" cy="15" r="1.6" fill="#0369a1" />
      <path
        d="M12 24 L16 20 L20 24"
        fill="#f0f9ff"
        stroke="#f0f9ff"
        stroke-width="1"
      />
    </svg>
  );
}

function IconDials() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <path
        d="M8 10 H24 M8 16 H24 M8 22 H24"
        stroke="#faf5ff"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <circle cx="20" cy="10" r="2.3" fill="#faf5ff" />
      <circle cx="12" cy="16" r="2.3" fill="#faf5ff" />
      <circle cx="18" cy="22" r="2.3" fill="#faf5ff" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <rect x="8" y="14" width="16" height="12" rx="3" fill="#ecfdf5" />
      <path
        d="M12 14 V12 a4 4 0 0 1 8 0 V14"
        fill="none"
        stroke="#ecfdf5"
        stroke-width="2.3"
        stroke-linecap="round"
      />
    </svg>
  );
}

export function Landing(props: { googleReady: boolean }) {
  const locale = "en" as const;
  const { googleReady } = props;
  return (
    <div class="landing">
      <section class="hero">
        <h1>{t(locale, "landing.h1")}</h1>
        <p class="hero-sub">{t(locale, "landing.h2")}</p>
      </section>
      <section class="pillars">
        <article class="pillar route">
          <div class="pillar-icon">
            <IconRoute />
          </div>
          <h2>{t(locale, "landing.pillar1_title")}</h2>
          <p>{t(locale, "landing.pillar1_lead")}</p>
          <ul>
            <li>{t(locale, "landing.pillar1_late")}</li>
            <li>{t(locale, "landing.pillar1_social")}</li>
            <li>{t(locale, "landing.pillar1_action")}</li>
          </ul>
        </article>
        <article class="pillar ask">
          <div class="pillar-icon">
            <IconAsk />
          </div>
          <h2>{t(locale, "landing.pillar2_title")}</h2>
          <p>{t(locale, "landing.pillar2_body")}</p>
        </article>
        <article class="pillar dials">
          <div class="pillar-icon">
            <IconDials />
          </div>
          <h2>{t(locale, "landing.pillar3_title")}</h2>
          <p>{t(locale, "landing.pillar3_body")}</p>
        </article>
        <article class="pillar privacy">
          <div class="pillar-icon">
            <IconLock />
          </div>
          <h2>{t(locale, "landing.pillar4_title")}</h2>
          <p>{t(locale, "landing.pillar4_body")}</p>
          <p>
            <a href="/privacy">{t(locale, "consent.public_title")}</a>
          </p>
        </article>
      </section>
      <section class="card stack panel">
        <h2>{t(locale, "landing.demo")}</h2>
        <p>
          {t(locale, "landing.invite")}: <code>PIN4B1</code>
        </p>
        <form class="stack" method="post" action="/join">
          <label for="landing-invite">{t(locale, "landing.invite")}</label>
          <input
            id="landing-invite"
            name="inviteCode"
            type="text"
            required
            autocomplete="off"
            value="PIN4B1"
          />
          <button type="submit">{t(locale, "landing.join_now")}</button>
        </form>
      </section>
      <section class="card stack panel">
        <h2>{t(locale, "login.title")}</h2>
        <p class="muted">{t(locale, "landing.adults")}</p>
        {googleReady ? (
          <p>
            <a class="btn" href="/auth/google">
              {t(locale, "login.google")}
            </a>
          </p>
        ) : (
          <p class="muted">{t(locale, "login.google_missing")}</p>
        )}
        <form class="stack" method="post" action="/login">
          <label for="email">{t(locale, "login.email")}</label>
          <input id="email" name="email" type="email" required />
          <button type="submit">{t(locale, "login.send")}</button>
        </form>
        <p class="muted">{t(locale, "login.magic_backup")}</p>
        <p>{t(locale, "login.demo_hint")}</p>
        <div class="row">
          <form method="post" action="/login/demo">
            <input type="hidden" name="role" value="teacher" />
            <button type="submit">{t(locale, "login.demo_teacher")}</button>
          </form>
          <form method="post" action="/login/demo">
            <input type="hidden" name="role" value="guardian" />
            <button class="secondary" type="submit">
              {t(locale, "login.demo_parent")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export function Layout(props: {
  locale: Locale;
  actor: Actor | null;
  title: string;
  description?: string | undefined;
  children: Child;
  skin?: "landing" | undefined;
}) {
  const { locale, actor, title, description, children, skin } = props;
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
      <body class={skin === "landing" ? "landing" : ""}>
        <header>
          <strong>{t(locale, "app.name")}</strong>
          <nav>
            {actor ? (
              <>
                <a href={home}>{t(locale, "nav.home")}</a>
                <a href={`${home}/morning`}>{t(locale, "nav.morning")}</a>
                <a href={`${home}/group`}>{t(locale, "nav.group")}</a>
                <a href={`${home}/feed`}>{t(locale, "nav.feed")}</a>
                <a href={`${home}/tomorrow`}>{t(locale, "nav.tomorrow")}</a>
                <a href={`${home}/week`}>{t(locale, "nav.week")}</a>
                <a href={`${home}/dm`}>{t(locale, "nav.messages")}</a>
                <a
                  href={actor.role === "guardian" ? "/g/privacy" : "/t/privacy"}
                >
                  {t(locale, "nav.privacy")}
                </a>
                <a href="/features">{t(locale, "nav.features")}</a>
                <a
                  id="aula-bug-hold"
                  href="/bugs"
                  title={t(locale, "bugs.hold_hint")}
                >
                  {t(locale, "nav.bugs")}
                </a>
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
        {actor ? (
          <p
            class="muted hold-hint"
            style="max-width:40rem;margin:0 auto;padding:0 1.25rem"
          >
            {t(locale, "bugs.hold_hint")}
          </p>
        ) : null}
        <main>{children}</main>
        <footer class="muted">{appSha()}</footer>
        {actor ? (
          <script>{`(function(){var hold=null;var btn=document.getElementById("aula-bug-hold");if(!btn)return;function go(withPath){var url="/bugs";if(withPath){url+="?from="+encodeURIComponent(location.pathname+location.search);}location.href=url;}function start(){hold=setTimeout(function(){hold=null;go(true);},550);}function cancel(){if(hold){clearTimeout(hold);hold=null;}}btn.addEventListener("pointerdown",start);btn.addEventListener("pointerup",function(){if(hold){cancel();go(false);}});btn.addEventListener("pointerleave",cancel);btn.addEventListener("pointercancel",cancel);btn.addEventListener("contextmenu",function(ev){ev.preventDefault();});})();`}</script>
        ) : null}
      </body>
    </html>
  );
}
