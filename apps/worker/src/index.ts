import {
  BUG_REPORT_ALTERS,
  BUG_STATUS_ALTERS,
  createD1Db,
  EXTRA_TABLE_SQL,
  foundationStatements,
  POST_MEDIA_ALTERS,
} from "@aula/core";
import { createApp } from "./app.tsx";
import { BUILD_SHA } from "./build-sha.ts";
import { createMailer } from "./mailer.ts";
import { resolveSha } from "./sha.ts";

type Cached = {
  db: D1Database;
  fetch: (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ) => Response | Promise<Response>;
};

let cached: Cached | undefined;

async function applySchema(db: D1Database) {
  try {
    await db.prepare("SELECT id FROM schools LIMIT 1").first();
  } catch {
    for (const statement of foundationStatements()) {
      await db.prepare(statement).run();
    }
  }
  for (const statement of BUG_REPORT_ALTERS) {
    try {
      await db.prepare(statement).run();
    } catch {
      // Column already exists on this D1.
    }
  }
  for (const statement of EXTRA_TABLE_SQL) {
    await db.prepare(statement).run();
  }
  for (const statement of POST_MEDIA_ALTERS) {
    try {
      await db.prepare(statement).run();
    } catch {
      // Column already exists on this D1.
    }
  }
  for (const statement of BUG_STATUS_ALTERS) {
    try {
      await db.prepare(statement).run();
    } catch {
      // Column already exists on this D1.
    }
  }
}

function appFor(env: Env): Cached {
  if (cached && cached.db === env.DB) {
    return cached;
  }
  const db = createD1Db(env.DB);
  const app = createApp({
    db,
    mailer: createMailer(env.RESEND_API_KEY, env.RESEND_FROM),
    demoLogin: env.DEMO_LOGIN === "1",
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    applySql: async () => {
      await applySchema(env.DB);
    },
    sha: resolveSha(env.GIT_SHA, env.WORKERS_CI_COMMIT_SHA, BUILD_SHA),
    ...(env.MEDIA
      ? {
          media: {
            put: async (
              key: string,
              data: ArrayBuffer,
              contentType: string,
            ) => {
              await env.MEDIA.put(key, data, {
                httpMetadata: { contentType },
              });
            },
            get: async (key: string) => {
              const obj = await env.MEDIA.get(key);
              if (!obj) {
                return null;
              }
              return {
                data: await obj.arrayBuffer(),
                contentType:
                  obj.httpMetadata?.contentType || "application/octet-stream",
              };
            },
          },
        }
      : {}),
  });
  cached = {
    db: env.DB,
    fetch: (request, nextEnv, ctx) => app.fetch(request, nextEnv, ctx),
  };
  return cached;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      return await Promise.resolve(appFor(env).fetch(request, env, ctx));
    } catch {
      const path = new URL(request.url).pathname;
      if (path === "/healthz") {
        return Response.json({
          ok: true,
          sha: resolveSha(env.GIT_SHA, env.WORKERS_CI_COMMIT_SHA, BUILD_SHA),
        });
      }
      return new Response("aula is warming up. Try again.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};
