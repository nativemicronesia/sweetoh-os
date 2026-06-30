import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  sql?: Sql;
  db?: Db;
};

/**
 * App runtime should use Supabase transaction pooler (6543). Session pooler
 * (5432) is fine for migrations but caps at ~15 clients and exhausts under
 * Next.js dev HMR plus verify scripts.
 */
export function resolveAppDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (
      url.hostname.includes(".pooler.supabase.com") &&
      (url.port === "5432" || url.port === "")
    ) {
      url.port = "6543";
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getDb(): Db {
  if (!globalForDb.db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    const sql = postgres(resolveAppDatabaseUrl(connectionString), {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    globalForDb.sql = sql;
    globalForDb.db = drizzle(sql, { schema });
  }

  return globalForDb.db;
}
