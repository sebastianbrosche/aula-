import { FOUNDATION_SQL, seedPinheiros } from "@aula/core";
import * as schema from "@aula/core/schema";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { createTestApp, loginAs } from "./harness.ts";

describe("worker stability", () => {
  it("can seed Pinheiros twice without throwing", async () => {
    const sqlite = new Database(":memory:");
    sqlite.exec(FOUNDATION_SQL);
    const db = drizzle(sqlite, { schema });
    await seedPinheiros(db, Date.now());
    await seedPinheiros(db, Date.now());
    const app = createTestApp();
    const { cookie } = await loginAs(app, "teacher");
    const tomorrow = await app.request("/v1/tomorrow", { headers: { cookie } });
    expect(tomorrow.status).toBe(200);
  });

  it("keeps login paths up under a concurrent teacher and parent walk", async () => {
    const app = createTestApp();
    const landing = await Promise.all(
      Array.from({ length: 12 }, () => app.request("/")),
    );
    for (const res of landing) {
      expect(res.status).toBeLessThan(500);
    }
    const teacher = await loginAs(app, "teacher");
    const parent = await loginAs(app, "guardian");
    expect(teacher.res.status).toBe(302);
    expect(parent.res.status).toBe(302);
    const walkOnce = () =>
      Promise.all([
        app.request("/"),
        app.request("/bugs"),
        app.request("/login/demo", {
          method: "POST",
          body: new URLSearchParams({ role: "teacher" }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
        app.request("/login/demo", {
          method: "POST",
          body: new URLSearchParams({ role: "guardian" }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
        app.request("/t", { headers: { cookie: teacher.cookie } }),
        app.request("/t/feed", { headers: { cookie: teacher.cookie } }),
        app.request("/t/group", { headers: { cookie: teacher.cookie } }),
        app.request("/t/tomorrow", { headers: { cookie: teacher.cookie } }),
        app.request("/g", { headers: { cookie: parent.cookie } }),
        app.request("/g/feed", { headers: { cookie: parent.cookie } }),
        app.request("/g/group", { headers: { cookie: parent.cookie } }),
        app.request("/g/tomorrow", { headers: { cookie: parent.cookie } }),
        app.request("/healthz"),
      ]);
    const rounds = await Promise.all(
      Array.from({ length: 6 }, () => walkOnce()),
    );
    for (const batch of rounds) {
      for (const res of batch) {
        expect(res.status).toBeLessThan(500);
      }
    }
    const teacherHome = await app.request("/t", {
      headers: { cookie: teacher.cookie },
    });
    expect(teacherHome.status).toBe(200);
    expect(await teacherHome.text()).toContain("jardim");
    const parentHome = await app.request("/g", {
      headers: { cookie: parent.cookie },
    });
    expect(parentHome.status).toBe(200);
    expect(await parentHome.text()).toContain("jardim");
  });
});
