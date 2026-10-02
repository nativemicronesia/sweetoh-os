import { requireCreator } from "@/lib/domains/identity/service";
import { buildCreatorExport } from "@/lib/domains/creator/data-export";
import { rateLimit, tooManyRequests } from "@/lib/shared/rate-limit";

export const dynamic = "force-dynamic";

/** "Download my data": the signed-in creator's own Studio data as a JSON file. */
export async function GET() {
  const session = await requireCreator();
  const rate = rateLimit(`my-data:${session.appUser.id}`, 4, 60 * 60_000);
  if (!rate.ok) return tooManyRequests(rate.retryAfterSeconds);
  const data = await buildCreatorExport(session);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sweetoh-studio-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
