import { FOUNDATION_SQL } from "@aula/core";
import * as schema from "@aula/core/schema";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { createApp } from "../src/app.tsx";

export function createTestApp(options?: {
  demoLogin?: boolean;
  mailerSent?: boolean;
}) {
  const sqlite = new Database(":memory:");
  sqlite.exec(FOUNDATION_SQL);
  const db = drizzle(sqlite, { schema });
  return createApp({
    db,
    demoLogin: options?.demoLogin ?? true,
    mailer: {
      sendMagicLink: async () => options?.mailerSent ?? false,
    },
  });
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
