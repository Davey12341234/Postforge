import "@/lib/postgres-env-sync";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let singleton: AppDatabase | undefined;

/**
 * Drizzle instance — call only when `POSTGRES_URL` or `DATABASE_URL` is set (Postgres persistence).
 * Uses `postgres` + `postgres-js` so Neon direct URLs work; `@vercel/postgres` rejects non-pooled hosts.
 */
export function getDb(): AppDatabase {
  if (!singleton) {
    const url =
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim();
    if (!url) {
      throw new Error(
        "Database URL missing: set POSTGRES_URL or DATABASE_URL for Postgres persistence.",
      );
    }
    const client = postgres(url, { max: 10 });
    singleton = drizzle(client, { schema });
  }
  return singleton;
}

export { schema };
