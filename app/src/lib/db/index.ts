import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requireEnv } from "../env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { koodipajaDb?: Db; koodipajaSql?: postgres.Sql };

export function getDb(): Db {
  if (!globalForDb.koodipajaDb) {
    const sql = postgres(requireEnv("DATABASE_URL"), { max: 10 });
    globalForDb.koodipajaSql = sql;
    globalForDb.koodipajaDb = drizzle(sql, { schema });
  }
  return globalForDb.koodipajaDb;
}

export async function closeDb(): Promise<void> {
  await globalForDb.koodipajaSql?.end();
  globalForDb.koodipajaDb = undefined;
  globalForDb.koodipajaSql = undefined;
}

export { schema };
