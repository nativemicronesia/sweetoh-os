/**
 * Read-only check that the database has every table and column the code expects.
 * It reads table and column NAMES from information_schema, never any rows.
 *
 *   set -a; . ./.env.local; set +a
 *   npm run db:check
 *
 * Exits 1 and lists what is missing (usually a migration in drizzle/ that was
 * never applied; apply it with scripts/apply-sql-migration.ts).
 */
import { sql, is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";

async function main() {
  const rows = (await getDb().execute(sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`)) as unknown as { table_name: string; column_name: string }[];
  const have = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!have.has(row.table_name)) have.set(row.table_name, new Set());
    have.get(row.table_name)!.add(row.column_name);
  }
  const missing: string[] = [];
  let tables = 0;
  for (const value of Object.values(schema)) {
    if (!is(value, PgTable)) continue;
    const config = getTableConfig(value);
    tables++;
    const columns = have.get(config.name);
    if (!columns) { missing.push(`table ${config.name} (whole table)`); continue; }
    for (const column of config.columns) if (!columns.has(column.name)) missing.push(`column ${config.name}.${column.name}`);
  }
  if (missing.length) {
    console.error(`Schema is behind the code. Missing ${missing.length}:\n- ${missing.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Schema OK: ${tables} tables, every expected column present.`);
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
