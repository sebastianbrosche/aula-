import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export type Db =
  | DrizzleD1Database<typeof schema>
  | BetterSQLite3Database<typeof schema>;

export function createD1Db(
  binding: D1Database,
): DrizzleD1Database<typeof schema> {
  return drizzleD1(binding, { schema });
}

export { schema };
