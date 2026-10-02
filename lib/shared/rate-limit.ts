/**
 * A small sliding-window rate limiter for public endpoints.
 *
 * It lives in the memory of one server instance, so it is a cheap first line of
 * defence against a runaway client or a simple scrape, not a hard global limit:
 * each instance counts for itself. For a hard limit across all instances, add a
 * Vercel Firewall rate-limit rule for the same paths.
 */
type Window = { hits: number[] };
const windows = new Map<string, Window>();
const MAX_KEYS = 20_000;

export type RateResult = { ok: true; remaining: number } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateResult {
  let entry = windows.get(key);
  if (!entry) {
    if (windows.size >= MAX_KEYS) {
      // Drop the oldest quarter instead of growing without bound.
      let drop = Math.floor(MAX_KEYS / 4);
      for (const k of windows.keys()) { windows.delete(k); if (--drop <= 0) break; }
    }
    entry = { hits: [] };
    windows.set(key, entry);
  }
  const floor = now - windowMs;
  while (entry.hits.length && entry.hits[0] <= floor) entry.hits.shift();
  if (entry.hits.length >= limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.hits[0] + windowMs - now) / 1000)) };
  entry.hits.push(now);
  return { ok: true, remaining: limit - entry.hits.length };
}

/** The caller's address as the platform reports it. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json({ error: "Too many requests. Please slow down a little." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } });
}

export function _resetRateLimits() { windows.clear(); }
