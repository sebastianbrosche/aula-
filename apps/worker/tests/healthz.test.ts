import { describe, expect, it } from "vitest";
import { createTestApp } from "./harness.ts";

describe("GET /healthz", () => {
  it("returns 200 and { ok: true } without auth", async () => {
    const app = createTestApp();
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
