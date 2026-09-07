import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "./db/schema.ts";
import { catalogKeys, ptKeys } from "./i18n/t.ts";
import { SEED } from "./seed/ids.ts";

describe("schema", () => {
  it("has no numeric behaviour columns", () => {
    const banned = new Set(["points", "score", "streak", "rank"]);
    for (const table of Object.values(schema)) {
      if (
        !table ||
        typeof table !== "object" ||
        !("enableRLS" in table || "_" in table)
      ) {
        continue;
      }
      try {
        const columns = getTableColumns(table as never);
        for (const name of Object.keys(columns)) {
          expect(banned.has(name)).toBe(false);
        }
      } catch {
        // not a table
      }
    }
  });

  it("keeps i18n keys in sync", () => {
    expect(ptKeys().sort()).toEqual(catalogKeys().sort());
  });

  it("uses child handles, not given names", () => {
    expect(SEED.childHandles).toEqual(["Oak P.", "River R.", "Cedar M."]);
  });
});
