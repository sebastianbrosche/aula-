import type { MessageKey } from "@aula/core";
import {
  type Actor,
  AppError,
  actorFromSession,
  approveExcursion,
  askHome,
  type Ctx,
  callMcpTool,
  closeBug,
  consumeMagicLink,
  createGroup,
  createPost,
  type Db,
  decideFeature,
  demoLogin,
  exportStub,
  FOUNDATION_SQL,
  type GoogleConfig,
  type GoogleFetch,
  getDmThread,
  getFeedMedia,
  getGroup,
  getMorning,
  getPost,
  getPrivacy,
  getSummary,
  getTomorrow,
  getWeek,
  googleAuthorizeUrl,
  googleEmailFromCode,
  googleReady,
  inviteGroup,
  isAppError,
  joinGroup,
  type Locale,
  listDms,
  listFeed,
  listOpenBugs,
  listOpenFeatures,
  logout,
  lookupInviteClass,
  type Mailer,
  MCP_TOOLS,
  type MediaFile,
  type MediaStore,
  paymentsStub,
  postDmMessage,
  randomToken,
  recordAutoBug,
  reportBug,
  requestDm,
  requestMagicLink,
  requireRole,
  resetExcursion,
  respondDm,
  safeReportPath,
  savePrivacy,
  seedPinheiros,
  sessionForGoogleEmail,
  shouldRecordAutoBug,
  submitFeature,
  t,
} from "@aula/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { resolveSha, setAppSha } from "./sha.ts";
import { Layout } from "./views/ui.tsx";

const COOKIE = "aula_s";
const LOCALE_COOKIE = "aula_locale";
const GOOGLE_STATE = "aula_g";
const GOOGLE_PENDING = "aula_g_mail";

export type AppDeps = {
  db: Db;
  now?: () => number;
  mailer: Mailer;
  demoLogin: boolean;
  google?: GoogleConfig | undefined;
  googleFetch?: GoogleFetch | undefined;
  applySql?: (sql: string) => void | Promise<void>;
  sha?: string | undefined;
  media?: MediaStore | undefined;
};

function localeFrom(value: string | undefined, actor: Actor | null): Locale {
  if (value === "en" || value === "pt-PT") {
    return value;
  }
  return actor?.locale ?? "pt-PT";
}

function homePath(actor: Actor): string {
  return actor.role === "guardian" ? "/g" : "/t";
}

function errorKey(
  code:
    | "unauthenticated"
    | "forbidden"
    | "not_found"
    | "invalid"
    | "unavailable",
): MessageKey {
  switch (code) {
    case "unauthenticated":
      return "errors.unauthenticated";
    case "forbidden":
      return "errors.forbidden";
    case "not_found":
      return "errors.not_found";
    case "unavailable":
      return "errors.unavailable";
    default:
      return "errors.invalid";
  }
}

function asStatus(status: number): ContentfulStatusCode {
  return status as ContentfulStatusCode;
}

function routeId(c: Context): string {
  return c.req.param("id") ?? "";
}

async function fileFromBody(value: unknown): Promise<MediaFile | undefined> {
  if (!value || typeof value === "string") {
    return undefined;
  }
  if (value instanceof File) {
    if (value.size === 0) {
      return undefined;
    }
    return {
      data: await value.arrayBuffer(),
      contentType: value.type || "application/octet-stream",
    };
  }
  return undefined;
}

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const now = deps.now ?? (() => Date.now());
  const google = deps.google ?? {};
  const sha = resolveSha(deps.sha);
  setAppSha(sha);
  let ready = false;
  let boot: Promise<void> | null = null;

  async function ensureReady() {
    if (ready) {
      return;
    }
    if (!boot) {
      boot = (async () => {
        try {
          if (deps.applySql) {
            await deps.applySql(FOUNDATION_SQL);
          }
          await seedPinheiros(deps.db, now());
          ready = true;
        } catch (error) {
          boot = null;
          throw error;
        }
      })();
    }
    await boot;
  }

  app.use("*", async (c, next) => {
    if (c.req.path === "/healthz") {
      await next();
      return;
    }
    try {
      await ensureReady();
    } catch {
      // Seed or schema errors must not become an unhandled Worker crash.
    }
    await next();
  });

  const makeCtx = (): Ctx => ({ db: deps.db, now });

  async function actorOf(c: { req: { raw: Request } }): Promise<Actor | null> {
    try {
      return await actorFromSession(makeCtx(), getCookie(c as never, COOKIE));
    } catch {
      return null;
    }
  }

  async function noteAppError(
    c: Context,
    actor: Actor | null,
    error: unknown,
  ): Promise<void> {
    if (!isAppError(error) || !shouldRecordAutoBug(error)) {
      return;
    }
    await recordAutoBug(makeCtx(), actor, {
      path: c.req.path,
      sha,
      body: `auto ${error.code} ${c.req.method} ${c.req.path}`,
    });
  }

  function localeOf(c: { req: { raw: Request } }, actor: Actor | null): Locale {
    return localeFrom(getCookie(c as never, LOCALE_COOKIE), actor);
  }

  function writeSession(
    c: { header: (name: string, value: string) => void },
    token: string,
  ) {
    setCookie(c as never, COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  function writeGoogleState(
    c: { header: (name: string, value: string) => void },
    state: string,
  ) {
    setCookie(c as never, GOOGLE_STATE, state, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  function writeGooglePending(
    c: { header: (name: string, value: string) => void },
    email: string,
  ) {
    setCookie(c as never, GOOGLE_PENDING, email, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  app.get("/healthz", (c) => c.json({ ok: true, sha }));

  app.get("/locale/:tag", (c) => {
    const tag = c.req.param("tag") === "en" ? "en" : "pt-PT";
    setCookie(c, LOCALE_COOKIE, tag, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "Lax",
    });
    return c.redirect(c.req.header("referer") ?? "/", 302);
  });

  app.get("/", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (actor) {
      return c.redirect(homePath(actor), 302);
    }
    return c.html(
      <Layout
        locale={locale}
        actor={null}
        title={`${t("pt-PT", "landing.h1")} · aula`}
        description={`${t("pt-PT", "landing.h1")}. ${t("pt-PT", "landing.h3")} ${t("en", "landing.h1")}`}
      >
        <h1>{t("pt-PT", "landing.h1")}</h1>
        <p>{t("pt-PT", "landing.h2")}</p>
        <p>{t("pt-PT", "landing.h3")}</p>
        <p>{t("pt-PT", "landing.lead")}</p>
        <p class="muted">{t("pt-PT", "landing.ask")}</p>
        <p class="muted">{t("pt-PT", "landing.rgpd_note")}</p>
        <div class="card">
          <h2>{t("en", "landing.h1")}</h2>
          <p>{t("en", "landing.h2")}</p>
          <p>{t("en", "landing.h3")}</p>
          <p class="muted">{t("en", "landing.ask")}</p>
          <p class="muted">{t("en", "landing.rgpd_note")}</p>
        </div>
        <div class="card">
          <h2>{t(locale, "landing.yolo_title")}</h2>
          <p>{t(locale, "landing.yolo_body")}</p>
          <p class="muted">{t(locale, "landing.rgpd_note")}</p>
          <p>
            <a href="/privacy">{t(locale, "consent.public_title")}</a>
          </p>
        </div>
        <div class="card stack">
          <h2>{t(locale, "landing.join")}</h2>
          <p>
            <strong>{t(locale, "landing.first")}</strong>
          </p>
          <p>{t(locale, "landing.join_lead")}</p>
          <p>
            {t(locale, "join.code")}: <code>PIN4B1</code>
          </p>
          <form class="stack" method="post" action="/join">
            <label for="landing-invite">{t(locale, "join.code")}</label>
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
          <p>
            <a href="/join">{t(locale, "join.title")}</a>
          </p>
        </div>
        <h2>{t(locale, "login.title")}</h2>
        <p class="muted">{t(locale, "landing.sign_in")}</p>
        <p class="muted">{t(locale, "login.lead")}</p>
        <div class="card">
          {googleReady(google) ? (
            <>
              <p>{t(locale, "login.google_help")}</p>
              <p>
                <a class="btn" href="/auth/google">
                  {t(locale, "login.google")}
                </a>
              </p>
            </>
          ) : (
            <p class="muted">{t(locale, "login.google_missing")}</p>
          )}
        </div>
        <form class="stack card" method="post" action="/login">
          <p class="muted">{t(locale, "login.magic_backup")}</p>
          <label for="email">{t(locale, "login.email")}</label>
          <input id="email" name="email" type="email" required />
          <button type="submit">{t(locale, "login.send")}</button>
        </form>
        <div class="card">
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
        </div>
      </Layout>,
    );
  });

  app.post("/login", async (c) => {
    const locale = localeOf(c, null);
    const body = await c.req.parseBody();
    try {
      const result = await requestMagicLink(makeCtx(), deps.mailer, {
        email: String(body.email ?? ""),
        origin: new URL(c.req.url).origin,
        demoLogin: deps.demoLogin,
      });
      return c.html(
        <Layout locale={locale} actor={null} title={t(locale, "login.title")}>
          <div class="banner">
            {t(
              locale,
              result.sent
                ? "login.sent"
                : result.reason
                  ? "login.send_failed"
                  : "login.link_ready",
            )}
          </div>
          {result.reason ? <p class="muted">{result.reason}</p> : null}
          {result.previewUrl ? (
            <p>
              <a href={result.previewUrl}>{result.previewUrl}</a>
            </p>
          ) : null}
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.html(
          <Layout locale={locale} actor={null} title={t(locale, "login.title")}>
            <p>{t(locale, errorKey(error.code))}</p>
          </Layout>,
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  app.post("/login/demo", async (c) => {
    const body = await c.req.parseBody();
    const role = body.role === "teacher" ? "teacher" : "guardian";
    try {
      const token = await demoLogin(makeCtx(), role, deps.demoLogin);
      writeSession(c, token);
      return c.redirect(role === "teacher" ? "/t" : "/g", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t("en", errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  app.get("/auth/verify", async (c) => {
    const locale = localeOf(c, null);
    try {
      const token = await consumeMagicLink(makeCtx(), c.req.query("t") ?? "");
      writeSession(c, token);
      const actor = await actorFromSession(makeCtx(), token);
      return c.redirect(actor ? homePath(actor) : "/", 302);
    } catch {
      return c.html(
        <Layout locale={locale} actor={null} title={t(locale, "login.invalid")}>
          <p>{t(locale, "login.invalid")}</p>
        </Layout>,
        400,
      );
    }
  });

  function googleUnavailablePage(c: Context) {
    const locale = localeOf(c, null);
    return c.html(
      <Layout locale={locale} actor={null} title={t(locale, "login.google")}>
        <p>{t(locale, "login.google_missing")}</p>
        <p class="muted">{t(locale, "login.magic_backup")}</p>
        <p>
          <a href="/">{t(locale, "login.send")}</a>
        </p>
      </Layout>,
      503,
    );
  }

  async function startGoogle(c: Context) {
    if (!googleReady(google)) {
      return googleUnavailablePage(c);
    }
    const state = randomToken();
    writeGoogleState(c, state);
    return c.redirect(
      googleAuthorizeUrl(google, new URL(c.req.url).origin, state),
      302,
    );
  }

  app.get("/auth/google", (c) => startGoogle(c));
  app.get("/v1/auth/google", (c) => {
    if (!googleReady(google)) {
      return c.json({ error: "unavailable" }, 503);
    }
    const state = randomToken();
    writeGoogleState(c, state);
    return c.json({
      url: googleAuthorizeUrl(google, new URL(c.req.url).origin, state),
    });
  });

  app.get("/auth/google/callback", async (c) => {
    const locale = localeOf(c, null);
    const expected = getCookie(c, GOOGLE_STATE);
    const state = c.req.query("state") ?? "";
    const code = c.req.query("code") ?? "";
    if (!expected || expected !== state || !code) {
      return c.html(
        <Layout locale={locale} actor={null} title={t(locale, "login.invalid")}>
          <p>{t(locale, "login.invalid")}</p>
        </Layout>,
        400,
      );
    }
    try {
      const email = await googleEmailFromCode(
        google,
        new URL(c.req.url).origin,
        code,
        deps.googleFetch ?? fetch,
      );
      try {
        const token = await sessionForGoogleEmail(makeCtx(), email);
        writeSession(c, token);
        const actor = await actorFromSession(makeCtx(), token);
        return c.redirect(actor ? homePath(actor) : "/", 302);
      } catch (error) {
        if (isAppError(error) && error.code === "not_found" && deps.demoLogin) {
          writeGooglePending(c, email);
          return c.html(
            <Layout
              locale={locale}
              actor={null}
              title={t(locale, "login.google_pick")}
            >
              <h1>{t(locale, "login.google_pick")}</h1>
              <p>{t(locale, "login.google_pick_lead")}</p>
              <div class="row">
                <form method="post" action="/login/google/demo">
                  <input type="hidden" name="role" value="teacher" />
                  <button type="submit">
                    {t(locale, "login.demo_teacher")}
                  </button>
                </form>
                <form method="post" action="/login/google/demo">
                  <input type="hidden" name="role" value="guardian" />
                  <button class="secondary" type="submit">
                    {t(locale, "login.demo_parent")}
                  </button>
                </form>
              </div>
            </Layout>,
          );
        }
        throw error;
      }
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  app.post("/login/google/demo", async (c) => {
    const pending = getCookie(c, GOOGLE_PENDING);
    if (!pending || !deps.demoLogin) {
      return c.redirect("/", 302);
    }
    const body = await c.req.parseBody();
    const role = body.role === "teacher" ? "teacher" : "guardian";
    try {
      const token = await demoLogin(makeCtx(), role, deps.demoLogin);
      writeSession(c, token);
      deleteCookie(c, GOOGLE_PENDING, { path: "/" });
      return c.redirect(role === "teacher" ? "/t" : "/g", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t("en", errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  function denyStudentCard(c: Context) {
    return c.json({ error: "children_do_not_log_in" }, 403);
  }

  app.post("/v1/auth/student-card", (c) => denyStudentCard(c));

  function inviteCodeFrom(body: { inviteCode?: unknown }): string {
    return String(body.inviteCode ?? "");
  }

  app.get("/join", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "join.title")}>
        <h1>{t(locale, "join.title")}</h1>
        <p>{t(locale, "join.lead")}</p>
        <form class="card stack" method="post" action="/join">
          <label for="join-invite">{t(locale, "join.code")}</label>
          <input
            id="join-invite"
            name="inviteCode"
            type="text"
            required
            autocomplete="off"
            value="PIN4B1"
          />
          <button type="submit">{t(locale, "join.submit")}</button>
        </form>
        {actor ? null : (
          <p class="muted">
            {t(locale, "join.sign_in")}{" "}
            <a href="/">{t(locale, "landing.sign_in")}</a>
          </p>
        )}
      </Layout>,
    );
  });

  app.post("/join", async (c) => {
    const wantsJson =
      (c.req.header("content-type") ?? "").includes("json") ||
      (c.req.header("accept") ?? "").includes("application/json");
    const raw = wantsJson
      ? await c.req.json<{ inviteCode?: string }>().catch(() => ({}))
      : await c.req.parseBody();
    const inviteCode = inviteCodeFrom(raw);
    let actor = await actorOf(c);
    const locale = localeOf(c, actor);
    try {
      await lookupInviteClass(makeCtx(), inviteCode);
      if (!actor && deps.demoLogin) {
        const token = await demoLogin(makeCtx(), "guardian", deps.demoLogin);
        writeSession(c, token);
        actor = await actorFromSession(makeCtx(), token);
      }
      const joined = await joinGroup(makeCtx(), actor, inviteCode);
      if (wantsJson) {
        return c.json(joined);
      }
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "join.title")}>
          <h1>{t(locale, "join.title")}</h1>
          <p>{t(locale, joined.already ? "group.already" : "group.join_ok")}</p>
          <div class="card">
            <p>
              <strong>{joined.schoolName}</strong>
            </p>
            <p>
              {t(locale, "group.class")}: <strong>{joined.className}</strong>
            </p>
            <p>
              {t(locale, "group.invite")}: <code>{joined.inviteCode}</code>
            </p>
          </div>
          <p>
            <a class="btn" href={actor ? homePath(actor) : "/"}>
              {t(locale, "nav.home")}
            </a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        const message =
          error.code === "invalid"
            ? t(locale, "group.bad_code")
            : t(locale, errorKey(error.code));
        if (wantsJson) {
          return c.json({ error: error.code }, asStatus(error.status));
        }
        return c.html(
          <Layout locale={locale} actor={actor} title={t(locale, "join.title")}>
            <p>{message}</p>
            <p>
              <a href="/join">{t(locale, "join.title")}</a>
            </p>
          </Layout>,
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  app.post("/logout", async (c) => {
    await logout(makeCtx(), getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: "/" });
    return c.redirect("/", 302);
  });

  async function requirePage(c: Context, side?: "teacher" | "guardian") {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (!actor) {
      return {
        actor: null,
        locale,
        unauthorized: c.redirect("/", 302),
        forbidden: null,
      };
    }
    if (side === "guardian" && actor.role !== "guardian") {
      return {
        actor,
        locale,
        unauthorized: null,
        forbidden: c.text(t(locale, "errors.forbidden"), 403),
      };
    }
    if (side === "teacher" && actor.role === "guardian") {
      return {
        actor,
        locale,
        unauthorized: null,
        forbidden: c.text(t(locale, "errors.forbidden"), 403),
      };
    }
    return { actor, locale, unauthorized: null, forbidden: null };
  }

  app.get("/t", async (c) => {
    const gate = await requirePage(c, "teacher");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const feed = await listFeed(makeCtx(), actor, locale);
    const tomorrow = await getTomorrow(makeCtx(), actor, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "app.name")}>
        <h1>{t(locale, "home.hello", { name: actor.firstName })}</h1>
        <p class="muted">{t(locale, "home.as_teacher")}</p>
        <p>
          <a class="btn" href="/t/morning">
            {t(locale, "morning.open")}
          </a>
          <a class="btn secondary" href="/t/summary">
            {t(locale, "summary.open")}
          </a>
          <a class="btn secondary" href="/t/week">
            {t(locale, "week.open")}
          </a>
        </p>
        <p>
          <a class="btn secondary" href="/t/export">
            {t(locale, "export.open")}
          </a>
        </p>
        <form class="card stack" method="get" action="/t/ask">
          <label for="ask-home-t">{t(locale, "ask.title")}</label>
          <input
            id="ask-home-t"
            name="q"
            type="text"
            required
            maxlength={200}
            placeholder={t(locale, "ask.placeholder")}
          />
          <button type="submit">{t(locale, "ask.submit")}</button>
        </form>
        <div class="card">
          <h2>{t(locale, "feed.title")}</h2>
          <p>{feed[0]?.body}</p>
        </div>
        <div class="card">
          <h2>{t(locale, "tomorrow.title")}</h2>
          <p>{tomorrow.happening}</p>
        </div>
      </Layout>,
    );
  });

  app.get("/g", async (c) => {
    const gate = await requirePage(c, "guardian");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const feed = await listFeed(makeCtx(), actor, locale);
    const tomorrow = await getTomorrow(makeCtx(), actor, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "app.name")}>
        <h1>{t(locale, "home.hello", { name: actor.firstName })}</h1>
        <p class="muted">{t(locale, "home.as_parent")}</p>
        <p>
          <a class="btn" href="/g/morning">
            {t(locale, "morning.open")}
          </a>
          <a class="btn secondary" href="/g/summary">
            {t(locale, "summary.open")}
          </a>
          <a class="btn secondary" href="/g/week">
            {t(locale, "week.open")}
          </a>
        </p>
        <div class="card">
          <h2>{t(locale, "payments.title")}</h2>
          <p>{t(locale, "payments.lead")}</p>
          <p class="muted">{t(locale, "payments.test")}</p>
          <p>
            <a href="/g/payments">{t(locale, "payments.title")}</a>
          </p>
        </div>
        <form class="card stack" method="get" action="/g/ask">
          <label for="ask-home-g">{t(locale, "ask.title")}</label>
          <input
            id="ask-home-g"
            name="q"
            type="text"
            required
            maxlength={200}
            placeholder={t(locale, "ask.placeholder")}
          />
          <button type="submit">{t(locale, "ask.submit")}</button>
        </form>
        <div class="card">
          <h2>{t(locale, "feed.title")}</h2>
          <p>{feed[0]?.body}</p>
        </div>
        <div class="card">
          <h2>{t(locale, "tomorrow.title")}</h2>
          <p>{tomorrow.happening}</p>
        </div>
      </Layout>,
    );
  });

  async function renderSummary(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const digest = await getSummary(makeCtx(), actor, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={digest.title}>
        <h1>{digest.title}</h1>
        <p class="muted">{t(locale, "summary.lead")}</p>
        <div class="card">
          <p>{digest.body}</p>
        </div>
        <p class="muted">{t(locale, "summary.template_note")}</p>
      </Layout>,
    );
  }

  app.get("/t/summary", (c) => renderSummary(c, "teacher"));
  app.get("/g/summary", (c) => renderSummary(c, "guardian"));

  async function renderWeek(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const week = await getWeek(makeCtx(), actor, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "week.title")}>
        <h1>{t(locale, "week.title")}</h1>
        <p class="muted">{t(locale, "week.lead")}</p>
        <div class="card">
          <h2>{t(locale, "tomorrow.title")}</h2>
          <p>{week.tomorrow.happening ?? t(locale, "tomorrow.empty")}</p>
          <p>{week.tomorrow.bring ?? t(locale, "tomorrow.empty")}</p>
        </div>
        <div class="card">
          <h2>{t(locale, "week.notes")}</h2>
          {week.notes.length === 0 ? (
            <p>{t(locale, "week.empty")}</p>
          ) : (
            week.notes.map((note) => <p>{note.body}</p>)
          )}
        </div>
        <div class="card">
          <h2>{t(locale, "week.highlights")}</h2>
          {week.highlights.length === 0 ? (
            <p>{t(locale, "week.empty")}</p>
          ) : (
            week.highlights.map((item) => (
              <p>
                {item.title ? `${item.title}. ` : ""}
                {item.preview}
              </p>
            ))
          )}
        </div>
      </Layout>,
    );
  }

  app.get("/t/week", (c) => renderWeek(c, "teacher"));
  app.get("/g/week", (c) => renderWeek(c, "guardian"));

  async function renderMorning(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const morning = await getMorning(makeCtx(), actor, locale);
    const resumoHref = side === "guardian" ? "/g/summary" : "/t/summary";
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "morning.title")}>
        <h1>{t(locale, "morning.title")}</h1>
        <p class="muted">{t(locale, "morning.lead")}</p>
        <div class="card">
          <h2>{t(locale, "morning.happening")}</h2>
          <p>{morning.happening ?? t(locale, "tomorrow.empty")}</p>
        </div>
        <div class="card">
          <h2>{t(locale, "morning.bring")}</h2>
          <p>{morning.bring ?? t(locale, "tomorrow.empty")}</p>
        </div>
        {morning.excursion ? (
          <div class="card stack">
            <h2>{t(locale, "morning.excursion")}</h2>
            <p>{morning.excursion.title}</p>
            <p class="muted">
              {t(
                locale,
                morning.excursion.status === "auto"
                  ? "excursion.auto"
                  : morning.excursion.status === "approved"
                    ? "excursion.approved"
                    : "excursion.pending",
              )}
            </p>
            {side === "guardian" && morning.excursion.status === "pending" ? (
              <form method="post" action="/g/excursion">
                <input type="hidden" name="id" value={morning.excursion.id} />
                <button type="submit">{t(locale, "excursion.approve")}</button>
              </form>
            ) : null}
            {side === "teacher" ? (
              <form method="post" action="/t/excursion/reset">
                <p class="muted">{t(locale, "excursion.reset_help")}</p>
                <button class="secondary" type="submit">
                  {t(locale, "excursion.reset")}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
        <p>
          <a class="btn" href={resumoHref}>
            {t(locale, "morning.resumo")}
          </a>
        </p>
      </Layout>,
    );
  }

  app.get("/t/morning", (c) => renderMorning(c, "teacher"));
  app.get("/g/morning", (c) => renderMorning(c, "guardian"));

  async function renderAsk(
    c: Context,
    side: "teacher" | "guardian",
    question: string,
  ) {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const asked = question.trim();
    if (!asked) {
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "ask.title")}>
          <h1>{t(locale, "ask.title")}</h1>
          <p class="muted">{t(locale, "ask.lead")}</p>
          <form
            class="card stack"
            method="get"
            action={side === "guardian" ? "/g/ask" : "/t/ask"}
          >
            <label for="ask-page">{t(locale, "ask.title")}</label>
            <input
              id="ask-page"
              name="q"
              type="text"
              required
              maxlength={200}
              placeholder={t(locale, "ask.placeholder")}
            />
            <button type="submit">{t(locale, "ask.submit")}</button>
          </form>
        </Layout>,
      );
    }
    const result = await askHome(makeCtx(), actor, asked, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "ask.title")}>
        <h1>{t(locale, "ask.title")}</h1>
        <p class="muted">{t(locale, "ask.lead")}</p>
        <div class="card">
          <p>{result.answer}</p>
        </div>
        <p class="muted">{t(locale, "ask.template_note")}</p>
        <p>
          <a href={side === "guardian" ? "/g" : "/t"}>
            {t(locale, "nav.home")}
          </a>
        </p>
      </Layout>,
    );
  }

  app.get("/t/ask", (c) => renderAsk(c, "teacher", c.req.query("q") ?? ""));
  app.get("/g/ask", (c) => renderAsk(c, "guardian", c.req.query("q") ?? ""));
  app.post("/t/ask", async (c) => {
    const body = await c.req.parseBody();
    return renderAsk(c, "teacher", String(body.q ?? ""));
  });
  app.post("/g/ask", async (c) => {
    const body = await c.req.parseBody();
    return renderAsk(c, "guardian", String(body.q ?? ""));
  });

  async function renderGroup(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const group = await getGroup(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "group.title")}>
        <h1>{t(locale, "group.title")}</h1>
        <div class="card">
          <p>
            <strong>{group.schoolName}</strong>
          </p>
          <p>
            {t(locale, "group.class")}: <strong>{group.className}</strong>
          </p>
          <p>
            {t(locale, "group.invite")}: <code>{group.inviteCode}</code>
          </p>
          <h2>{t(locale, "group.adults")}</h2>
          <ul>
            {group.adults.map((person) => (
              <li>
                {person.displayName} (
                {t(
                  locale,
                  person.role === "teacher"
                    ? "group.role_teacher"
                    : "group.role_parent",
                )}
                )
              </li>
            ))}
          </ul>
          <h2>{t(locale, "group.children")}</h2>
          <ul>
            {group.children.map((child) => (
              <li>{child.displayName}</li>
            ))}
          </ul>
        </div>
        <form class="card stack" method="post" action="/group/join">
          <label for="inviteCode">{t(locale, "group.join")}</label>
          <input id="inviteCode" name="inviteCode" type="text" required />
          <button type="submit">{t(locale, "group.join")}</button>
        </form>
      </Layout>,
    );
  }

  app.get("/t/group", (c) => renderGroup(c, "teacher"));
  app.get("/g/group", (c) => renderGroup(c, "guardian"));

  app.post("/group/join", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    const body = await c.req.parseBody();
    try {
      await joinGroup(makeCtx(), actor, String(body.inviteCode ?? ""));
      return c.redirect(
        actor.role === "guardian" ? "/g/group" : "/t/group",
        302,
      );
    } catch (error) {
      if (isAppError(error)) {
        const locale = localeOf(c, actor);
        return c.text(
          error.code === "invalid"
            ? t(locale, "group.bad_code")
            : t(locale, errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  async function renderFeed(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const feed = await listFeed(makeCtx(), actor, locale);
    const storage = c.req.query("storage");
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "feed.title")}>
        <h1>{t(locale, "feed.title")}</h1>
        <p>
          <a class="btn" href={`${side === "guardian" ? "/g" : "/t"}/summary`}>
            {t(locale, "summary.open")}
          </a>
        </p>
        {storage === "stub" ? (
          <p class="muted">{t(locale, "feed.media_stub")}</p>
        ) : null}
        {storage === "r2" ? (
          <p class="muted">{t(locale, "feed.media_r2")}</p>
        ) : null}
        {actor.role === "teacher" || actor.role === "school_admin" ? (
          <form
            class="card stack"
            method="post"
            action="/t/feed"
            enctype="multipart/form-data"
          >
            <h2>{t(locale, "feed.compose")}</h2>
            <label for="type">{t(locale, "feed.compose_type")}</label>
            <select id="type" name="type">
              <option value="story">{t(locale, "feed.type_story")}</option>
              <option value="photo">{t(locale, "feed.type_photo")}</option>
              <option value="video">{t(locale, "feed.type_video")}</option>
              <option value="voice">{t(locale, "feed.type_voice")}</option>
              <option value="announcement">
                {t(locale, "feed.type_announcement")}
              </option>
            </select>
            <label for="body">{t(locale, "feed.compose_body")}</label>
            <textarea id="body" name="body" rows={4} />
            <label for="file">{t(locale, "feed.compose_file")}</label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*,video/*,audio/*"
            />
            <p class="muted">{t(locale, "feed.compose_media")}</p>
            <button type="submit">{t(locale, "feed.compose")}</button>
          </form>
        ) : null}
        {feed.length === 0 ? <p>{t(locale, "feed.empty")}</p> : null}
        {feed.map((post) => (
          <article class="card">
            <h2>{post.title}</h2>
            {post.redacted ? (
              <p class="muted">
                {post.label ?? t(locale, "feed.photo_refused")}
              </p>
            ) : null}
            <p>{post.truncated ? post.preview : post.body}</p>
            {post.truncated ? (
              <p>
                <a
                  href={`${side === "guardian" ? "/g" : "/t"}/feed/${post.id}`}
                >
                  {t(locale, "feed.read_more")}
                </a>
              </p>
            ) : null}
            {post.attachment &&
            !post.attachment.stub &&
            post.attachment.kind === "photo" ? (
              <p>
                <a href={post.attachment.href}>
                  <img
                    class="thumb"
                    src={post.attachment.href}
                    alt={post.attachment.label}
                  />
                </a>
              </p>
            ) : null}
            {post.attachment ? (
              <p>
                <a href={post.attachment.href}>{post.attachment.label}</a>
              </p>
            ) : null}
          </article>
        ))}
      </Layout>,
    );
  }

  app.get("/t/feed", (c) => renderFeed(c, "teacher"));
  app.get("/g/feed", (c) => renderFeed(c, "guardian"));

  async function renderFeedPost(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    try {
      const post = await getPost(makeCtx(), actor, routeId(c), locale);
      return c.html(
        <Layout
          locale={locale}
          actor={actor}
          title={post.title ?? t(locale, "feed.title")}
        >
          <h1>{post.title}</h1>
          {post.redacted ? (
            <p class="muted">{post.label ?? t(locale, "feed.photo_refused")}</p>
          ) : null}
          <p>{post.body}</p>
          {post.attachment &&
          !post.attachment.stub &&
          post.attachment.kind === "photo" ? (
            <p>
              <img
                class="thumb"
                src={post.attachment.href}
                alt={post.attachment.label}
              />
            </p>
          ) : null}
          {post.attachment ? (
            <p>
              <a href={post.attachment.href}>{post.attachment.label}</a>
            </p>
          ) : null}
        </Layout>,
      );
    } catch (error) {
      await noteAppError(c, actor, error);
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  }

  async function serveFeedMedia(c: Context) {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    try {
      const file = await getFeedMedia(makeCtx(), actor, routeId(c), deps.media);
      return new Response(file.data, {
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      await noteAppError(c, actor, error);
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  }

  app.get("/t/feed/:id/media", (c) => serveFeedMedia(c));
  app.get("/g/feed/:id/media", (c) => serveFeedMedia(c));
  app.get("/t/feed/:id", (c) => renderFeedPost(c, "teacher"));
  app.get("/g/feed/:id", (c) => renderFeedPost(c, "guardian"));

  app.post("/t/feed", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (actor.role === "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    try {
      const post = await createPost(
        makeCtx(),
        actor,
        {
          type: String(body.type ?? "story"),
          body: String(body.body ?? ""),
          file: await fileFromBody(body.file),
        },
        deps.media,
      );
      if (post.storage) {
        return c.redirect(`/t/feed?storage=${post.storage}`, 302);
      }
      return c.redirect("/t/feed", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  async function renderTomorrow(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const tomorrow = await getTomorrow(makeCtx(), actor, locale);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "tomorrow.title")}>
        <h1>{t(locale, "tomorrow.title")}</h1>
        <div class="card">
          <h2>{t(locale, "tomorrow.happening")}</h2>
          <p>{tomorrow.happening ?? t(locale, "tomorrow.empty")}</p>
          <h2>{t(locale, "tomorrow.bring")}</h2>
          <p>{tomorrow.bring ?? t(locale, "tomorrow.empty")}</p>
          <h2>{t(locale, "tomorrow.update")}</h2>
          {tomorrow.updates.map((update) => (
            <p>{update.body}</p>
          ))}
        </div>
        {tomorrow.excursion ? (
          <div class="card stack">
            <h2>{t(locale, "tomorrow.excursion")}</h2>
            <p>{tomorrow.excursion.title}</p>
            <p class="muted">
              {t(
                locale,
                tomorrow.excursion.status === "auto"
                  ? "excursion.auto"
                  : tomorrow.excursion.status === "approved"
                    ? "excursion.approved"
                    : "excursion.pending",
              )}
            </p>
            {side === "guardian" && tomorrow.excursion.status === "pending" ? (
              <form method="post" action="/g/excursion">
                <input type="hidden" name="id" value={tomorrow.excursion.id} />
                <button type="submit">{t(locale, "excursion.approve")}</button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Layout>,
    );
  }

  app.get("/t/tomorrow", (c) => renderTomorrow(c, "teacher"));
  app.get("/g/tomorrow", (c) => renderTomorrow(c, "guardian"));

  app.post("/t/excursion/reset", async (c) => {
    const gate = await requirePage(c, "teacher");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    try {
      await resetExcursion(makeCtx(), actor);
      return c.html(
        <Layout
          locale={locale}
          actor={actor}
          title={t(locale, "morning.title")}
        >
          <div class="banner">{t(locale, "excursion.reset_ok")}</div>
          <p>
            <a class="btn" href="/t/morning">
              {t(locale, "morning.open")}
            </a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  app.post("/g/excursion", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (actor.role !== "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    try {
      await approveExcursion(makeCtx(), actor, String(body.id ?? ""));
      return c.redirect("/g/tomorrow", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  async function renderDmList(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const inbox = await listDms(makeCtx(), actor);
    const group = side === "teacher" ? await getGroup(makeCtx(), actor) : null;
    const parents =
      group?.adults.filter((person) => person.role === "guardian") ?? [];
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "dm.title")}>
        <h1>{t(locale, "dm.title")}</h1>
        {side === "teacher" ? (
          <form class="card stack" method="post" action="/t/dm">
            <label for="guardianId">{t(locale, "dm.request")}</label>
            <select id="guardianId" name="guardianId">
              {parents.map((person) => (
                <option value={person.id}>{person.displayName}</option>
              ))}
            </select>
            <button type="submit">{t(locale, "dm.request")}</button>
          </form>
        ) : null}
        {inbox.length === 0 ? <p>{t(locale, "dm.empty")}</p> : null}
        {inbox.map((item) => (
          <div class="card">
            <p>
              {item.peerName} ({item.status})
            </p>
            {side === "guardian" && item.status === "pending" ? (
              <div class="row">
                <form method="post" action={`/g/dm/${item.id}`}>
                  <input type="hidden" name="action" value="accept" />
                  <button type="submit">{t(locale, "dm.accept")}</button>
                </form>
                <form method="post" action={`/g/dm/${item.id}`}>
                  <input type="hidden" name="action" value="decline" />
                  <button class="secondary" type="submit">
                    {t(locale, "dm.decline")}
                  </button>
                </form>
              </div>
            ) : null}
            {item.status === "accepted" ? (
              <p>
                <a href={`${side === "guardian" ? "/g" : "/t"}/dm/${item.id}`}>
                  {t(locale, "dm.accepted")}
                </a>
              </p>
            ) : null}
          </div>
        ))}
      </Layout>,
    );
  }

  app.get("/t/dm", (c) => renderDmList(c, "teacher"));
  app.get("/g/dm", (c) => renderDmList(c, "guardian"));

  app.post("/t/dm", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (actor.role === "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    try {
      await requestDm(makeCtx(), actor, String(body.guardianId ?? ""));
      return c.redirect("/t/dm", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  app.post("/g/dm/:id", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (actor.role !== "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    const action = body.action === "decline" ? "decline" : "accept";
    try {
      const result = await respondDm(makeCtx(), actor, routeId(c), action);
      if (result.status === "accepted") {
        return c.redirect(`/g/dm/${result.id}`, 302);
      }
      return c.redirect("/g/dm", 302);
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  });

  async function renderDmThread(c: Context, side: "teacher" | "guardian") {
    const gate = await requirePage(c, side);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    try {
      const thread = await getDmThread(makeCtx(), actor, routeId(c));
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "dm.title")}>
          <h1>{thread.peerName}</h1>
          <p class="muted">
            {t(
              locale,
              thread.status === "accepted"
                ? "dm.accepted"
                : thread.status === "declined"
                  ? "dm.declined"
                  : "dm.pending",
            )}
          </p>
          {thread.messages.length === 0 ? <p>{t(locale, "dm.empty")}</p> : null}
          {thread.messages.map((message) => (
            <div class="card">
              <p>{message.body}</p>
            </div>
          ))}
          {thread.status === "accepted" ? (
            <form
              class="card stack"
              method="post"
              action={`${side === "guardian" ? "/g" : "/t"}/dm/${thread.id}/message`}
            >
              <label for="body">{t(locale, "dm.body")}</label>
              <textarea id="body" name="body" rows={3} required />
              <button type="submit">{t(locale, "dm.send")}</button>
            </form>
          ) : null}
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  }

  app.get("/t/dm/:id", (c) => renderDmThread(c, "teacher"));
  app.get("/g/dm/:id", (c) => renderDmThread(c, "guardian"));

  async function acceptDmMessage(c: Context, side: "teacher" | "guardian") {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (side === "guardian" && actor.role !== "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    if (side === "teacher" && actor.role === "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    try {
      await postDmMessage(
        makeCtx(),
        actor,
        routeId(c),
        String(body.body ?? ""),
      );
      return c.redirect(
        `${side === "guardian" ? "/g" : "/t"}/dm/${routeId(c)}`,
        302,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
          asStatus(error.status),
        );
      }
      throw error;
    }
  }

  app.post("/t/dm/:id/message", (c) => acceptDmMessage(c, "teacher"));
  app.post("/g/dm/:id/message", (c) => acceptDmMessage(c, "guardian"));

  app.get("/privacy", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (actor?.role === "guardian") {
      return c.redirect("/g/privacy", 302);
    }
    if (actor) {
      return c.redirect("/t/privacy", 302);
    }
    return c.html(
      <Layout
        locale={locale}
        actor={actor}
        title={t(locale, "consent.public_title")}
      >
        <h1>{t(locale, "consent.public_title")}</h1>
        <p>{t(locale, "consent.public_lead")}</p>
        <div class="card">
          <h2>{t(locale, "landing.yolo_title")}</h2>
          <p>{t(locale, "landing.yolo_body")}</p>
          <p class="muted">{t(locale, "landing.rgpd_note")}</p>
        </div>
        <p>{t(locale, "landing.sign_in")}</p>
      </Layout>,
    );
  });

  app.get("/g/privacy", async (c) => {
    const gate = await requirePage(c, "guardian");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const privacy = await getPrivacy(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "privacy.title")}>
        <h1>{t(locale, "privacy.title")}</h1>
        {c.req.query("saved") === "1" ? (
          <div class="banner">{t(locale, "privacy.saved")}</div>
        ) : null}
        <p>{t(locale, "consent.public_lead")}</p>
        <form class="card stack" method="post" action="/g/privacy">
          <label class="switch">
            <input
              type="checkbox"
              name="photoOptOut"
              value="1"
              checked={privacy.photoOptOut}
            />
            <span>
              {t(locale, "privacy.photo")}
              <span class="muted">
                {" "}
                {t(
                  locale,
                  privacy.photoOptOut
                    ? "privacy.photo_on"
                    : "privacy.photo_off",
                )}
              </span>
            </span>
          </label>
          <label class="switch">
            <input
              type="checkbox"
              name="yolo"
              value="1"
              checked={privacy.yolo}
            />
            <span>
              {t(locale, "privacy.yolo")}
              <span class="muted">
                {" "}
                {t(
                  locale,
                  privacy.yolo ? "privacy.yolo_on" : "privacy.yolo_off",
                )}
              </span>
            </span>
          </label>
          <p class="muted">{t(locale, "privacy.yolo_help")}</p>
          <p class="muted">{t(locale, "privacy.public_share_help")}</p>
          <button type="submit">{t(locale, "privacy.save")}</button>
        </form>
      </Layout>,
    );
  });

  app.get("/t/privacy", async (c) => {
    const gate = await requirePage(c, "teacher");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    const privacy = await getPrivacy(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "privacy.title")}>
        <h1>{t(locale, "privacy.title")}</h1>
        <p>{t(locale, "privacy.teacher_lead")}</p>
        <div class="card stack">
          <label class="switch">
            <input type="checkbox" disabled checked={false} />
            <span>
              {t(locale, "privacy.public_share")}
              <span class="muted">
                {" "}
                {t(locale, "privacy.public_share_help")}
              </span>
            </span>
          </label>
          <label class="switch">
            <input type="checkbox" disabled checked={privacy.yolo} />
            <span>
              {t(locale, "privacy.yolo")}
              <span class="muted"> {t(locale, "privacy.yolo_off")}</span>
            </span>
          </label>
          <p class="muted">{t(locale, "privacy.teacher")}</p>
          <p class="muted">{t(locale, "landing.rgpd_note")}</p>
        </div>
      </Layout>,
    );
  });

  app.post("/g/privacy", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    if (actor.role !== "guardian") {
      return c.text(t(localeOf(c, actor), "errors.forbidden"), 403);
    }
    const body = await c.req.parseBody();
    await savePrivacy(makeCtx(), actor, {
      photoOptOut: body.photoOptOut === "1",
      yolo: body.yolo === "1",
    });
    return c.redirect("/g/privacy?saved=1", 302);
  });

  app.get("/bugs", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (!actor) {
      return c.html(
        <Layout locale={locale} actor={null} title={t(locale, "bugs.title")}>
          <h1>{t(locale, "bugs.title")}</h1>
          <p>{t(locale, "bugs.sign_in")}</p>
          <p>
            <a href="/">{t(locale, "landing.sign_in")}</a>
          </p>
        </Layout>,
      );
    }
    const from = safeReportPath(c.req.query("from"));
    const open = await listOpenBugs(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "bugs.title")}>
        <h1>{t(locale, "bugs.title")}</h1>
        <p class="muted">{t(locale, "bugs.public_lead")}</p>
        {from ? (
          <p class="muted">
            {t(locale, "bugs.path")}: <code>{from}</code>
          </p>
        ) : null}
        <form class="card stack" method="post" action="/bugs">
          <label for="body">{t(locale, "bugs.body")}</label>
          <textarea id="body" name="body" rows={5} required />
          {from ? <input type="hidden" name="path" value={from} /> : null}
          <input type="hidden" name="sha" value={sha} />
          <button type="submit">{t(locale, "bugs.send")}</button>
        </form>
        <h2>{t(locale, "bugs.open_title")}</h2>
        <p class="muted">{t(locale, "bugs.open_lead")}</p>
        {open.length === 0 ? <p>{t(locale, "bugs.open_empty")}</p> : null}
        {open.map((item) => (
          <article class="card">
            <p>
              <code>{item.id}</code> ({t(locale, "bugs.status_open")})
            </p>
            <p>
              {t(locale, "bugs.note")}: {item.note}
            </p>
            <p class="muted">
              {item.role} {item.path ?? ""} {item.sha ?? ""}
            </p>
            <form method="post" action={`/bugs/${item.id}`}>
              <input type="hidden" name="action" value="done" />
              <button class="secondary" type="submit">
                {t(locale, "bugs.done")}
              </button>
            </form>
          </article>
        ))}
      </Layout>,
    );
  });

  async function acceptBugForm(c: Context) {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    const body = await c.req.parseBody();
    try {
      const saved = await reportBug(makeCtx(), actor, {
        body: String(body.body ?? ""),
        path: safeReportPath(String(body.path ?? "")),
        sha: String(body.sha ?? sha),
      });
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "bugs.title")}>
          <div class="banner">{t(locale, "bugs.thanks")}</div>
          <p>
            <code>{saved.id}</code> ({t(locale, "bugs.status_open")})
          </p>
          <p class="muted">
            {saved.role} {saved.path ? saved.path : ""} {saved.sha ?? ""}
          </p>
          <p>
            <a href="/bugs">{t(locale, "bugs.back_queue")}</a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  }

  app.post("/bugs", (c) => acceptBugForm(c));

  app.post("/bugs/:id", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    try {
      const closed = await closeBug(makeCtx(), actor, routeId(c));
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "bugs.title")}>
          <div class="banner">{t(locale, "bugs.closed")}</div>
          <p>
            <code>{closed.id}</code> ({t(locale, "bugs.status_done")})
          </p>
          <p>
            <a href="/bugs">{t(locale, "bugs.back_queue")}</a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  app.get("/features", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (!actor) {
      return c.html(
        <Layout
          locale={locale}
          actor={null}
          title={t(locale, "features.title")}
        >
          <h1>{t(locale, "features.title")}</h1>
          <p>{t(locale, "features.sign_in")}</p>
          <p>
            <a href="/">{t(locale, "landing.sign_in")}</a>
          </p>
        </Layout>,
      );
    }
    const open = await listOpenFeatures(makeCtx(), actor);
    const canDecide = actor.role === "teacher" || actor.role === "school_admin";
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "features.title")}>
        <h1>{t(locale, "features.title")}</h1>
        <p class="muted">{t(locale, "features.lead")}</p>
        <form class="card stack" method="post" action="/features">
          <label for="feature-body">{t(locale, "features.body")}</label>
          <textarea id="feature-body" name="body" rows={4} required />
          <button type="submit">{t(locale, "features.send")}</button>
        </form>
        <h2>{t(locale, "features.open_title")}</h2>
        <p class="muted">{t(locale, "features.open_lead")}</p>
        {open.length === 0 ? <p>{t(locale, "features.open_empty")}</p> : null}
        {open.map((item) => (
          <article class="card">
            <p>
              <code>{item.id}</code> ({t(locale, "features.status_open")})
            </p>
            <p>
              {t(locale, "features.body")}: {item.note}
            </p>
            <p class="muted">{item.role}</p>
            {canDecide ? (
              <div class="row">
                <form method="post" action={`/features/${item.id}`}>
                  <input type="hidden" name="action" value="accept" />
                  <button type="submit">{t(locale, "features.accept")}</button>
                </form>
                <form method="post" action={`/features/${item.id}`}>
                  <input type="hidden" name="action" value="reject" />
                  <button class="secondary" type="submit">
                    {t(locale, "features.reject")}
                  </button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </Layout>,
    );
  });

  app.post("/features", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    const body = await c.req.parseBody();
    try {
      const saved = await submitFeature(
        makeCtx(),
        actor,
        String(body.body ?? ""),
      );
      return c.html(
        <Layout
          locale={locale}
          actor={actor}
          title={t(locale, "features.title")}
        >
          <div class="banner">{t(locale, "features.thanks")}</div>
          <p>
            <code>{saved.id}</code> ({t(locale, "features.status_open")})
          </p>
          <p>
            <a href="/features">{t(locale, "features.open_title")}</a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  app.post("/features/:id", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    const body = await c.req.parseBody();
    try {
      const decided = await decideFeature(
        makeCtx(),
        actor,
        routeId(c),
        String(body.action ?? ""),
      );
      return c.html(
        <Layout
          locale={locale}
          actor={actor}
          title={t(locale, "features.title")}
        >
          <div class="banner">
            {t(
              locale,
              decided.status === "accepted"
                ? "features.accepted"
                : "features.rejected",
            )}
          </div>
          <p>
            <a href="/features">{t(locale, "features.open_title")}</a>
          </p>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  });

  async function renderExport(c: Context) {
    const gate = await requirePage(c, "teacher");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    await exportStub(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "export.title")}>
        <h1>{t(locale, "export.title")}</h1>
        <p>{t(locale, "export.lead")}</p>
        <p>{t(locale, "export.not_connected")}</p>
        <p>{t(locale, "export.soon")}</p>
        <p class="muted">{t(locale, "export.pinheiros")}</p>
        <form method="post" action="/t/export">
          <button class="secondary" type="submit">
            {t(locale, "export.open")}
          </button>
        </form>
      </Layout>,
    );
  }

  app.get("/t/export", (c) => renderExport(c));
  app.post("/t/export", (c) => renderExport(c));

  app.get("/g/payments", async (c) => {
    const gate = await requirePage(c, "guardian");
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    if (gate.forbidden) {
      return gate.forbidden;
    }
    const { actor, locale } = gate;
    await paymentsStub(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "payments.title")}>
        <h1>{t(locale, "payments.title")}</h1>
        <div class="card">
          <p>{t(locale, "payments.lead")}</p>
          <p>{t(locale, "payments.test")}</p>
          <p class="muted">{t(locale, "payments.stub")}</p>
          <p class="muted">{t(locale, "payments.pinheiros")}</p>
        </div>
      </Layout>,
    );
  });

  app.get("/mcp", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (c.req.header("accept")?.includes("text/html")) {
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "mcp.title")}>
          <h1>{t(locale, "mcp.title")}</h1>
          <p>{t(locale, "mcp.lead")}</p>
          <ul>
            {MCP_TOOLS.map((tool) => (
              <li>
                <code>{tool.name}</code> {tool.description}
              </li>
            ))}
          </ul>
        </Layout>,
      );
    }
    return c.json({ tools: MCP_TOOLS, write: false });
  });

  app.post("/mcp", async (c) => {
    const payload = await c.req.json<{
      method?: string;
      params?: {
        name?: string;
        arguments?: { q?: string; question?: string };
        q?: string;
      };
      name?: string;
      q?: string;
    }>();
    const method = payload.method ?? "tools/list";
    if (method === "tools/list") {
      return c.json({ tools: MCP_TOOLS, write: false });
    }
    if (method === "tools/call") {
      const args = payload.params?.arguments;
      return jsonApi(c, (actor) =>
        callMcpTool(
          makeCtx(),
          actor,
          payload.params?.name ?? payload.name ?? "",
          localeOf(c, actor),
          {
            q:
              args?.q ?? payload.params?.q ?? payload.q ?? args?.question ?? "",
          },
        ),
      );
    }
    return c.json({ error: "invalid" }, 400);
  });

  async function jsonApi(
    c: Context,
    run: (actor: Actor | null) => Promise<unknown>,
  ) {
    const actor = await actorOf(c);
    try {
      return c.json(await run(actor));
    } catch (error) {
      await noteAppError(c, actor, error);
      if (isAppError(error)) {
        return c.json({ error: error.code }, asStatus(error.status));
      }
      throw error;
    }
  }

  app.get("/v1/me", (c) => jsonApi(c, async (actor) => ({ actor })));
  app.get("/v1/group", (c) =>
    jsonApi(c, (actor) => getGroup(makeCtx(), actor)),
  );
  app.post("/v1/group", async (c) => {
    const payload = await c.req.json<{ name?: string }>().catch(() => ({}));
    return jsonApi(c, (actor) => createGroup(makeCtx(), actor, payload));
  });
  app.post("/v1/group/invite", (c) =>
    jsonApi(c, (actor) => inviteGroup(makeCtx(), actor)),
  );
  app.post("/v1/group/join", async (c) => {
    const payload = await c.req.json<{ inviteCode?: string }>();
    return jsonApi(c, (actor) =>
      joinGroup(makeCtx(), actor, payload.inviteCode ?? ""),
    );
  });
  app.get("/v1/feed", (c) =>
    jsonApi(c, (actor) => listFeed(makeCtx(), actor, localeOf(c, actor))),
  );
  app.get("/v1/feed/:id/media", async (c) => {
    const actor = await actorOf(c);
    try {
      const file = await getFeedMedia(makeCtx(), actor, routeId(c), deps.media);
      return new Response(file.data, {
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (error) {
      await noteAppError(c, actor, error);
      if (isAppError(error)) {
        return c.json({ error: error.code }, asStatus(error.status));
      }
      throw error;
    }
  });
  app.get("/v1/feed/:id", (c) =>
    jsonApi(c, (actor) =>
      getPost(makeCtx(), actor, routeId(c), localeOf(c, actor)),
    ),
  );
  app.post("/v1/feed", async (c) => {
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const file = await fileFromBody(body.file);
      return jsonApi(c, (actor) =>
        createPost(
          makeCtx(),
          actor,
          {
            type: String(body.type ?? "story"),
            ...(body.title ? { title: String(body.title) } : {}),
            body: String(body.body ?? ""),
            file,
          },
          deps.media,
        ),
      );
    }
    const payload = await c.req.json<{
      type?: string;
      title?: string;
      body?: string;
    }>();
    return jsonApi(c, (actor) =>
      createPost(makeCtx(), actor, payload, deps.media),
    );
  });
  app.get("/v1/tomorrow", (c) =>
    jsonApi(c, (actor) => getTomorrow(makeCtx(), actor, localeOf(c, actor))),
  );
  app.get("/v1/bring", (c) =>
    jsonApi(c, async (actor) => {
      const plan = await getTomorrow(makeCtx(), actor, localeOf(c, actor));
      return { bring: plan.bring, updates: plan.updates };
    }),
  );
  app.get("/v1/week", (c) =>
    jsonApi(c, (actor) => getWeek(makeCtx(), actor, localeOf(c, actor))),
  );
  app.get("/v1/morning", (c) =>
    jsonApi(c, (actor) => getMorning(makeCtx(), actor, localeOf(c, actor))),
  );
  app.get("/v1/summary", (c) =>
    jsonApi(c, (actor) => getSummary(makeCtx(), actor, localeOf(c, actor))),
  );
  app.get("/v1/ask", (c) =>
    jsonApi(c, (actor) =>
      askHome(makeCtx(), actor, c.req.query("q") ?? "", localeOf(c, actor)),
    ),
  );
  app.post("/v1/ask", async (c) => {
    const payload = await c.req
      .json<{ q?: string; question?: string }>()
      .catch(() => ({ q: undefined, question: undefined }));
    return jsonApi(c, (actor) =>
      askHome(
        makeCtx(),
        actor,
        payload.q ?? payload.question ?? "",
        localeOf(c, actor),
      ),
    );
  });
  app.post("/v1/excursion", async (c) => {
    const payload = await c.req.json<{ id?: string }>();
    return jsonApi(c, (actor) =>
      approveExcursion(makeCtx(), actor, payload.id ?? ""),
    );
  });
  app.post("/v1/excursion/reset", (c) =>
    jsonApi(c, (actor) => resetExcursion(makeCtx(), actor)),
  );
  app.get("/v1/dm", (c) => jsonApi(c, (actor) => listDms(makeCtx(), actor)));
  app.post("/v1/dm", async (c) => {
    const payload = await c.req.json<{ guardianId?: string }>();
    return jsonApi(c, (actor) =>
      requestDm(makeCtx(), actor, payload.guardianId ?? ""),
    );
  });
  app.get("/v1/dm/:id", (c) =>
    jsonApi(c, (actor) => getDmThread(makeCtx(), actor, routeId(c))),
  );
  app.post("/v1/dm/:id", async (c) => {
    const payload = await c.req.json<{ action?: string }>();
    const action = payload.action === "decline" ? "decline" : "accept";
    return jsonApi(c, (actor) =>
      respondDm(makeCtx(), actor, routeId(c), action),
    );
  });
  app.post("/v1/dm/:id/messages", async (c) => {
    const payload = await c.req.json<{ body?: string }>();
    return jsonApi(c, (actor) =>
      postDmMessage(makeCtx(), actor, routeId(c), payload.body ?? ""),
    );
  });
  app.get("/v1/privacy", (c) =>
    jsonApi(c, (actor) => getPrivacy(makeCtx(), actor)),
  );
  app.post("/v1/privacy", async (c) => {
    const payload = await c.req.json<{
      photoOptOut?: boolean;
      yolo?: boolean;
    }>();
    return jsonApi(c, (actor) =>
      savePrivacy(makeCtx(), actor, {
        photoOptOut: Boolean(payload.photoOptOut),
        yolo: Boolean(payload.yolo),
      }),
    );
  });
  app.post("/v1/consent", async (c) => {
    const payload = await c.req.json<{
      photoOptOut?: boolean;
      yolo?: boolean;
    }>();
    return jsonApi(c, (actor) =>
      savePrivacy(makeCtx(), actor, {
        photoOptOut: Boolean(payload.photoOptOut),
        yolo: Boolean(payload.yolo),
      }),
    );
  });
  app.get("/v1/bugs", (c) =>
    jsonApi(c, (actor) => listOpenBugs(makeCtx(), actor)),
  );
  app.post("/v1/bugs/:id", async (c) => {
    const payload = await c.req
      .json<{ action?: string }>()
      .catch(() => ({ action: undefined }));
    return jsonApi(c, (actor) => {
      if (!actor) {
        throw new AppError("unauthenticated", 401);
      }
      if (payload.action !== "done") {
        throw new AppError("invalid", 400);
      }
      return closeBug(makeCtx(), actor, routeId(c));
    });
  });
  app.get("/v1/features", (c) =>
    jsonApi(c, (actor) => listOpenFeatures(makeCtx(), actor)),
  );
  app.post("/v1/features", async (c) => {
    const payload = await c.req.json<{ body?: string }>().catch(() => ({
      body: undefined,
    }));
    return jsonApi(c, (actor) =>
      submitFeature(makeCtx(), actor, payload.body ?? ""),
    );
  });
  app.post("/v1/features/:id", async (c) => {
    const payload = await c.req
      .json<{ action?: string }>()
      .catch(() => ({ action: undefined }));
    return jsonApi(c, (actor) =>
      decideFeature(makeCtx(), actor, routeId(c), payload.action ?? ""),
    );
  });
  app.get("/v1/export", (c) =>
    jsonApi(c, (actor) => exportStub(makeCtx(), actor)),
  );
  app.post("/v1/export", (c) =>
    jsonApi(c, (actor) => exportStub(makeCtx(), actor)),
  );
  app.get("/v1/payments", (c) =>
    jsonApi(c, (actor) => paymentsStub(makeCtx(), actor)),
  );
  if (deps.demoLogin) {
    app.get("/v1/debug/unavailable", (c) =>
      jsonApi(c, (actor) => {
        requireRole(actor, ["teacher", "school_admin"]);
        throw new AppError("unavailable", 503);
      }),
    );
  }
  app.post("/v1/bugs", async (c) => {
    const payload = await c.req.json<{
      body?: string;
      path?: string;
      sha?: string;
    }>();
    return jsonApi(c, (actor) =>
      reportBug(makeCtx(), actor, {
        body: payload.body ?? "",
        path: payload.path,
        sha: payload.sha ?? sha,
      }),
    );
  });
  app.post("/v1/bug-report", async (c) => {
    const payload = await c.req.json<{
      body?: string;
      path?: string;
      sha?: string;
    }>();
    return jsonApi(c, (actor) =>
      reportBug(makeCtx(), actor, {
        body: payload.body ?? "",
        path: payload.path,
        sha: payload.sha ?? sha,
      }),
    );
  });
  app.post("/bug-report", async (c) => {
    if (c.req.header("content-type")?.includes("application/json")) {
      const payload = await c.req.json<{
        body?: string;
        path?: string;
        sha?: string;
      }>();
      return jsonApi(c, (actor) =>
        reportBug(makeCtx(), actor, {
          body: payload.body ?? "",
          path: payload.path,
          sha: payload.sha ?? sha,
        }),
      );
    }
    return acceptBugForm(c);
  });
  app.post("/v1/auth/magic-link", async (c) => {
    const payload = await c.req.json<{ email?: string }>();
    return jsonApi(c, async () =>
      requestMagicLink(makeCtx(), deps.mailer, {
        email: payload.email ?? "",
        origin: new URL(c.req.url).origin,
        demoLogin: deps.demoLogin,
      }),
    );
  });
  app.post("/v1/auth/logout", async (c) => {
    await logout(makeCtx(), getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.notFound((c) => {
    if (c.req.path.startsWith("/v1/")) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.text("Not found", 404);
  });

  app.onError(async (error, c) => {
    const actor = await actorOf(c);
    await noteAppError(c, actor, error);
    if (c.req.path.startsWith("/v1/") || c.req.path === "/mcp") {
      return c.json({ error: "unavailable" }, 503);
    }
    const locale = localeOf(c, null);
    return c.html(
      <Layout locale={locale} actor={null} title={t(locale, "app.name")}>
        <p>{t(locale, "errors.unavailable")}</p>
        <p>
          <a href="/">{t(locale, "nav.home")}</a>
        </p>
      </Layout>,
      503,
    );
  });

  return app;
}
