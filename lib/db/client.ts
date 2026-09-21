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

    // A handful of connections per instance: one made "parallel" queries queue
    // behind each other (and time out under load). The transaction pooler is
    // built for this, and each serverless instance keeps its own small pool.
    const sql = postgres(resolveAppDatabaseUrl(connectionString), {
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
      idle_timeout: 20,
      connect_timeout: 15,
      max_lifetime: 60 * 30,
    });

    globalForDb.sql = sql;
    globalForDb.db = drizzle(sql, { schema });
  }

  return globalForDb.db;
}
