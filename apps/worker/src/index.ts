import { createD1Db, foundationStatements } from "@aula/core";
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
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      applySql: async () => {
        for (const statement of foundationStatements()) {
          await env.DB.prepare(statement).run();
        }
      },
    });
    return app.fetch(request, env, ctx);
  },
};
