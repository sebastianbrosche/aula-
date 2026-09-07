import { FOUNDATION_SQL, seedPinheiros } from "@aula/core";
import * as schema from "@aula/core/schema";
import { createApp } from "@aula/worker/app";
import { serve } from "@hono/node-server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("aula.sqlite");
sqlite.exec(FOUNDATION_SQL);
const db = drizzle(sqlite, { schema });
await seedPinheiros(db, Date.now());

const app = createApp({
  db,
  demoLogin: true,
  mailer: { sendMagicLink: async () => false },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  sha: process.env.GIT_SHA,
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`aula http://127.0.0.1:${port}`);
