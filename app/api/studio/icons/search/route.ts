import { ICON_PREFIXES, STICKER_PREFIXES } from "@/lib/studio/icon-sets";
import { searchIconIds } from "@/lib/studio/icon-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 60);
  const allowed = new Set([...ICON_PREFIXES, ...STICKER_PREFIXES]);
  const sets = (url.searchParams.get("sets") ?? "").split(",").filter((prefix) => allowed.has(prefix));
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit")) || 60));
  const start = Math.max(0, Number(url.searchParams.get("start")) || 0);
  if (!query.trim() || !sets.length) return Response.json({ icons: [] });
  const icons = await searchIconIds(query, sets, limit, start);
  return Response.json({ icons }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
