import { afterEach, describe, expect, it, vi } from "vitest";
import { createMailer, DEFAULT_RESEND_FROM } from "../src/mailer.ts";

describe("createMailer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is not configured without an API key", async () => {
    const mailer = createMailer(undefined, undefined);
    expect(mailer.configured).toBe(false);
    expect(
      await mailer.sendMagicLink("a@b.c", "https://x/auth/verify?t=1"),
    ).toBe(false);
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
    ).toBe(true);
    expect(sentFrom).toBe("aula <login@example.com>");
  });

  it("uses the Resend test sender when RESEND_FROM is missing", async () => {
    let sentFrom = "";
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      sentFrom = JSON.parse(String(init?.body)).from;
      return new Response("{}", { status: 200 });
    });
    const mailer = createMailer("re_test", undefined);
    await mailer.sendMagicLink("a@b.c", "https://x/a");
    expect(sentFrom).toBe(DEFAULT_RESEND_FROM);
  });

  it("returns false when Resend rejects or fetch throws", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 403 }));
    expect(
      await createMailer("re_test", undefined).sendMagicLink(
        "a@b.c",
        "https://x",
      ),
    ).toBe(false);
    vi.stubGlobal("fetch", async () => {
      throw new Error("network");
    });
    expect(
      await createMailer("re_test", undefined).sendMagicLink(
        "a@b.c",
        "https://x",
      ),
    ).toBe(false);
  });
});
