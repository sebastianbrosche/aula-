import { createD1Db } from "@aula/core";
import { createApp } from "./app.tsx";
import { createMailer } from "./mailer.ts";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const app = createApp({
      db: createD1Db(env.DB),
      mailer: createMailer(
        env.RESEND_API_KEY,
        env.RESEND_FROM ?? "aula <login@aula.local>",
      ),
      demoLogin: env.DEMO_LOGIN === "1",
      applySql: async (sql) => {
        await env.DB.exec(sql);
      },
    });
    return app.fetch(request, env, ctx);
  },
};
