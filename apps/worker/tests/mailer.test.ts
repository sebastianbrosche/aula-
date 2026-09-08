import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMailer,
  DEFAULT_RESEND_FROM,
  safeResendReason,
} from "../src/mailer.ts";

describe("createMailer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults from to the verified Resend domain", () => {
    expect(DEFAULT_RESEND_FROM).toBe("aula <login@m1.heatlagos.com>");
  });

  it("is not configured without an API key", async () => {
    const mailer = createMailer(undefined, undefined);
    expect(mailer.configured).toBe(false);
    expect(
      await mailer.sendMagicLink("a@b.c", "https://x/auth/verify?t=1"),
    ).toEqual({ sent: false });
  });

  it("uses RESEND_FROM when set", async () => {
    let sentFrom = "";
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      sentFrom = JSON.parse(String(init?.body)).from;
      return new Response("{}", { status: 200 });
    });
    const mailer = createMailer("re_test", "aula <login@example.com>");
    expect(mailer.configured).toBe(true);
    expect(
      await mailer.sendMagicLink(
        "ana.costa@pinheiros.aula.test",
        "https://x/a",
      ),
    ).toEqual({ sent: true });
    expect(sentFrom).toBe("aula <login@example.com>");
  });

  it("uses the default from when RESEND_FROM is missing", async () => {
    let sentFrom = "";
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      sentFrom = JSON.parse(String(init?.body)).from;
      return new Response("{}", { status: 200 });
    });
    const mailer = createMailer("re_test", undefined);
    await mailer.sendMagicLink("a@b.c", "https://x/a");
    expect(sentFrom).toBe(DEFAULT_RESEND_FROM);
    expect(sentFrom).toBe("aula <login@m1.heatlagos.com>");
  });

  it("returns a short safe reason when Resend rejects or fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response('{"message":"domain not verified","key":"re_secret"}', {
          status: 403,
        }),
    );
    expect(
      await createMailer("re_test", undefined).sendMagicLink(
        "a@b.c",
        "https://x",
      ),
    ).toEqual({
      sent: false,
      reason: '403 {"message":"domain not verified","key":"[redacted]"}',
    });
    vi.stubGlobal("fetch", async () => {
      throw new Error("network");
    });
    expect(
      await createMailer("re_test", undefined).sendMagicLink(
        "a@b.c",
        "https://x",
      ),
    ).toEqual({ sent: false, reason: "network" });
  });

  it("truncates a long Resend body", () => {
    expect(safeResendReason(422, `${"x".repeat(200)}`)).toBe(
      `422 ${"x".repeat(160)}`,
    );
  });
});
