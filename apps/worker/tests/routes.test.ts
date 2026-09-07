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
    expect(html).toContain("Garden");
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
    expect(plan.happening).toContain("Garden");
    expect(plan.bring).toContain("Hat");
    expect(plan.updates[0]?.body).toContain("road");
  });

  it("parent demo login can open group and privacy", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "guardian");
    const group = await app.request("/v1/group", { headers: { cookie } });
    expect(group.status).toBe(200);
    const body = (await group.json()) as {
      schoolName: string;
      children: { displayName: string }[];
    };
    expect(body.schoolName).toBe("Pinheiros");
    expect(body.children.map((child) => child.displayName)).toContain("Oak P.");
    const privacy = await app.request("/g/privacy", { headers: { cookie } });
    expect(privacy.status).toBe(200);
    expect(await privacy.text()).toContain("YOLO");
  });

  it("teacher is forbidden from parent privacy API", async () => {
    const app = createTestApp();
    const { cookie } = await loginAs(app, "teacher");
    const res = await app.request("/v1/privacy", { headers: { cookie } });
    expect(res.status).toBe(403);
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
});
