import { SEED } from "@aula/core";
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
    expect(html).toContain('action="/join"');
    expect(html).toContain("PIN4B1");
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

describe("Pinheiros seed", () => {
  it("shows the extra story, photo caption, and week note in both locales", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "teacher");
    const feed = await json(app, "/v1/feed", { headers: { cookie } });
    const posts = feed.body as {
      id: string;
      type: string;
      title: string;
      body: string;
    }[];
    const music = posts.find((post) => post.id === "post_music");
    const boxes = posts.find((post) => post.id === "post_boxes");
    expect(music?.type).toBe("story");
    expect(music?.title).toBe("Canto da musica");
    expect(music?.body).toContain("River R.");
    expect(boxes?.type).toBe("photo");
    expect(boxes?.body).toContain("legenda");
    const tomorrow = await json(app, "/v1/tomorrow", { headers: { cookie } });
    const plan = tomorrow.body as {
      happening: string;
      bring: string;
      updates: { body: string }[];
    };
    expect(plan.happening).toContain("jardim");
    expect(plan.bring).toContain("Chapeu");
    const notes = plan.updates.map((row) => row.body).join(" ");
    expect(notes).toContain("estrada");
    expect(notes).toContain("biblioteca");
    const enFeed = await json(app, "/v1/feed", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const enPosts = enFeed.body as {
      id: string;
      title: string;
      body: string;
    }[];
    expect(enPosts.find((post) => post.id === "post_music")?.title).toBe(
      "Music circle",
    );
    expect(enPosts.find((post) => post.id === "post_boxes")?.body).toContain(
      "Caption only",
    );
    const enPlan = await json(app, "/v1/tomorrow", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const enBody = enPlan.body as {
      happening: string;
      bring: string;
      updates: { body: string }[];
    };
    expect(enBody.happening).toContain("Garden");
    expect(enBody.bring).toContain("Hat");
    expect(enBody.updates.map((row) => row.body).join(" ")).toContain(
      "library bag",
    );
    const week = await json(app, "/v1/week", { headers: { cookie } });
    const weekBody = week.body as {
      tomorrow: { updates: { body: string }[] };
      story: { id: string }[];
    };
    expect(weekBody.story.map((post) => post.id)).toEqual(
      expect.arrayContaining(["post_music", "post_boxes", "post_garden"]),
    );
    expect(
      weekBody.tomorrow.updates.map((row) => row.body).join(" "),
    ).toContain("biblioteca");
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
    const teacher = await json(app, "/v1/auth/student-card", {
      method: "POST",
      headers: { cookie },
    });
    expect(teacher.res.status).toBe(403);
    expect(teacher.body).toEqual({ error: "children_do_not_log_in" });
    const parent = await loginAs(app, "guardian");
    const parentCard = await json(app, "/v1/auth/student-card", {
      method: "POST",
      headers: { cookie: parent.cookie },
    });
    expect(parentCard.res.status).toBe(403);
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
    expect(joined.body).toMatchObject({
      schoolName: "Pinheiros",
      className: "4.o B",
      already: true,
    });
    const teacher = await loginAs(app, "teacher");
    const teacherJoin = await json(app, "/v1/group/join", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteCode: "pin4b1" }),
    });
    expect(teacherJoin.res.status).toBe(200);
    expect((teacherJoin.body as { already: boolean }).already).toBe(true);
    const missing = await json(app, "/v1/group/join", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "NOPE" }),
    });
    expect(missing.res.status).toBe(400);
    expect(missing.body).toEqual({ error: "invalid" });
  });

  it("accepts PIN4B1 on landing and /join; wrong code is 400", async () => {
    const app = createTestApp();
    const page = await app.request("/join");
    expect(page.status).toBe(200);
    const joinHtml = await page.text();
    expect(joinHtml).toContain('action="/join"');
    expect(joinHtml).toContain("inviteCode");
    const landing = await app.request("/");
    expect(await landing.text()).toContain('action="/join"');
    const parent = await loginAs(app, "guardian");
    const already = await app.request("/join", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ inviteCode: "PIN4B1" }),
    });
    expect(already.status).toBe(200);
    const alreadyHtml = await already.text();
    expect(alreadyHtml).toContain("Pinheiros");
    expect(alreadyHtml).toContain("4.o B");
    expect(alreadyHtml).toMatch(/already|Ja estas/i);
    const bad = await app.request("/join", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ inviteCode: "NOPE" }),
    });
    expect(bad.status).toBe(400);
    expect(await bad.text()).toMatch(/not valid|nao e valido/i);
    const guestBad = await app.request("/join", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ inviteCode: "NOPE" }),
    });
    expect(guestBad.status).toBe(400);
    const guestJoin = await app.request("/join", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ inviteCode: "PIN4B1" }),
    });
    expect(guestJoin.status).toBe(200);
    expect(await guestJoin.text()).toContain("4.o B");
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
      uploaded: boolean;
      mediaKey?: string;
    };
    expect(post.type).toBe("photo");
    expect(post.storage).toBe("stub");
    expect(post.uploaded).toBe(false);
    expect(post.mediaKey).toBeUndefined();
    const form = new FormData();
    form.set("type", "photo");
    form.set("body", "Herbs in the sun.");
    const htmlPost = await app.request("/t/feed", {
      method: "POST",
      headers: { cookie: teacher.cookie },
      body: form,
    });
    expect(htmlPost.status).toBe(302);
    expect(htmlPost.headers.get("location")).toBe("/t/feed?storage=stub");
    const shown = await app.request("/t/feed?storage=stub", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(await shown.text()).toContain("uploaded is false");
  });

  it("puts photo bytes on MEDIA when the binding is present", async () => {
    const mediaPuts: { key: string; type: string }[] = [];
    const app = createTestApp({ mediaPuts });
    const { cookie } = await loginAs(app, "teacher");
    const form = new FormData();
    form.set("type", "photo");
    form.set("body", "Herbs in the sun.");
    form.set(
      "file",
      new File([new Uint8Array([1, 2, 3, 4])], "herbs.jpg", {
        type: "image/jpeg",
      }),
    );
    const created = await app.request("/v1/feed", {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    expect(created.status).toBe(200);
    const post = (await created.json()) as {
      id: string;
      storage: string;
      uploaded: boolean;
      mediaKey: string;
      attachment?: { stub: boolean; href: string };
    };
    expect(post.storage).toBe("r2");
    expect(post.uploaded).toBe(true);
    expect(post.mediaKey).toMatch(/^feed\//);
    expect(post.attachment?.stub).toBe(false);
    expect(mediaPuts).toEqual([{ key: post.mediaKey, type: "image/jpeg" }]);
    const listed = await json(app, "/v1/feed", { headers: { cookie } });
    const saved = (
      listed.body as { id: string; attachment?: { stub: boolean } }[]
    ).find((row) => row.id === post.id);
    expect(saved?.attachment?.stub).toBe(false);
    const bytes = await app.request(`/v1/feed/${post.id}/media`, {
      headers: { cookie },
    });
    expect(bytes.status).toBe(200);
    expect(new Uint8Array(await bytes.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    const parent = await loginAs(app, "guardian");
    const parentGet = await app.request(`/v1/feed/${post.id}/media`, {
      headers: { cookie: parent.cookie },
    });
    expect(parentGet.status).toBe(200);
    expect((await app.request(`/v1/feed/${post.id}/media`)).status).toBe(401);
    const page = await app.request("/t/feed", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    expect(await page.text()).toContain("Open photo");
  });

  it("keeps uploaded false when R2 put fails", async () => {
    const app = createTestApp({ mediaFail: true });
    const { cookie } = await loginAs(app, "teacher");
    const form = new FormData();
    form.set("type", "photo");
    form.set("body", "Herbs in the sun.");
    form.set(
      "file",
      new File([new Uint8Array([1, 2, 3, 4])], "herbs.jpg", {
        type: "image/jpeg",
      }),
    );
    const created = await json(app, "/v1/feed", {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    expect(created.body).toMatchObject({
      storage: "stub",
      uploaded: false,
    });
    expect((created.body as { mediaKey?: string }).mediaKey).toBeUndefined();
    const shown = await app.request("/t/feed?storage=stub", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    expect(await shown.text()).toContain("uploaded is false");
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
    const weekBody = week.body as {
      tomorrow: { happening: string; bring: string };
      story: unknown[];
      notes: { body: string }[];
      highlights: { preview: string }[];
    };
    expect(weekBody.tomorrow.happening).toContain("jardim");
    expect(weekBody.tomorrow.bring).toContain("Chapeu");
    expect(weekBody.story.length).toBeGreaterThan(0);
    const notes = weekBody.notes.map((row) => row.body).join(" ");
    expect(notes).toContain("estrada");
    expect(notes).toContain("biblioteca");
    expect(weekBody.highlights.length).toBeGreaterThan(0);
    const bring = await json(app, "/v1/bring", { headers: { cookie } });
    expect((bring.body as { bring: string }).bring).toContain("Chapeu");
    expect(
      (bring.body as { updates: { body: string }[] }).updates
        .map((row) => row.body)
        .join(" "),
    ).toContain("biblioteca");
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
      "aula_ask",
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
      "jardim",
    );
    const bring = await json(app, "/mcp", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "aula_bring" },
      }),
    });
    expect((bring.body as { bring: string }).bring).toContain("Chapeu");
    const week = await json(app, "/mcp", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "aula_week" },
      }),
    });
    const weekBody = week.body as {
      tomorrow: { happening: string; bring: string };
      story: { body: string; label?: string }[];
      notes: { body: string }[];
      highlights: { preview: string }[];
    };
    expect(weekBody.tomorrow.happening).toContain("jardim");
    expect(weekBody.tomorrow.bring).toContain("Chapeu");
    expect(weekBody.story.length).toBeGreaterThan(0);
    const weekNotes = weekBody.notes.map((row) => row.body).join(" ");
    expect(weekNotes).toContain("estrada");
    expect(weekNotes).toContain("biblioteca");
    expect(weekBody.highlights.length).toBeGreaterThan(0);
    const asked = await json(app, "/mcp", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "tools/call",
        params: {
          name: "aula_ask",
          arguments: { q: "O que e a escola amanha?" },
        },
      }),
    });
    expect(asked.res.status).toBe(200);
    expect((asked.body as { source: string; answer: string }).source).toBe(
      "template",
    );
    expect((asked.body as { answer: string }).answer).toContain("jardim");
    expect((asked.body as { answer: string }).answer).toContain("Chapeu");
    const parent = await loginAs(app, "guardian");
    await json(app, "/v1/privacy", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoOptOut: true, yolo: false }),
    });
    const story = await json(app, "/mcp", {
      method: "POST",
      headers: {
        cookie: `${cookie}; aula_locale=en`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "tools/call",
        params: { name: "aula_story" },
      }),
    });
    const posts = story.body as { body: string; label?: string }[];
    const redacted = posts.find((row) => row.label === "photo declined");
    expect(redacted).toBeTruthy();
    expect(redacted?.body).not.toContain("Oak P.");
    const weekPage = await app.request("/t/week", {
      headers: { cookie },
    });
    expect(weekPage.status).toBe(200);
    expect(await weekPage.text()).toContain("biblioteca");
    expect((await app.request("/g/week", { headers: { cookie } })).status).toBe(
      403,
    );
    const parentWeek = await app.request("/g/week", {
      headers: { cookie: parent.cookie },
    });
    expect(parentWeek.status).toBe(200);
    expect(await parentWeek.text()).toContain("biblioteca");
  });
});

describe("consent and bug report", () => {
  it("guardian privacy toggle persists; teacher and anonymous cannot write", async () => {
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
    const before = await json(app, "/v1/privacy", {
      headers: { cookie: parent.cookie },
    });
    expect(before.body).toEqual({
      photoOptOut: false,
      yolo: false,
      editable: true,
    });
    const saved = await json(app, "/v1/consent", {
      method: "POST",
      headers: { cookie: parent.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ photoOptOut: true, yolo: false }),
    });
    expect(saved.res.status).toBe(200);
    expect(saved.body).toEqual({
      photoOptOut: true,
      yolo: false,
      editable: true,
    });
    const again = await json(app, "/v1/privacy", {
      headers: { cookie: parent.cookie },
    });
    expect(again.body).toEqual({
      photoOptOut: true,
      yolo: false,
      editable: true,
    });
    const htmlSave = await app.request("/g/privacy", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ photoOptOut: "1", yolo: "1" }),
    });
    expect(htmlSave.status).toBe(302);
    expect(htmlSave.headers.get("location")).toBe("/g/privacy?saved=1");
    const shown = await app.request("/g/privacy?saved=1", {
      headers: { cookie: `${parent.cookie}; aula_locale=en` },
    });
    const html = await shown.text();
    expect(html).toContain("Saved.");
    expect(html).toContain('name="yolo"');
    expect(html).toContain("checked");
    const teacherOnParent = await app.request("/t/privacy", {
      headers: { cookie: parent.cookie },
    });
    expect(teacherOnParent.status).toBe(403);
  });

  it("stores an adult bug report with path and sha; anonymous cannot", async () => {
    const app = createTestApp({ sha: "abc123def" });
    const publicReport = await json(app, "/bug-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Preview cookie looped." }),
    });
    expect(publicReport.res.status).toBe(401);
    const guestPage = await app.request("/bugs", {
      headers: { cookie: "aula_locale=en" },
    });
    expect(await guestPage.text()).toContain("Sign in as a teacher or parent");
    const { cookie } = await loginAs(app, "teacher");
    const chrome = await app.request("/t/feed", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const chromeHtml = await chrome.text();
    expect(chromeHtml).toContain("aula-bug-hold");
    expect(chromeHtml).toContain("Press and hold Report a bug");
    const signed = await json(app, "/v1/bug-report", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "Feed compose needs a caption.",
        path: "/t/feed",
      }),
    });
    expect(signed.res.status).toBe(200);
    expect(signed.body).toMatchObject({
      actorId: expect.any(String),
      role: "teacher",
      path: "/t/feed",
      sha: "abc123def",
      status: "open",
      note: "Feed compose needs a caption.",
    });
    expect((signed.body as { id: string }).id).toBeTruthy();
    const queue = await json(app, "/v1/bugs", { headers: { cookie } });
    expect(
      (queue.body as { id: string; status: string }[]).some(
        (row) =>
          row.id === (signed.body as { id: string }).id &&
          row.status === "open",
      ),
    ).toBe(true);
    const listPage = await app.request("/bugs", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const listHtml = await listPage.text();
    expect(listHtml).toContain("Open issues");
    expect(listHtml).toContain("Feed compose needs a caption.");
    expect(listHtml).toContain("This queue is not Linear.");
    expect(listHtml).toContain("Done");
    const parent = await loginAs(app, "guardian");
    const form = await app.request("/bugs?from=/g/tomorrow", {
      headers: { cookie: `${parent.cookie}; aula_locale=en` },
    });
    const formHtml = await form.text();
    expect(formHtml).toContain("/g/tomorrow");
    const posted = await app.request("/bugs", {
      method: "POST",
      headers: {
        cookie: `${parent.cookie}; aula_locale=en`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        body: "Tomorrow card wrapped.",
        path: "/g/tomorrow",
        sha: "abc123def",
      }),
    });
    expect(posted.status).toBe(200);
    const thanks = await posted.text();
    expect(thanks).toContain("Thanks. We have the note.");
    expect(thanks).toContain("guardian /g/tomorrow abc123def");
    expect(thanks).toContain("open");
    const after = await app.request("/bugs", {
      headers: { cookie: `${parent.cookie}; aula_locale=en` },
    });
    expect(await after.text()).toContain("Tomorrow card wrapped.");
    const bugId = (signed.body as { id: string }).id;
    expect(
      (await json(app, `/v1/bugs/${bugId}`, { method: "POST" })).res.status,
    ).toBe(401);
    const closed = await json(app, `/v1/bugs/${bugId}`, {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "done" }),
    });
    expect(closed.res.status).toBe(200);
    expect((closed.body as { status: string }).status).toBe("done");
    const remaining = await json(app, "/v1/bugs", {
      headers: { cookie },
    });
    expect(
      (remaining.body as { id: string }[]).some((row) => row.id === bugId),
    ).toBe(false);
    const htmlClose = await app.request(
      `/bugs/${(remaining.body as { id: string }[])[0]?.id}`,
      {
        method: "POST",
        headers: {
          cookie,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ action: "done" }),
      },
    );
    expect(htmlClose.status).toBe(200);
    expect(await htmlClose.text()).toMatch(/Marked done|Marcado como feito/);
  });
});

describe("dm photo excursion and read more", () => {
  it("lets a teacher request a DM that a parent can accept", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/dm")).res.status).toBe(401);
    expect(
      (
        await json(app, "/v1/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guardianId: SEED.parentId }),
        })
      ).res.status,
    ).toBe(401);
    expect((await json(app, "/v1/dm/x")).res.status).toBe(401);
    expect((await json(app, "/v1/feed/post_assembly")).res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const parentAsk = await json(app, "/v1/dm", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guardianId: SEED.parentId }),
    });
    expect(parentAsk.res.status).toBe(403);
    const asked = await json(app, "/v1/dm", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guardianId: SEED.parentId }),
    });
    expect(asked.res.status).toBe(200);
    const request = asked.body as { id: string; status: string };
    expect(request.status).toBe("pending");
    const teacherAccept = await json(app, `/v1/dm/${request.id}`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    expect(teacherAccept.res.status).toBe(403);
    const inbox = await json(app, "/v1/dm", {
      headers: { cookie: parent.cookie },
    });
    expect(
      (inbox.body as { status: string }[]).some(
        (row) => row.status === "pending",
      ),
    ).toBe(true);
    const accepted = await json(app, `/v1/dm/${request.id}`, {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    expect((accepted.body as { status: string }).status).toBe("accepted");
    const note = await json(app, `/v1/dm/${request.id}/messages`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "Hats for the garden." }),
    });
    expect(note.res.status).toBe(200);
    expect(
      (note.body as { messages: { body: string }[] }).messages[0]?.body,
    ).toBe("Hats for the garden.");
    const parentOnTeacher = await app.request("/t/dm", {
      headers: { cookie: parent.cookie },
    });
    expect(parentOnTeacher.status).toBe(403);
    const second = createTestApp();
    const t2 = await loginAs(second, "teacher");
    const p2 = await loginAs(second, "guardian");
    const again = await json(second, "/v1/dm", {
      method: "POST",
      headers: {
        cookie: t2.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guardianId: SEED.parentId }),
    });
    const declined = await json(
      second,
      `/v1/dm/${(again.body as { id: string }).id}`,
      {
        method: "POST",
        headers: {
          cookie: p2.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "decline" }),
      },
    );
    expect((declined.body as { status: string }).status).toBe("declined");
    const blocked = await json(
      second,
      `/v1/dm/${(again.body as { id: string }).id}/messages`,
      {
        method: "POST",
        headers: {
          cookie: t2.cookie,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "Nope." }),
      },
    );
    expect(blocked.res.status).toBe(403);
  });

  it("mints a new pending after accept so decline can be walked", async () => {
    const app = createTestApp();
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const first = await json(app, "/v1/dm", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guardianId: SEED.parentId }),
    });
    const acceptedId = (first.body as { id: string }).id;
    await json(app, `/v1/dm/${acceptedId}`, {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    const stillOpen = await json(app, `/v1/dm/${acceptedId}/messages`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "Hats stay on." }),
    });
    expect(stillOpen.res.status).toBe(200);
    const second = await json(app, "/v1/dm", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guardianId: SEED.parentId }),
    });
    expect(second.res.status).toBe(200);
    const pending = second.body as { id: string; status: string };
    expect(pending.status).toBe("pending");
    expect(pending.id).not.toBe(acceptedId);
    const inbox = await json(app, "/v1/dm", {
      headers: { cookie: parent.cookie },
    });
    expect(
      (inbox.body as { id: string; status: string }[]).some(
        (row) => row.id === pending.id && row.status === "pending",
      ),
    ).toBe(true);
    const html = await app.request("/g/dm", {
      headers: { cookie: parent.cookie },
    });
    expect(await html.text()).toContain("Recusar");
    const declined = await json(app, `/v1/dm/${pending.id}`, {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "decline" }),
    });
    expect((declined.body as { status: string }).status).toBe("declined");
    const blocked = await json(app, `/v1/dm/${pending.id}/messages`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "Nope." }),
    });
    expect(blocked.res.status).toBe(403);
    const acceptedStill = await json(app, `/v1/dm/${acceptedId}/messages`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "Still the open thread." }),
    });
    expect(acceptedStill.res.status).toBe(200);
  });

  it("redacts opted-out child names on teacher feed and keeps them for that parent", async () => {
    const app = createTestApp();
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    await json(app, "/v1/privacy", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoOptOut: true, yolo: false }),
    });
    const teacherFeed = await json(app, "/v1/feed", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    const oak = (
      teacherFeed.body as {
        id: string;
        body: string;
        redacted?: boolean;
        label?: string;
      }[]
    ).find((post) => post.id === "post_oak");
    expect(oak?.redacted).toBe(true);
    expect(oak?.label).toBe("photo declined");
    expect(oak?.body).not.toContain("Oak P.");
    expect(oak?.body).toContain("photo declined");
    const parentFeed = await json(app, "/v1/feed", {
      headers: { cookie: parent.cookie },
    });
    const own = (parentFeed.body as { id: string; body: string }[]).find(
      (post) => post.id === "post_oak",
    );
    expect(own?.body).toContain("Oak P.");
    const html = await app.request("/t/feed", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(await html.text()).toContain("photo declined");
  });

  it("approves an excursion by tap or YOLO", async () => {
    const app = createTestApp();
    expect(
      (
        await json(app, "/v1/excursion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "exc_garden" }),
        })
      ).res.status,
    ).toBe(401);
    const parent = await loginAs(app, "guardian");
    const pending = await json(app, "/v1/tomorrow", {
      headers: { cookie: parent.cookie },
    });
    const first = pending.body as {
      excursion?: { id: string; status: string };
    };
    expect(first.excursion?.id).toBe("exc_garden");
    expect(first.excursion?.status).toBe("pending");
    const tapped = await json(app, "/v1/excursion", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "exc_garden" }),
    });
    expect(tapped.body).toMatchObject({ status: "approved", source: "tap" });
    const other = createTestApp();
    const yoloParent = await loginAs(other, "guardian");
    await json(other, "/v1/privacy", {
      method: "POST",
      headers: {
        cookie: yoloParent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoOptOut: false, yolo: true }),
    });
    const auto = await json(other, "/v1/tomorrow", {
      headers: { cookie: yoloParent.cookie },
    });
    expect(
      (auto.body as { excursion?: { status: string; source?: string } })
        .excursion,
    ).toMatchObject({ status: "auto", source: "yolo" });
    const teacher = await loginAs(app, "teacher");
    const forbidden = await json(app, "/v1/excursion", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: "exc_garden" }),
    });
    expect(forbidden.res.status).toBe(403);
  });

  it("truncates long posts and shows an attachment stub on photos", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "teacher");
    const feed = await json(app, "/v1/feed", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const posts = feed.body as {
      id: string;
      truncated: boolean;
      preview: string;
      body: string;
      attachment?: { stub: boolean; label: string };
    }[];
    const assembly = posts.find((post) => post.id === "post_assembly");
    expect(assembly?.truncated).toBe(true);
    expect(assembly?.preview.length).toBeLessThan(assembly?.body.length ?? 0);
    const full = await json(app, "/v1/feed/post_assembly", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    expect((full.body as { body: string }).body).toContain("library bag");
    const boxes = posts.find((post) => post.id === "post_boxes");
    expect(boxes?.attachment?.stub).toBe(true);
    const html = await app.request("/t/feed", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const page = await html.text();
    expect(page).toContain("Read more");
    expect(page).toContain("Attachment (stub)");
  });
});

describe("quiet Home ask", () => {
  it("answers from the Pinheiros template and forbids the other nest", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/ask?q=tomorrow")).res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const asked = await json(app, "/v1/ask", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "O que e a escola amanha?" }),
    });
    expect(asked.res.status).toBe(200);
    const body = asked.body as {
      source: string;
      answer: string;
      question: string;
    };
    expect(body.source).toBe("template");
    expect(body.question).toContain("amanha");
    expect(body.answer).toContain("jardim");
    expect(body.answer).toContain("Chapeu");
    const en = await json(app, "/v1/ask?q=What%20is%20school%20tomorrow", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(en.res.status).toBe(200);
    expect((en.body as { answer: string }).answer).toContain("Garden");
    expect((en.body as { answer: string }).answer).toContain("Hat");
    const parentAsk = await json(app, "/v1/ask?q=jardim", {
      headers: { cookie: parent.cookie },
    });
    expect(parentAsk.res.status).toBe(200);
    expect((parentAsk.body as { answer: string }).answer).toContain("jardim");
    const empty = await json(app, "/v1/ask", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "   " }),
    });
    expect(empty.res.status).toBe(400);
    const home = await app.request("/t", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    const homeHtml = await home.text();
    expect(homeHtml).toContain("Ask Home");
    expect(homeHtml).toContain('action="/t/ask"');
    const parentHome = await app.request("/g", {
      headers: { cookie: parent.cookie },
    });
    expect(await parentHome.text()).toContain("Pergunta ao Home");
    const page = await app.request("/t/ask?q=amanha", {
      headers: { cookie: teacher.cookie },
    });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("jardim");
    expect(
      (
        await app.request("/g/ask?q=amanha", {
          headers: { cookie: teacher.cookie },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await app.request("/t/ask?q=amanha", {
          headers: { cookie: parent.cookie },
        })
      ).status,
    ).toBe(403);
    const parentPage = await app.request("/g/ask?q=amanha", {
      headers: { cookie: parent.cookie },
    });
    expect(parentPage.status).toBe(200);
    expect(await parentPage.text()).toContain("Chapeu");
  });
});

describe("adult summary", () => {
  it("builds a template digest for adults and forbids the other nest", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/summary")).res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const digest = await json(app, "/v1/summary", {
      headers: { cookie: teacher.cookie },
    });
    expect(digest.res.status).toBe(200);
    const body = digest.body as {
      source: string;
      body: string;
      happening: string;
      bring: string;
      highlights: { id: string }[];
    };
    expect(body.source).toBe("template");
    expect(body.body).toContain("jardim");
    expect(body.body).toContain("Chapeu");
    expect(body.happening).toContain("jardim");
    expect(body.bring).toContain("Chapeu");
    expect(body.highlights.length).toBeGreaterThan(0);
    const en = await json(app, "/v1/summary", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect((en.body as { body: string }).body).toContain("Garden");
    expect((en.body as { body: string }).body).toContain("Hat");
    const parentDigest = await json(app, "/v1/summary", {
      headers: { cookie: parent.cookie },
    });
    expect(parentDigest.res.status).toBe(200);
    const home = await app.request("/t", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(await home.text()).toContain("Summary");
    const page = await app.request("/t/summary", {
      headers: { cookie: teacher.cookie },
    });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Resumo");
    expect(
      (await app.request("/g/summary", { headers: { cookie: teacher.cookie } }))
        .status,
    ).toBe(403);
    expect(
      (await app.request("/t/summary", { headers: { cookie: parent.cookie } }))
        .status,
    ).toBe(403);
    const feed = await app.request("/g/feed", {
      headers: { cookie: parent.cookie },
    });
    expect(await feed.text()).toContain("Resumo");
  });

  it("redacts opted-out names inside the teacher summary", async () => {
    const app = createTestApp();
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    await json(app, "/v1/privacy", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photoOptOut: true, yolo: false }),
    });
    const teacherDigest = await json(app, "/v1/summary", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    const text = (teacherDigest.body as { body: string }).body;
    expect(text).toContain("photo declined");
    expect(text).not.toContain("Oak P.");
    const own = await json(app, "/v1/summary", {
      headers: { cookie: parent.cookie },
    });
    expect((own.body as { body: string }).body).toContain("Oak P.");
  });
});

describe("voice and auto-bug", () => {
  it("shows a transcript or a play link for voice notes", async () => {
    const app = createTestApp();
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const textOnly = await json(app, "/v1/feed", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "voice",
        body: "Water on the boxes. Quiet.",
      }),
    });
    expect(textOnly.res.status).toBe(200);
    const note = textOnly.body as {
      type: string;
      body: string;
      attachment?: { stub: boolean };
    };
    expect(note.type).toBe("voice");
    expect(note.body).toContain("Water on the boxes");
    expect(note.attachment).toBeUndefined();
    const forbidden = await json(app, "/v1/feed", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "voice", body: "Nope." }),
    });
    expect(forbidden.res.status).toBe(403);
    const mediaPuts: { key: string; type: string }[] = [];
    const withMedia = createTestApp({ mediaPuts });
    const t2 = await loginAs(withMedia, "teacher");
    const form = new FormData();
    form.set("type", "voice");
    form.set(
      "file",
      new File([new Uint8Array([9, 8, 7])], "note.webm", {
        type: "audio/webm",
      }),
    );
    const audio = await json(withMedia, "/v1/feed", {
      method: "POST",
      headers: { cookie: t2.cookie },
      body: form,
    });
    const voice = audio.body as {
      id: string;
      type: string;
      uploaded: boolean;
      attachment?: { kind: string; stub: boolean; href: string };
    };
    expect(voice.type).toBe("voice");
    expect(voice.uploaded).toBe(true);
    expect(voice.attachment?.kind).toBe("audio");
    expect(voice.attachment?.stub).toBe(false);
    const play = await withMedia.request(`/v1/feed/${voice.id}/media`, {
      headers: { cookie: t2.cookie },
    });
    expect(play.status).toBe(200);
    const page = await withMedia.request("/t/feed", {
      headers: { cookie: `${t2.cookie}; aula_locale=en` },
    });
    expect(await page.text()).toContain("Play audio");
    const seed = await json(app, "/v1/feed", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(
      (seed.body as { id: string; body: string }[]).some(
        (row) =>
          row.id === "post_voice" && row.body.includes("heard the water"),
      ),
    ).toBe(true);
  });

  it("records unavailable auto-bugs for teachers only", async () => {
    const app = createTestApp({ sha: "abc123def" });
    expect((await json(app, "/v1/debug/unavailable")).res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const parentBoom = await json(app, "/v1/debug/unavailable", {
      headers: { cookie: parent.cookie },
    });
    expect(parentBoom.res.status).toBe(403);
    const before = await json(app, "/v1/bugs", {
      headers: { cookie: teacher.cookie },
    });
    expect((before.body as unknown[]).length).toBe(0);
    const boom = await json(app, "/v1/debug/unavailable", {
      headers: { cookie: teacher.cookie },
    });
    expect(boom.res.status).toBe(503);
    const listed = await json(app, "/v1/bugs", {
      headers: { cookie: teacher.cookie },
    });
    const rows = listed.body as { path: string | null; sha: string | null }[];
    expect(rows.some((row) => row.path === "/v1/debug/unavailable")).toBe(true);
    expect(rows[0]?.sha).toBe("abc123def");
    const denied = await json(app, "/v1/feed", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "photo", body: "Nope." }),
    });
    expect(denied.res.status).toBe(403);
    const after = await json(app, "/v1/bugs", {
      headers: { cookie: parent.cookie },
    });
    expect(
      (after.body as { path: string | null; status: string }[]).length,
    ).toBe(1);
    expect(
      (after.body as { path: string | null; status: string }[])[0],
    ).toMatchObject({
      path: "/v1/debug/unavailable",
      status: "open",
    });
  });
});

describe("feature export and payments stubs", () => {
  it("lets adults submit a feature ask and teachers decide", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/features")).res.status).toBe(401);
    const guest = await app.request("/features", {
      headers: { cookie: "aula_locale=en" },
    });
    expect(await guest.text()).toContain("Sign in as a teacher or parent");
    const parent = await loginAs(app, "guardian");
    const teacher = await loginAs(app, "teacher");
    const open = await json(app, "/v1/features", {
      headers: { cookie: parent.cookie },
    });
    expect(open.res.status).toBe(200);
    expect(
      (open.body as { id: string; note: string; status: string }[]).some(
        (row) =>
          row.id === "feat_library" &&
          row.note.includes("library bag") &&
          row.status === "open",
      ),
    ).toBe(true);
    const created = await json(app, "/v1/features", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "A quieter Friday assembly reminder." }),
    });
    expect(created.res.status).toBe(200);
    const createdBody = created.body as { id: string; status: string };
    expect(createdBody.status).toBe("open");
    const parentDecide = await json(app, `/v1/features/${createdBody.id}`, {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    expect(parentDecide.res.status).toBe(403);
    const accepted = await json(app, `/v1/features/${createdBody.id}`, {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept" }),
    });
    expect(accepted.res.status).toBe(200);
    expect((accepted.body as { status: string }).status).toBe("accepted");
    const after = await json(app, "/v1/features", {
      headers: { cookie: teacher.cookie },
    });
    expect(
      (after.body as { id: string }[]).some((row) => row.id === createdBody.id),
    ).toBe(false);
    const rejected = await json(app, "/v1/features/feat_library", {
      method: "POST",
      headers: {
        cookie: teacher.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "reject" }),
    });
    expect(rejected.res.status).toBe(200);
    expect((rejected.body as { status: string }).status).toBe("rejected");
    const empty = await json(app, "/v1/features", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "   " }),
    });
    expect(empty.res.status).toBe(400);
    const leftover = await json(app, "/v1/features", {
      method: "POST",
      headers: {
        cookie: parent.cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: "A garden listen replay." }),
    });
    expect(leftover.res.status).toBe(200);
    const page = await app.request("/features", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    const html = await page.text();
    expect(html).toContain("Feature asks");
    expect(html).toContain("Accept");
    const parentPage = await app.request("/features", {
      headers: { cookie: parent.cookie },
    });
    expect(await parentPage.text()).toContain("Pedidos");
  });

  it("keeps export honest and payments test-only", async () => {
    const app = createTestApp();
    expect((await json(app, "/v1/export")).res.status).toBe(401);
    expect((await json(app, "/v1/payments")).res.status).toBe(401);
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    const parentExport = await json(app, "/v1/export", {
      headers: { cookie: parent.cookie },
    });
    expect(parentExport.res.status).toBe(403);
    const teacherPay = await json(app, "/v1/payments", {
      headers: { cookie: teacher.cookie },
    });
    expect(teacherPay.res.status).toBe(403);
    const exported = await json(app, "/v1/export", {
      method: "POST",
      headers: { cookie: teacher.cookie },
    });
    expect(exported.res.status).toBe(200);
    expect(exported.body).toEqual({
      exported: false,
      connected: false,
      live: false,
      status: "not_connected",
      destinations: ["google_photos", "google_drive"],
    });
    const pay = await json(app, "/v1/payments", {
      headers: { cookie: parent.cookie },
    });
    expect(pay.res.status).toBe(200);
    expect(pay.body).toEqual({
      live: false,
      stripe: false,
      provider: "stub",
      status: "test_not_live",
    });
    const exportPage = await app.request("/t/export", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(exportPage.status).toBe(200);
    const exportHtml = await exportPage.text();
    expect(exportHtml).toContain("not connected");
    expect(exportHtml).toContain("Coming soon");
    expect(exportHtml).not.toMatch(/exported successfully|success/i);
    const home = await app.request("/t", {
      headers: { cookie: `${teacher.cookie}; aula_locale=en` },
    });
    expect(await home.text()).toContain("Export (stub)");
    expect(
      (
        await app.request("/g/payments", {
          headers: { cookie: teacher.cookie },
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request("/t/export", { headers: { cookie: parent.cookie } }))
        .status,
    ).toBe(403);
    const payPage = await app.request("/g/payments", {
      headers: { cookie: `${parent.cookie}; aula_locale=en` },
    });
    expect(payPage.status).toBe(200);
    const payHtml = await payPage.text();
    expect(payHtml).toContain("Test. Not live.");
    expect(payHtml).toContain("No live Stripe");
    const parentHome = await app.request("/g", {
      headers: { cookie: `${parent.cookie}; aula_locale=en` },
    });
    expect(await parentHome.text()).toContain("Payments");
  });
});
