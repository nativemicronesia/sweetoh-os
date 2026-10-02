import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * For uptime monitors. `/api/health` answers instantly (the app is up);
 * `/api/health?deep=1` also checks the database responds. No data is returned.
 */
export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const body: { ok: boolean; commit: string; database?: "ok" | "down" } = { ok: true, commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7) };
  if (deep) {
    try {
      await Promise.race([getDb().execute(sql`select 1`), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))]);
      body.database = "ok";
    } catch {
      body.database = "down";
      body.ok = false;
    }
  }
  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
