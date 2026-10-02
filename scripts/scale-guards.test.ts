import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { _resetRateLimits, clientKey, rateLimit } from "../lib/shared/rate-limit";

test("the rate limiter allows a budget, then blocks, then recovers", () => {
  _resetRateLimits();
  for (let i = 0; i < 5; i++) assert.equal(rateLimit("a", 5, 1000, 1000 + i).ok, true);
  const blocked = rateLimit("a", 5, 1000, 1010);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSeconds >= 1);
  assert.equal(rateLimit("b", 5, 1000, 1010).ok, true, "other callers are unaffected");
  assert.equal(rateLimit("a", 5, 1000, 2500).ok, true, "recovers after the window");
});

test("the limiter does not grow without bound", () => {
  _resetRateLimits();
  for (let i = 0; i < 25_000; i++) rateLimit(`k${i}`, 1, 60_000, 5);
  assert.equal(rateLimit("fresh", 1, 60_000, 6).ok, true);
});

test("callers are identified by the forwarded address", () => {
  assert.equal(clientKey(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } })), "1.2.3.4");
  assert.equal(clientKey(new Request("http://x", { headers: { "x-real-ip": "5.6.7.8" } })), "5.6.7.8");
  assert.equal(clientKey(new Request("http://x")), "unknown");
});

test("public heavy routes are rate limited and skip the auth middleware", () => {
  for (const file of ["app/api/studio/icons/search/route.ts", "app/api/studio/icons/[prefix]/[name]/route.ts", "app/api/client-errors/route.ts"]) {
    assert.match(readFileSync(file, "utf8"), /rateLimit\(/, file);
  }
  const middleware = readFileSync("middleware.ts", "utf8");
  for (const route of ["api/studio/icons", "api/health", "api/client-errors"]) assert.ok(middleware.includes(route), `${route} must skip the auth middleware`);
});

test("client error reports are bounded and structured", async () => {
  const { POST } = await import("../app/api/client-errors/route");
  _resetRateLimits();
  const post = (body: string) => POST(new Request("http://x/api/client-errors", { method: "POST", body, headers: { "x-forwarded-for": "9.9.9.9" } }));
  assert.equal((await post(JSON.stringify({ message: "boom", where: "editor:error" }))).status, 204);
  assert.equal((await post("not json")).status, 400);
  assert.equal((await post(JSON.stringify({ message: "x".repeat(600), where: "w" }))).status, 400);
  assert.equal((await post("x".repeat(7000))).status, 413);
});

test("pages that show a few recent designs do not sign a thumbnail for every design", () => {
  const library = readFileSync("app/(partner)/partner/actions/library.ts", "utf8");
  assert.match(library, /countPartnerCompositions\(session\.ventureId\)/, "the plan limit is a SQL count");
  assert.doesNotMatch(library, /listPartnerLibraryDesigns/, "saving must not list and sign every design");
  assert.match(readFileSync("app/(creator)/studio/page.tsx", "utf8"), /listPartnerLibraryDesigns\(session\.ventureId, \{ limit: \d+ \}\)/);
  assert.match(readFileSync("lib/domains/skink/agent.ts", "utf8"), /listPartnerLibraryDesigns\(ctx\.session\.ventureId, \{ limit: \d+ \}\)/);
  assert.match(readFileSync("lib/domains/catalog/partner-design-library.ts", "utf8"), /options\.limit \? usable\.slice\(0, options\.limit\)/);
});
