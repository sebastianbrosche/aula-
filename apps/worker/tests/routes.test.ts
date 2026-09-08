import { describe, expect, it } from "vitest";
import { createTestApp, loginAs } from "./harness.ts";

describe("auth and demo surfaces", () => {
  it("unauthenticated HTML goes to login", async () => {
    const app = createTestApp();
    const res = await app.request("/t");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  it("unauthenticated JSON is 401", async () => {
    const app = createTestApp();
    const res = await app.request("/v1/feed");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("teacher demo login reaches feed and tomorrow", async () => {
    const app = createTestApp();
    const { cookie, res } = await loginAs(app, "teacher");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/t");
    const home = await app.request("/t", { headers: { cookie } });
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain("jardim");
    const feed = await app.request("/v1/feed", { headers: { cookie } });
    expect(feed.status).toBe(200);
    const posts = (await feed.json()) as { body: string }[];
    expect(posts.length).toBeGreaterThan(0);
    const tomorrow = await app.request("/v1/tomorrow", { headers: { cookie } });
    const plan = (await tomorrow.json()) as {
      happening: string;
      bring: string;
      updates: { body: string }[];
    };
    expect(plan.happening).toContain("jardim");
    expect(plan.bring).toContain("Chapeu");
    const updateText = plan.updates.map((row) => row.body).join(" ");
    expect(updateText).toContain("estrada");
    expect(updateText).toContain("biblioteca");
    const en = await app.request("/v1/tomorrow", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const enPlan = (await en.json()) as { happening: string; bring: string };
    expect(enPlan.happening).toContain("Garden");
    expect(enPlan.bring).toContain("Hat");
  });

  it("forbids the other role on nested HTML pages", async () => {
    const app = createTestApp();
    const teacher = await loginAs(app, "teacher");
    for (const path of [
      "/g/feed",
      "/g/group",
      "/g/tomorrow",
      "/g/dm",
      "/g/summary",
      "/g/ask",
    ]) {
      const res = await app.request(path, {
        headers: { cookie: teacher.cookie },
      });
      expect(res.status, path).toBe(403);
    }
    for (const path of [
      "/t/feed",
      "/t/group",
      "/t/tomorrow",
      "/t/dm",
      "/t/summary",
      "/t/ask",
    ]) {
      const res = await app.request(path, {
        headers: { cookie: teacher.cookie },
      });
      expect(res.status, path).toBe(200);
      expect(await res.text()).toMatch(
        /jardim|Pinheiros|turma|Mural|Amanha|Grupo|Mensagens|Rui|Resumo/i,
      );
    }
    const parent = await loginAs(app, "guardian");
    for (const path of [
      "/t/feed",
      "/t/group",
      "/t/tomorrow",
      "/t/dm",
      "/t/summary",
      "/t/ask",
    ]) {
      const res = await app.request(path, {
        headers: { cookie: parent.cookie },
      });
      expect(res.status, path).toBe(403);
    }
    for (const path of [
      "/g/feed",
      "/g/group",
      "/g/tomorrow",
      "/g/dm",
      "/g/summary",
      "/g/ask",
    ]) {
      const res = await app.request(path, {
        headers: { cookie: parent.cookie },
      });
      expect(res.status, path).toBe(200);
      expect(await res.text()).toMatch(
        /jardim|Pinheiros|turma|Mural|Amanha|Grupo|Mensagens|Rui|Resumo/i,
      );
    }
  });

  it("parent demo login can open group and privacy", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "guardian");
    const group = await app.request("/v1/group", { headers: { cookie } });
    expect(group.status).toBe(200);
    const body = (await group.json()) as {
      schoolName: string;
      className: string;
      inviteCode: string;
      adults: { displayName: string }[];
      children: { displayName: string }[];
    };
    expect(body.schoolName).toBe("Pinheiros");
    expect(body.className).toBe("4.o B");
    expect(body.inviteCode).toBe("PIN4B1");
    expect(body.adults.map((person) => person.displayName)).toEqual(
      expect.arrayContaining(["Ana Costa", "Rui Mendes"]),
    );
    expect(body.children.map((child) => child.displayName)).toEqual([
      "Cedar M.",
      "Oak P.",
      "River R.",
    ]);
    const page = await app.request("/g/group", {
      headers: { cookie: `${cookie}; aula_locale=en` },
    });
    const html = await page.text();
    expect(html).toContain("4.o B");
    expect(html).toContain("PIN4B1");
    expect(html).toContain("Ana Costa");
    expect(html).toContain("Rui Mendes");
    expect(html).toContain("Cedar M.");
    expect(html).toContain("Oak P.");
    expect(html).toContain("River R.");
    const privacy = await app.request("/g/privacy", { headers: { cookie } });
    expect(privacy.status).toBe(200);
    expect(await privacy.text()).toContain("YOLO");
  });

  it("teacher can read quiet privacy defaults but cannot save parent YOLO", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "teacher");
    const read = await app.request("/v1/privacy", { headers: { cookie } });
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({
      photoOptOut: false,
      yolo: false,
      editable: false,
    });
    const write = await app.request("/v1/privacy", {
      method: "POST",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ yolo: true }),
    });
    expect(write.status).toBe(403);
    const page = await app.request("/t/privacy", { headers: { cookie } });
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("YOLO");
    const parentSurface = await app.request("/g/privacy", {
      headers: { cookie },
    });
    expect(parentSurface.status).toBe(403);
  });

  it("parent is forbidden from teacher home", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "guardian");
    const res = await app.request("/t", { headers: { cookie } });
    expect(res.status).toBe(403);
  });

  it("magic link verify signs in a seeded adult", async () => {
    const app = createTestApp({ demoLogin: true, mailerSent: false });
    const asked = await app.request("/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana.costa@pinheiros.aula.test" }),
    });
    expect(asked.status).toBe(200);
    const payload = (await asked.json()) as { previewUrl?: string };
    expect(payload.previewUrl).toBeTruthy();
    const verify = await app.request(
      new URL(payload.previewUrl ?? "", "http://localhost").pathname +
        new URL(payload.previewUrl ?? "", "http://localhost").search,
    );
    expect(verify.status).toBe(302);
    expect(verify.headers.get("location")).toBe("/t");
  });

  it("sends via Resend without printing a preview link", async () => {
    const app = createTestApp({
      demoLogin: true,
      mailerConfigured: true,
      mailerSent: true,
    });
    const asked = await app.request("/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana.costa@pinheiros.aula.test" }),
    });
    expect(asked.status).toBe(200);
    const payload = (await asked.json()) as {
      sent: boolean;
      previewUrl?: string;
    };
    expect(payload.sent).toBe(true);
    expect(payload.previewUrl).toBeUndefined();
  });

  it("prints the HTML magic link when Resend is set but send fails", async () => {
    const app = createTestApp({
      demoLogin: true,
      mailerConfigured: true,
      mailerSent: false,
      mailerReason: "403 domain not verified",
    });
    const asked = await app.request("/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: "rui.mendes@pinheiros.aula.test",
      }),
    });
    expect(asked.status).toBe(200);
    const html = await asked.text();
    expect(html).toContain("/auth/verify?t=");
    expect(html).toContain("403 domain not verified");
    expect(html).not.toContain("login.sent");
  });

  it("prints a demo link when Resend is set but send fails", async () => {
    const app = createTestApp({
      demoLogin: true,
      mailerConfigured: true,
      mailerSent: false,
      mailerReason: "403 domain not verified",
    });
    const asked = await app.request("/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana.costa@pinheiros.aula.test" }),
    });
    expect(asked.status).toBe(200);
    const payload = (await asked.json()) as {
      sent: boolean;
      previewUrl?: string;
      reason?: string;
    };
    expect(payload.sent).toBe(false);
    expect(payload.previewUrl).toContain("/auth/verify?t=");
    expect(payload.reason).toBe("403 domain not verified");
  });

  it("does not print a demo link when send fails and demo login is off", async () => {
    const app = createTestApp({
      demoLogin: false,
      mailerConfigured: true,
      mailerSent: false,
    });
    const asked = await app.request("/v1/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ana.costa@pinheiros.aula.test" }),
    });
    expect(asked.status).toBe(503);
    expect(await asked.json()).toEqual({ error: "unavailable" });
  });
});
