import type { MessageKey } from "@aula/core";
import {
  type Actor,
  actorFromSession,
  approveExcursion,
  type Ctx,
  callMcpTool,
  consumeMagicLink,
  createGroup,
  createPost,
  type Db,
  demoLogin,
  FOUNDATION_SQL,
  type GoogleConfig,
  type GoogleFetch,
  getDmThread,
  getGroup,
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
  logout,
  type Mailer,
  MCP_TOOLS,
  type MediaFile,
  type MediaStore,
  postDmMessage,
  randomToken,
  reportBug,
  requestDm,
  requestMagicLink,
  respondDm,
  safeReportPath,
  savePrivacy,
  seedPinheiros,
  sessionForGoogleEmail,
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
  app.post("/join", (c) => denyStudentCard(c));
  app.get("/join", async (c) => {
    const locale = localeOf(c, await actorOf(c));
    return c.html(
      <Layout
        locale={locale}
        actor={null}
        title={t(locale, "login.student_denied")}
      >
        <p>{t(locale, "login.student_denied")}</p>
      </Layout>,
      403,
    );
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
          <a class="btn" href="/t/summary">
            {t(locale, "summary.open")}
          </a>
        </p>
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
          <a class="btn" href="/g/summary">
            {t(locale, "summary.open")}
          </a>
        </p>
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
        return c.text(
          t(localeOf(c, actor), errorKey(error.code)),
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
              <option value="announcement">
                {t(locale, "feed.type_announcement")}
              </option>
            </select>
            <label for="body">{t(locale, "feed.compose_body")}</label>
            <textarea id="body" name="body" rows={4} required />
            <label for="file">{t(locale, "feed.compose_file")}</label>
            <input id="file" name="file" type="file" accept="image/*,video/*" />
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
          {post.attachment ? (
            <p>
              <a href={post.attachment.href}>{post.attachment.label}</a>
            </p>
          ) : null}
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
  }

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
          <p class="muted">
            {saved.role} {saved.path ? saved.path : ""} {saved.sha ?? ""}
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
      params?: { name?: string };
      name?: string;
    }>();
    const method = payload.method ?? "tools/list";
    if (method === "tools/list") {
      return c.json({ tools: MCP_TOOLS, write: false });
    }
    if (method === "tools/call") {
      return jsonApi(c, (actor) =>
        callMcpTool(
          makeCtx(),
          actor,
          payload.params?.name ?? payload.name ?? "",
          localeOf(c, actor),
        ),
      );
    }
    return c.json({ error: "invalid" }, 400);
  });

  async function jsonApi(
    c: Context,
    run: (actor: Actor | null) => Promise<unknown>,
  ) {
    try {
      return c.json(await run(await actorOf(c)));
    } catch (error) {
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
  app.get("/v1/summary", (c) =>
    jsonApi(c, (actor) => getSummary(makeCtx(), actor, localeOf(c, actor))),
  );
  app.post("/v1/excursion", async (c) => {
    const payload = await c.req.json<{ id?: string }>();
    return jsonApi(c, (actor) =>
      approveExcursion(makeCtx(), actor, payload.id ?? ""),
    );
  });
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

  app.onError((_error, c) => {
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
