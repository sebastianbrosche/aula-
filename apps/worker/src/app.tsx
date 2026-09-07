import type { MessageKey } from "@aula/core";
import {
  type Actor,
  actorFromSession,
  type Ctx,
  consumeMagicLink,
  type Db,
  demoLogin,
  FOUNDATION_SQL,
  getGroup,
  getPrivacy,
  getTomorrow,
  isAppError,
  type Locale,
  listFeed,
  logout,
  type Mailer,
  reportBug,
  requestMagicLink,
  savePrivacy,
  seedPinheiros,
  t,
} from "@aula/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Layout } from "./views/ui.tsx";

const COOKIE = "aula_s";
const LOCALE_COOKIE = "aula_locale";

export type AppDeps = {
  db: Db;
  now?: () => number;
  mailer: Mailer;
  demoLogin: boolean;
  applySql?: (sql: string) => void | Promise<void>;
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

export function createApp(deps: AppDeps) {
  const app = new Hono();
  const now = deps.now ?? (() => Date.now());
  let ready = false;

  async function ensureReady() {
    if (ready) {
      return;
    }
    if (deps.applySql) {
      await deps.applySql(FOUNDATION_SQL);
    }
    await seedPinheiros(deps.db, now());
    ready = true;
  }

  app.use("*", async (c, next) => {
    if (c.req.path === "/healthz") {
      await next();
      return;
    }
    await ensureReady();
    await next();
  });

  const makeCtx = (): Ctx => ({ db: deps.db, now });

  async function actorOf(c: { req: { raw: Request } }): Promise<Actor | null> {
    return actorFromSession(makeCtx(), getCookie(c as never, COOKIE));
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

  app.get("/healthz", (c) => c.json({ ok: true }));

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
      <Layout locale={locale} actor={null} title={t(locale, "login.title")}>
        <h1>{t(locale, "login.title")}</h1>
        <p class="muted">{t(locale, "login.lead")}</p>
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
        <form class="stack card" method="post" action="/login">
          <label for="email">{t(locale, "login.email")}</label>
          <input id="email" name="email" type="email" required />
          <button type="submit">{t(locale, "login.send")}</button>
        </form>
        <p class="muted">{t(locale, "login.google_later")}</p>
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
            {t(locale, result.sent ? "login.sent" : "login.link_ready")}
          </div>
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

  app.post("/logout", async (c) => {
    await logout(makeCtx(), getCookie(c, COOKIE));
    deleteCookie(c, COOKIE, { path: "/" });
    return c.redirect("/", 302);
  });

  async function requirePage(c: Context) {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    if (!actor) {
      return {
        actor: null,
        locale,
        unauthorized: c.redirect("/", 302),
      };
    }
    return { actor, locale, unauthorized: null };
  }

  app.get("/t", async (c) => {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    if (actor.role === "guardian") {
      return c.text(t(locale, "errors.forbidden"), 403);
    }
    const feed = await listFeed(makeCtx(), actor);
    const tomorrow = await getTomorrow(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "app.name")}>
        <h1>{t(locale, "home.hello", { name: actor.firstName })}</h1>
        <p class="muted">{t(locale, "home.as_teacher")}</p>
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
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    if (actor.role !== "guardian") {
      return c.text(t(locale, "errors.forbidden"), 403);
    }
    const feed = await listFeed(makeCtx(), actor);
    const tomorrow = await getTomorrow(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "app.name")}>
        <h1>{t(locale, "home.hello", { name: actor.firstName })}</h1>
        <p class="muted">{t(locale, "home.as_parent")}</p>
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

  async function renderGroup(c: Parameters<typeof requirePage>[0]) {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    const group = await getGroup(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "group.title")}>
        <h1>{t(locale, "group.title")}</h1>
        <div class="card">
          <p>
            <strong>{group.schoolName}</strong> / {group.className}
          </p>
          <p>
            {t(locale, "group.invite")}: {group.inviteCode}
          </p>
          <h2>{t(locale, "group.adults")}</h2>
          <ul>
            {group.adults.map((person) => (
              <li>{person.displayName}</li>
            ))}
          </ul>
          <h2>{t(locale, "group.children")}</h2>
          <ul>
            {group.children.map((child) => (
              <li>{child.displayName}</li>
            ))}
          </ul>
        </div>
      </Layout>,
    );
  }

  app.get("/t/group", (c) => renderGroup(c));
  app.get("/g/group", (c) => renderGroup(c));

  async function renderFeed(c: Parameters<typeof requirePage>[0]) {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    const feed = await listFeed(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "feed.title")}>
        <h1>{t(locale, "feed.title")}</h1>
        {feed.length === 0 ? <p>{t(locale, "feed.empty")}</p> : null}
        {feed.map((post) => (
          <article class="card">
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </article>
        ))}
      </Layout>,
    );
  }

  app.get("/t/feed", (c) => renderFeed(c));
  app.get("/g/feed", (c) => renderFeed(c));

  async function renderTomorrow(c: Parameters<typeof requirePage>[0]) {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    const tomorrow = await getTomorrow(makeCtx(), actor);
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
      </Layout>,
    );
  }

  app.get("/t/tomorrow", (c) => renderTomorrow(c));
  app.get("/g/tomorrow", (c) => renderTomorrow(c));

  app.get("/g/privacy", async (c) => {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    if (actor.role !== "guardian") {
      return c.html(
        <Layout
          locale={locale}
          actor={actor}
          title={t(locale, "privacy.title")}
        >
          <p>{t(locale, "privacy.teacher")}</p>
        </Layout>,
        403,
      );
    }
    const privacy = await getPrivacy(makeCtx(), actor);
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "privacy.title")}>
        <h1>{t(locale, "privacy.title")}</h1>
        <form class="card stack" method="post" action="/g/privacy">
          <label>
            <input
              type="checkbox"
              name="photoOptOut"
              value="1"
              checked={privacy.photoOptOut}
            />{" "}
            {t(locale, "privacy.photo")}
          </label>
          <label>
            <input
              type="checkbox"
              name="yolo"
              value="1"
              checked={privacy.yolo}
            />{" "}
            {t(locale, "privacy.yolo")}
          </label>
          <p class="muted">{t(locale, "privacy.yolo_help")}</p>
          <button type="submit">{t(locale, "privacy.save")}</button>
        </form>
      </Layout>,
    );
  });

  app.post("/g/privacy", async (c) => {
    const actor = await actorOf(c);
    if (!actor) {
      return c.redirect("/", 302);
    }
    const body = await c.req.parseBody();
    await savePrivacy(makeCtx(), actor, {
      photoOptOut: body.photoOptOut === "1",
      yolo: body.yolo === "1",
    });
    return c.redirect("/g/privacy", 302);
  });

  app.get("/bugs", async (c) => {
    const gate = await requirePage(c);
    if (gate.unauthorized) {
      return gate.unauthorized;
    }
    const { actor, locale } = gate;
    return c.html(
      <Layout locale={locale} actor={actor} title={t(locale, "bugs.title")}>
        <h1>{t(locale, "bugs.title")}</h1>
        <form class="card stack" method="post" action="/bugs">
          <label for="body">{t(locale, "bugs.body")}</label>
          <textarea id="body" name="body" rows={5} required />
          <button type="submit">{t(locale, "bugs.send")}</button>
        </form>
      </Layout>,
    );
  });

  app.post("/bugs", async (c) => {
    const actor = await actorOf(c);
    const locale = localeOf(c, actor);
    const body = await c.req.parseBody();
    try {
      await reportBug(makeCtx(), actor, String(body.body ?? ""));
      return c.html(
        <Layout locale={locale} actor={actor} title={t(locale, "bugs.title")}>
          <div class="banner">{t(locale, "bugs.thanks")}</div>
        </Layout>,
      );
    } catch (error) {
      if (isAppError(error) && error.code === "unauthenticated") {
        return c.redirect("/", 302);
      }
      if (isAppError(error)) {
        return c.text(t(locale, errorKey(error.code)), asStatus(error.status));
      }
      throw error;
    }
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
  app.get("/v1/feed", (c) => jsonApi(c, (actor) => listFeed(makeCtx(), actor)));
  app.get("/v1/tomorrow", (c) =>
    jsonApi(c, (actor) => getTomorrow(makeCtx(), actor)),
  );
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
  app.post("/v1/bugs", async (c) => {
    const payload = await c.req.json<{ body?: string }>();
    return jsonApi(c, (actor) =>
      reportBug(makeCtx(), actor, payload.body ?? ""),
    );
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

  return app;
}
