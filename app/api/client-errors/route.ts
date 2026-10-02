import { z } from "zod";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/shared/rate-limit";

const report = z.object({
  message: z.string().max(500),
  stack: z.string().max(2000).optional(),
  where: z.string().max(120),
  build: z.string().max(20).optional(),
});

/**
 * Browser errors from the Studio land here and are written to the server log as
 * one structured line, so they show up in Vercel logs and can be alerted on.
 * Nothing identifying is collected: no account, no design content.
 */
export async function POST(request: Request) {
  const rate = rateLimit(`client-errors:${clientKey(request)}`, 20, 60_000);
  if (!rate.ok) return tooManyRequests(rate.retryAfterSeconds);
  const text = await request.text();
  if (text.length > 6000) return new Response(null, { status: 413 });
  let parsed;
  try { parsed = report.safeParse(JSON.parse(text)); } catch { return new Response(null, { status: 400 }); }
  if (!parsed.success) return new Response(null, { status: 400 });
  console.error("studio_client_error", JSON.stringify(parsed.data));
  return new Response(null, { status: 204 });
}
