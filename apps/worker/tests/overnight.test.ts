import { describe, expect, it } from "vitest";
import { createTestApp, loginAs, mockGoogleFetch } from "./harness.ts";

async function json(
  app: ReturnType<typeof createTestApp>,
  path: string,
  init?: RequestInit,
) {
  const res = await app.request(path, init);
  const body = await res.json();
  return { res, body };
}

describe("landing and public consent", () => {
  it("shows dual SEO copy without claiming a legal seal", async () => {
    const app = createTestApp();
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Alternativa ao grupo de WhatsApp da turma");
    expect(html).toContain(
      "Comunicacao escola-pais sem numeros pessoais no grupo",
    );
    expect(html).toContain(
      "Sem pontos. Sem login das criancas. Sem Plus pago.",
    );
    expect(html).toContain(
      "Menos ruido no telemovel. So o que a turma precisa.",
    );
    expect(html).toContain("The quiet alternative to the class WhatsApp group");
    expect(html).toContain("Pictures and messages. No ClassDojo Plus.");
    expect(html).toContain(
      "Free for families. No Plus. No points. No kid login.",
    );
    expect(html).toContain("not an RGPD or GDPR endorsement");
    expect(html).toContain('action="/login"');
    expect(html).toContain('action="/login/demo"');
  });

  it("serves a public privacy page", async () => {
    const app = createTestApp();
    const res = await app.request("/privacy", {
      headers: { cookie: "aula_locale=en" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Quiet by default");
  });
});

describe("auth stubs", () => {
  it("returns 503 for Google when secrets are missing", async () => {
    const app = createTestApp();
    const { res, body } = await json(app, "/v1/auth/google");
    expect(res.status).toBe(503);
    expect(body).toEqual({ error: "unavailable" });
    const html = await app.request("/auth/google");
    expect(html.status).toBe(503);
  });

  it("puts Google above the magic-link backup when configured", async () => {
    const app = createTestApp({
      google: {
        clientId: "cid.apps.googleusercontent.com",
        clientSecret: "sec",
      },
    });
    const res = await app.request("/", {
      headers: { cookie: "aula_locale=en" },
    });
    const html = await res.text();
    const googleAt = html.indexOf("Continue with Google");
    const magicAt = html.indexOf("Backup: magic link");
    expect(googleAt).toBeGreaterThan(-1);
    expect(magicAt).toBeGreaterThan(googleAt);
  });

  it("returns a Google authorize URL when configured", async () => {
    const app = createTestApp({
      google: {
        clientId: "cid.apps.googleusercontent.com",
        clientSecret: "sec",
      },
    });
    const { res, body } = await json(app, "/v1/auth/google");
    expect(res.status).toBe(200);
    const url = (body as { url: string }).url;
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=cid.apps.googleusercontent.com");
    expect(res.headers.get("set-cookie")).toContain("aula_g=");
  });

  it("signs in a seeded adult when Google returns their email", async () => {
    const app = createTestApp({
      google: {
        clientId: "cid.apps.googleusercontent.com",
        clientSecret: "sec",
      },
      googleFetch: mockGoogleFetch("ana.costa@pinheiros.aula.test"),
    });
    const start = await app.request("/v1/auth/google");
    const cookie = start.headers.get("set-cookie") ?? "";
    const state = /aula_g=([^;]+)/.exec(cookie)?.[1] ?? "";
    const callback = await app.request(
      `/auth/google/callback?code=x&state=${state}`,
      { headers: { cookie: `aula_g=${state}` } },
    );
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("/t");
  });

  it("offers Pinheiros roles when Google email is new and demo is on", async () => {
    const app = createTestApp({
      google: {
        clientId: "cid.apps.googleusercontent.com",
        clientSecret: "sec",
      },
      googleFetch: mockGoogleFetch("guest@gmail.com"),
    });
    const start = await app.request("/v1/auth/google");
    const state =
      /aula_g=([^;]+)/.exec(start.headers.get("set-cookie") ?? "")?.[1] ?? "";
    const callback = await app.request(
      `/auth/google/callback?code=x&state=${state}`,
      { headers: { cookie: `aula_g=${state}` } },
    );
    expect(callback.status).toBe(200);
    expect(await callback.text()).toContain("Pinheiros");
    const pending = /aula_g_mail=([^;]+)/.exec(
      callback.headers.get("set-cookie") ?? "",
    )?.[1];
    expect(pending).toBeTruthy();
    const picked = await app.request("/login/google/demo", {
      method: "POST",
      headers: {
        cookie: `aula_g_mail=${pending}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ role: "guardian" }),
    });
    expect(picked.status).toBe(302);
    expect(picked.headers.get("location")).toBe("/g");
  });

  it("rejects student card stubs for every caller", async () => {
    const app = createTestApp();
    const unauth = await json(app, "/v1/auth/student-card", { method: "POST" });
    expect(unauth.res.status).toBe(403);
    expect(unauth.body).toEqual({ error: "children_do_not_log_in" });
    const { cookie } = await loginAs(app, "teacher");
    const teacher = await json(app, "/join", {
      method: "POST",
      headers: { cookie },
    });
    expect(teacher.res.status).toBe(403);
    expect(teacher.body).toEqual({ error: "children_do_not_log_in" });
    const page = await app.request("/join");
    expect(page.status).toBe(403);
  });
});

describe("group stubs", () => {
  it("teacher can create and invite; guardian cannot create", async () => {
    const app = createTestApp();
    const unauth = await json(app, "/v1/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "4.o B" }),
    });
    expect(unauth.res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const created = await json(app, "/v1/group", {
      method: "POST",
      headers: { cookie: teacher.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "4.o B" }),
    });
    expect(created.res.status).toBe(200);
    expect((created.body as { inviteCode: string }).inviteCode).toBe("PIN4B1");
    const invite = await json(app, "/v1/group/invite", {
      method: "POST",
      headers: { cookie: teacher.cookie },
    });
    expect(invite.res.status).toBe(200);
    const parent = await loginAs(app, "guardian");
    const forbidden = await json(app, "/v1/group", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });
    expect(forbidden.res.status).toBe(403);
  });

  it("adults can join with the seed invite; unauthenticated cannot", async () => {
    const app = createTestApp();
    const unauth = await json(app, "/v1/group/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "PIN4B1" }),
    });
    expect(unauth.res.status).toBe(401);
    const parent = await loginAs(app, "guardian");
    const joined = await json(app, "/v1/group/join", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "PIN4B1" }),
    });
    expect(joined.res.status).toBe(200);
    const missing = await json(app, "/v1/group/join", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "NOPE" }),
    });
    expect(missing.res.status).toBe(404);
  });
});

describe("feed create stubs", () => {
  it("teacher can stub a photo post; guardian and anonymous cannot", async () => {
    const app = createTestApp();
    const unauth = await json(app, "/v1/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "photo", body: "Herbs" }),
    });
    expect(unauth.res.status).toBe(401);
    const parent = await loginAs(app, "guardian");
    const forbidden = await json(app, "/v1/feed", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "photo", body: "Herbs" }),
    });
    expect(forbidden.res.status).toBe(403);
    const teacher = await loginAs(app, "teacher");
    const created = await json(app, "/v1/feed", {
      method: "POST",
      headers: { cookie: teacher.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "photo", body: "Herbs in the sun." }),
    });
    expect(created.res.status).toBe(200);
    const post = created.body as {
      type: string;
      storage: string;
      mediaKey: string;
    };
    expect(post.type).toBe("photo");
    expect(post.storage).toBe("stub");
    expect(post.mediaKey).toMatch(/^stub\//);
  });
});

describe("tomorrow week and MCP", () => {
  it("week and bring require an adult session", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/week")).res.status).toBe(401);
    expect((await json(app, "/v1/bring")).res.status).toBe(401);
    const { cookie } = await loginAs(app, "guardian");
    const week = await json(app, "/v1/week", { headers: { cookie } });
    expect(week.res.status).toBe(200);
    const body = week.body as {
      tomorrow: { happening: string; bring: string };
      story: unknown[];
    };
    expect(body.tomorrow.happening).toContain("Garden");
    expect(body.tomorrow.bring).toContain("Hat");
    expect(body.story.length).toBeGreaterThan(0);
    const bring = await json(app, "/v1/bring", { headers: { cookie } });
    expect((bring.body as { bring: string }).bring).toContain("Hat");
  });

  it("lists MCP tools without auth and calls them with a session", async () => {
    const app = createTestApp();
    const listed = await json(app, "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "tools/list" }),
    });
    expect(listed.res.status).toBe(200);
    expect((listed.body as { write: boolean }).write).toBe(false);
    const names = (listed.body as { tools: { name: string }[] }).tools.map(
      (tool) => tool.name,
    );
    expect(names).toEqual([
      "aula_tomorrow",
      "aula_bring",
      "aula_week",
      "aula_story",
    ]);
    const unauth = await json(app, "/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "aula_tomorrow" },
      }),
    });
    expect(unauth.res.status).toBe(401);
    const { cookie } = await loginAs(app, "teacher");
    const called = await json(app, "/mcp", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "aula_tomorrow" },
      }),
    });
    expect(called.res.status).toBe(200);
    expect((called.body as { happening: string }).happening).toContain(
      "Garden",
    );
  });
});

describe("consent and bug report", () => {
  it("guardian can record consent; teacher and anonymous cannot", async () => {
    const app = createTestApp();
    const unauth = await json(app, "/v1/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yolo: true }),
    });
    expect(unauth.res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const forbidden = await json(app, "/v1/consent", {
      method: "POST",
      headers: { cookie: teacher.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ yolo: true }),
    });
    expect(forbidden.res.status).toBe(403);
    const parent = await loginAs(app, "guardian");
    const saved = await json(app, "/v1/consent", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ photoOptOut: true, yolo: false }),
    });
    expect(saved.res.status).toBe(200);
    expect((saved.body as { photoOptOut: boolean }).photoOptOut).toBe(true);
  });

  it("accepts public and signed-in bug reports", async () => {
    const app = createTestApp();
    const publicReport = await json(app, "/bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Preview cookie looped." }),
    });
    expect(publicReport.res.status).toBe(200);
    expect((publicReport.body as { id: string }).id).toBeTruthy();
    const { cookie } = await loginAs(app, "teacher");
    const signed = await json(app, "/v1/bug-report", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Feed compose needs a caption." }),
    });
    expect(signed.res.status).toBe(200);
  });
});
