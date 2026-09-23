/**
 * Apply one hand-written migration file from drizzle/ to the database in
 * DATABASE_URL. Statements are split on drizzle's "--> statement-breakpoint"
 * marker; every migration here is written with IF NOT EXISTS, so re-running is safe.
 *
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/apply-sql-migration.ts drizzle/0023_customer_accounts_custom_requests.sql
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass a migration file, e.g. drizzle/0023_customer_accounts_custom_requests.sql");
  const statements = readFileSync(file, "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await getDb().execute(sql.raw(statement));
  }
  console.log(`Applied ${statements.length} statements from ${file}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
