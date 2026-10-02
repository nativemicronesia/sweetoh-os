import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status" };

async function databaseUp() {
  try {
    await Promise.race([getDb().execute(sql`select 1`), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))]);
    return true;
  } catch {
    return false;
  }
}

/** A plain public status page: is the app up, and can it reach its database. */
export default async function StatusPage() {
  const database = await databaseUp();
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);
  const rows: [string, boolean][] = [["Website and Studio", true], ["Accounts and saved work", database]];
  return (
    <main style={{ maxWidth: 560, margin: "64px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#173e39" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 6px" }}>{database ? "All systems operational" : "Some systems are having trouble"}</h1>
      <p style={{ margin: "0 0 24px", color: "#4f5f58" }}>Checked just now. Version {commit}.</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {rows.map(([name, ok]) => (
          <li key={name} style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", border: "1px solid #d9d4c6", borderRadius: 12, background: "#fff" }}>
            <span>{name}</span>
            <strong style={{ color: ok ? "#1f7048" : "#a8321f" }}>{ok ? "Operational" : "Down"}</strong>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 24, fontSize: 14, color: "#4f5f58" }}>If something is wrong and this page says everything is fine, contact us and include what you were doing.</p>
    </main>
  );
}
