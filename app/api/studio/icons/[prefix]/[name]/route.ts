import { iconSvg } from "@/lib/studio/icon-server";
import { clientKey, rateLimit, tooManyRequests } from "@/lib/shared/rate-limit";

export async function GET(request: Request, context: { params: Promise<{ prefix: string; name: string }> }) {
  const { prefix, name } = await context.params;
  const rate = rateLimit(`icons-svg:${clientKey(request)}`, 1500, 60_000);
  if (!rate.ok) return tooManyRequests(rate.retryAfterSeconds);
  const url = new URL(request.url);
  const size = Math.min(1024, Math.max(16, Number(url.searchParams.get("size")) || 512));
  const color = url.searchParams.get("color");
  const svg = await iconSvg(prefix, name, size, color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined);
  if (!svg) return new Response("Icon not found", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
