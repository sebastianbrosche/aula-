import {
  BUG_REPORT_ALTERS,
  createD1Db,
  EXTRA_TABLE_SQL,
  foundationStatements,
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
