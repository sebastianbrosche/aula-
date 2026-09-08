import { FOUNDATION_SQL, type GoogleFetch } from "@aula/core";
import * as schema from "@aula/core/schema";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createApp } from "../src/app.tsx";

export function createTestApp(options?: {
  demoLogin?: boolean;
  mailerSent?: boolean;
  mailerReason?: string;
  mailerConfigured?: boolean;
  google?: { clientId?: string; clientSecret?: string };
  googleFetch?: GoogleFetch;
  sha?: string;
  mediaPuts?: { key: string; type: string }[];
  mediaFail?: boolean;
}) {
  const sqlite = new Database(":memory:");
  sqlite.exec(FOUNDATION_SQL);
  const db = drizzle(sqlite, { schema });
  const blobs = new Map<string, { data: ArrayBuffer; type: string }>();
  const useMedia = Boolean(options?.mediaPuts) || Boolean(options?.mediaFail);
  return createApp({
    db,
    demoLogin: options?.demoLogin ?? true,
    mailer: {
      configured: options?.mailerConfigured ?? false,
      sendMagicLink: async () => ({
        sent: options?.mailerSent ?? false,
        ...(options?.mailerReason ? { reason: options.mailerReason } : {}),
      }),
    },
    ...(options?.google ? { google: options.google } : {}),
    ...(options?.googleFetch ? { googleFetch: options.googleFetch } : {}),
    ...(options?.sha ? { sha: options.sha } : {}),
    ...(useMedia
      ? {
          media: {
            put: async (
              key: string,
              data: ArrayBuffer,
              contentType: string,
            ) => {
              if (options?.mediaFail) {
                throw new Error("r2 down");
              }
              blobs.set(key, { data, type: contentType });
              options?.mediaPuts?.push({ key, type: contentType });
            },
            get: async (key: string) => {
              const row = blobs.get(key);
              if (!row) {
                return null;
              }
              return { data: row.data, contentType: row.type };
            },
          },
        }
      : {}),
  });
}

export function mockGoogleFetch(email: string): GoogleFetch {
  return async (input) => {
    if (String(input).includes("/token")) {
      return new Response(JSON.stringify({ access_token: "tok" }));
    }
    return new Response(JSON.stringify({ email }));
  };
}

export async function loginAs(
  app: ReturnType<typeof createTestApp>,
  role: "teacher" | "guardian",
) {
  const res = await app.request("/login/demo", {
    method: "POST",
    body: new URLSearchParams({ role }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const cookie = res.headers.get("set-cookie") ?? "";
  const token = /aula_s=([^;]+)/.exec(cookie)?.[1];
  return {
    res,
    cookie: token ? `aula_s=${token}` : "",
  };
}
