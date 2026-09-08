import type { Actor, Locale } from "@aula/core";
import { t } from "@aula/core";
import type { Child } from "hono/jsx";
import { appSha } from "../sha.ts";

const GITHUB = "https://github.com/sebastianbrosche/aula-";

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
    body.landing, body.login { font-family: "Trebuchet MS", "Segoe UI", sans-serif; }
    body.landing { background:
      radial-gradient(900px 420px at 10% -10%, #ffe7c2 0%, transparent 58%),
      radial-gradient(700px 380px at 110% 8%, #c7f0e8 0%, transparent 52%),
      linear-gradient(180deg, #fff8ee 0%, #faf7f2 42%, #f4f1ec 100%); }
    body.landing header.app-bar, body.landing > footer.app-foot { display: none; }
    body.landing main { max-width: 68rem; padding-top: 0.4rem; }
    .mkt-bar { position: sticky; top: 0; z-index: 30; background: rgba(255, 248, 238, 0.94); backdrop-filter: blur(12px); border-bottom: 1px solid #f0e6d6; }
    .mkt-bar-inner { max-width: 68rem; margin: 0 auto; padding: 0.7rem 1.15rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .mkt-brand { font-weight: 700; font-size: 1.25rem; color: #0f766e; text-decoration: none; }
    .mkt-nav { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center; font-size: 0.92rem; }
    .mkt-nav a { text-decoration: none; color: #3f3a36; }
    .btn.ghost { background: transparent; color: #1c1917; border: 1px solid #d6d3d1; box-shadow: none; }
    .landing .hero { display: grid; gap: 1.2rem; background: #fff; border-radius: 28px; padding: 1.5rem 1.35rem 1.4rem; box-shadow: 0 14px 36px rgba(28, 25, 23, 0.08); margin: 0 0 1.4rem; border: 1px solid #f3e7d4; }
    @media (min-width: 860px) { .landing .hero { grid-template-columns: 1.1fr 0.9fr; align-items: center; } }
    .landing .hero h1 { font-size: clamp(1.7rem, 4.6vw, 2.5rem); line-height: 1.12; color: #1a3a4a; margin: 0 0 0.7rem; }
    .landing .hero-sub { font-size: 1.05rem; color: #44403c; margin: 0 0 1rem; }
    .landing .hero-cta { display: flex; flex-wrap: wrap; gap: 0.55rem; }
    .browser { background: #292524; border-radius: 16px; padding: 0.55rem 0.55rem 0.7rem; box-shadow: 0 16px 32px rgba(28, 25, 23, 0.22); }
    .browser-dots { display: flex; gap: 0.35rem; padding: 0.15rem 0.25rem 0.45rem; }
    .browser-dots i { width: 0.55rem; height: 0.55rem; border-radius: 999px; display: block; background: #a8a29e; }
    .browser-dots i:first-child { background: #f87171; }
    .browser-screen { background: #fffaf5; border-radius: 10px; padding: 0.75rem; color: #1c1917; }
    .mock-row { display: flex; gap: 0.45rem; align-items: flex-start; margin: 0.45rem 0; font-size: 0.88rem; }
    .badge { display: inline-block; border-radius: 999px; padding: 0.12rem 0.5rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.02em; }
    .badge.action { background: #ffedd5; color: #9a3412; }
    .badge.social { background: #ede9fe; color: #5b21b6; }
    .contrast { display: grid; gap: 0.85rem; margin: 0 0 1.4rem; }
    @media (min-width: 700px) { .contrast { grid-template-columns: 1fr 1fr; } }
    .contrast .card { margin: 0; border-radius: 20px; }
    .contrast .chaos { background: #fff1f2; border-color: #fecdd3; }
    .contrast .calm { background: #ecfdf5; border-color: #a7f3d0; }
    .pillars { display: grid; gap: 0.9rem; margin: 0 0 1.4rem; }
    @media (min-width: 800px) { .pillars { grid-template-columns: 1fr 1fr; } }
    .pillar { border-radius: 22px; padding: 1.15rem 1.15rem 1.05rem; box-shadow: 0 10px 28px rgba(28, 25, 23, 0.07); border: 0; margin: 0; min-width: 0; }
    .pillar h2 { font-size: 1.12rem; margin: 0.55rem 0 0.4rem; color: #1c1917; }
    .pillar p, .pillar li { font-size: 0.96rem; margin: 0 0 0.45rem; }
    .pillar ul { margin: 0.35rem 0 0.6rem; padding-left: 1.1rem; }
    .pillar-icon { width: 2.6rem; height: 2.6rem; border-radius: 14px; display: grid; place-items: center; }
    .pillar.route { background: #fff1df; }
    .pillar.route .pillar-icon { background: #fb923c; }
    .pillar.ask { background: #def4ff; }
    .pillar.ask .pillar-icon { background: #38bdf8; }
    .pillar.dials { background: #efe4ff; }
    .pillar.dials .pillar-icon { background: #c084fc; }
    .pillar.privacy { background: #ddf7e8; }
    .pillar.privacy .pillar-icon { background: #34d399; }
    .snippet { background: rgba(255,255,255,0.72); border-radius: 14px; padding: 0.7rem; margin-top: 0.55rem; }
    .speaker { display: flex; gap: 0.7rem; align-items: center; }
    .speaker-orb { width: 2.6rem; height: 2.6rem; border-radius: 999px; background: radial-gradient(circle at 35% 30%, #e0f2fe, #0ea5e9); box-shadow: inset 0 0 0 3px #fff; flex: 0 0 auto; }
    .dial { display: flex; justify-content: space-between; gap: 0.6rem; align-items: center; font-size: 0.88rem; margin: 0.35rem 0; }
    .pill { border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.72rem; font-weight: 700; }
    .pill.on { background: #0f766e; color: #fff; }
    .pill.off { background: #e7e5e4; color: #44403c; }
    .audience { display: grid; gap: 0.85rem; margin: 0 0 1.4rem; }
    @media (min-width: 700px) { .audience { grid-template-columns: 1fr 1fr; } }
    .landing .panel { border-radius: 22px; box-shadow: 0 10px 28px rgba(28, 25, 23, 0.07); border: 1px solid #f0e6d6; }
    .landing .panel h2 { margin-top: 0; }
    .landing button, .landing .btn { box-shadow: 0 6px 16px rgba(15, 118, 110, 0.22); }
    .mkt-foot { max-width: 68rem; margin: 0 auto; padding: 1.4rem 1.15rem 0.4rem; display: flex; flex-wrap: wrap; gap: 0.75rem 1.1rem; }
    .mkt-sha { max-width: 68rem; margin: 0 auto; padding: 0 1.15rem 1.2rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.68rem; color: #a8a29e; }
    body.login main { max-width: 28rem; }
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

function FeedMock() {
  const locale = "en" as const;
  return (
    <div class="browser" aria-hidden="true">
      <div class="browser-dots">
        <i />
        <i />
        <i />
      </div>
      <div class="browser-screen">
        <strong>{t(locale, "app.name")}</strong>
        <p class="muted">{t(locale, "landing.mock_class")}</p>
        <div class="mock-row">
          <span class="badge action">{t(locale, "landing.badge_action")}</span>
          <span>{t(locale, "landing.mock_action")}</span>
        </div>
        <div class="mock-row">
          <span class="badge social">{t(locale, "landing.badge_social")}</span>
          <span>{t(locale, "landing.mock_social")}</span>
        </div>
        <div class="mock-row">
          <span>{t(locale, "landing.mock_bring")}</span>
        </div>
      </div>
    </div>
  );
}

function MarketingNav() {
  const locale = "en" as const;
  return (
    <div class="mkt-bar">
      <div class="mkt-bar-inner">
        <a class="mkt-brand" href="/">
          {t(locale, "app.name")}
        </a>
        <nav class="mkt-nav">
          <a href="#features">{t(locale, "landing.nav_features")}</a>
          <a href="/privacy">{t(locale, "landing.nav_privacy")}</a>
          <a href={GITHUB}>{t(locale, "landing.nav_github")}</a>
          <a href="/locale/en">{t(locale, "nav.en")}</a>
          <a href="/locale/pt-PT">{t(locale, "nav.pt")}</a>
          <a class="btn ghost" href="/login">
            {t(locale, "landing.nav_login")}
          </a>
          <a class="btn" href="#demo">
            {t(locale, "landing.nav_start")}
          </a>
        </nav>
      </div>
    </div>
  );
}

function MarketingFooter() {
  const locale = "en" as const;
  return (
    <>
      <footer class="mkt-foot">
        <a href={GITHUB}>{t(locale, "landing.github")}</a>
        <a href={GITHUB}>{t(locale, "landing.footer_docs")}</a>
        <a href="/privacy">{t(locale, "landing.nav_privacy")}</a>
        <a href="/terms">{t(locale, "landing.footer_terms")}</a>
        <a href="/bugs">{t(locale, "landing.footer_contact")}</a>
      </footer>
      <p class="mkt-sha">{appSha()}</p>
    </>
  );
}

export function Landing() {
  const locale = "en" as const;
  return (
    <div class="landing">
      <MarketingNav />
      <section class="hero">
        <div>
          <h1>{t(locale, "landing.h1")}</h1>
          <p class="hero-sub">{t(locale, "landing.h2")}</p>
          <div class="hero-cta">
            <a class="btn" href="#demo">
              {t(locale, "landing.cta_demo")}
            </a>
            <a class="btn ghost" href="/login">
              {t(locale, "landing.cta_access")}
            </a>
          </div>
        </div>
        <FeedMock />
      </section>
      <section class="contrast" id="problem">
        <div class="card chaos">
          <h2>{t(locale, "landing.problem_title")}</h2>
          <p>{t(locale, "landing.problem_wa")}</p>
        </div>
        <div class="card calm">
          <h2>{t(locale, "app.name")}</h2>
          <p>{t(locale, "landing.problem_aula")}</p>
        </div>
      </section>
      <section class="pillars" id="features">
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
          <div class="snippet">
            <div class="mock-row">
              <span class="badge action">
                {t(locale, "landing.badge_action")}
              </span>
              <span>{t(locale, "landing.mock_action")}</span>
            </div>
            <div class="mock-row">
              <span class="badge social">
                {t(locale, "landing.badge_social")}
              </span>
              <span>{t(locale, "landing.mock_social")}</span>
            </div>
          </div>
        </article>
        <article class="pillar ask">
          <div class="pillar-icon">
            <IconAsk />
          </div>
          <h2>{t(locale, "landing.pillar2_title")}</h2>
          <p>{t(locale, "landing.pillar2_body")}</p>
          <div class="snippet speaker">
            <div class="speaker-orb" />
            <div>
              <strong>{t(locale, "landing.speaker")}</strong>
              <p>{t(locale, "landing.digest_title")}</p>
              <ul>
                <li>{t(locale, "landing.digest_1")}</li>
                <li>{t(locale, "landing.digest_2")}</li>
                <li>{t(locale, "landing.digest_3")}</li>
              </ul>
            </div>
          </div>
        </article>
        <article class="pillar dials">
          <div class="pillar-icon">
            <IconDials />
          </div>
          <h2>{t(locale, "landing.pillar3_title")}</h2>
          <p>{t(locale, "landing.pillar3_body")}</p>
          <div class="snippet">
            <div class="dial">
              <span>{t(locale, "landing.dial_absences")}</span>
              <span class="pill on">{t(locale, "landing.dial_instant")}</span>
            </div>
            <div class="dial">
              <span>{t(locale, "landing.dial_photos")}</span>
              <span class="pill off">{t(locale, "landing.dial_sunday")}</span>
            </div>
          </div>
        </article>
        <article class="pillar privacy">
          <div class="pillar-icon">
            <IconLock />
          </div>
          <h2>{t(locale, "landing.pillar4_title")}</h2>
          <p>{t(locale, "landing.pillar4_body")}</p>
          <p>{t(locale, "landing.trust_privacy")}</p>
          <p>
            <a href="/privacy">{t(locale, "consent.public_title")}</a>
          </p>
        </article>
      </section>
      <section class="audience">
        <div class="card panel">
          <h2>{t(locale, "landing.audience_title")}</h2>
          <p>{t(locale, "landing.audience_parents")}</p>
          <p>{t(locale, "landing.audience_teachers")}</p>
        </div>
        <div class="card panel">
          <h2>{t(locale, "landing.install_title")}</h2>
          <p>{t(locale, "landing.install_body")}</p>
        </div>
      </section>
      <section class="card panel" id="trust">
        <h2>{t(locale, "landing.trust_title")}</h2>
        <p>{t(locale, "landing.trust_hosted")}</p>
        <p>{t(locale, "landing.trust_self")}</p>
        <p>
          <a href={GITHUB}>{GITHUB}</a>
        </p>
      </section>
      <section class="card stack panel" id="demo">
        <h2>{t(locale, "landing.demo")}</h2>
        <p>{t(locale, "landing.demo_lead")}</p>
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
      <MarketingFooter />
    </div>
  );
}

export function LoginScreen(props: { googleReady: boolean; locale: Locale }) {
  const { googleReady, locale } = props;
  return (
    <div class="card stack">
      <h1>{t(locale, "login.title")}</h1>
      <p class="muted">{t(locale, "landing.adults")}</p>
      <p class="muted">{t(locale, "login.lead")}</p>
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
      <p>
        <a href="/">{t(locale, "nav.home")}</a>
      </p>
    </div>
  );
}

export function Layout(props: {
  locale: Locale;
  actor: Actor | null;
  title: string;
  description?: string | undefined;
  children: Child;
  skin?: "landing" | "login" | undefined;
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
      <body
        class={skin === "landing" ? "landing" : skin === "login" ? "login" : ""}
      >
        {skin === "landing" ? null : (
          <header class="app-bar">
            <strong>
              <a href={actor ? home : "/"}>{t(locale, "app.name")}</a>
            </strong>
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
                    href={
                      actor.role === "guardian" ? "/g/privacy" : "/t/privacy"
                    }
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
              ) : (
                <a href="/login">{t("en", "landing.nav_login")}</a>
              )}
              <a href="/locale/en">{t(locale, "nav.en")}</a>
              <a href="/locale/pt-PT">{t(locale, "nav.pt")}</a>
            </nav>
          </header>
        )}
        {actor ? (
          <p
            class="muted hold-hint"
            style="max-width:40rem;margin:0 auto;padding:0 1.25rem"
          >
            {t(locale, "bugs.hold_hint")}
          </p>
        ) : null}
        <main>{children}</main>
        {skin === "landing" ? null : (
          <footer class="muted app-foot">{appSha()}</footer>
        )}
        {actor ? (
          <script>{`(function(){var hold=null;var btn=document.getElementById("aula-bug-hold");if(!btn)return;function go(withPath){var url="/bugs";if(withPath){url+="?from="+encodeURIComponent(location.pathname+location.search);}location.href=url;}function start(){hold=setTimeout(function(){hold=null;go(true);},550);}function cancel(){if(hold){clearTimeout(hold);hold=null;}}btn.addEventListener("pointerdown",start);btn.addEventListener("pointerup",function(){if(hold){cancel();go(false);}});btn.addEventListener("pointerleave",cancel);btn.addEventListener("pointercancel",cancel);btn.addEventListener("contextmenu",function(ev){ev.preventDefault();});})();`}</script>
        ) : null}
      </body>
    </html>
  );
}
