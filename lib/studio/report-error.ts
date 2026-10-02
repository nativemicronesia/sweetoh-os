/** Sends a Studio browser error to /api/client-errors (at most a few per page load, never blocking). */
let sent = 0;
const seen = new Set<string>();

export function reportClientError(error: unknown, where: string) {
  if (typeof window === "undefined" || sent >= 5) return;
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  const key = `${where}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  const body = JSON.stringify({ message, stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined, where, build: process.env.NEXT_PUBLIC_BUILD_ID });
  try {
    if (!navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "application/json" }))) void fetch("/api/client-errors", { method: "POST", body, keepalive: true });
  } catch { /* reporting must never break the app */ }
}
