import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission, PERMISSIONS } from "../lib/domains/identity/permissions";
import { studioBase } from "../lib/domains/identity/service";
import { actionCreditsForKey, planFor, PLANS } from "../lib/domains/creator/plans";
import { activePlan } from "../lib/domains/creator/credits";
import { creditsForUsage, resolveModel, litellmAliases } from "../lib/ai/router";
import { decryptToken, encryptToken } from "../lib/integrations/printify/creator-shop";
import { memoryPromptBlock } from "../lib/domains/skink/memory";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
  }
}

test("creators get no partner back-office permissions", () => {
  for (const p of Object.values(PERMISSIONS)) assert.equal(hasPermission("creator", p), false, p);
  assert.equal(hasPermission("partner", PERMISSIONS.PARTNER_ACCESS), true);
});

test("the shared Studio sends creators and the partner to their own areas", () => {
  assert.equal(studioBase({ role: "creator" }).canvas, "/studio/design");
  assert.equal(studioBase({ role: "partner" }).canvas, "/partner/canvas");
  assert.ok(!Object.values(studioBase({ role: "creator" })).some((p) => p.startsWith("/partner")));
});

test("plans: free is light-only, paid tiers unlock smart and deep", () => {
  assert.deepEqual(PLANS.free.levels, ["light"]);
  assert.ok(PLANS.creator.levels.includes("smart") && !PLANS.creator.levels.includes("deep"));
  assert.ok(PLANS.pro.levels.includes("deep"));
  assert.equal(PLANS.creator.monthlyCents, 2400);
  assert.equal(PLANS.pro.monthlyCents, 7900);
  assert.ok(PLANS.creator.foundingYearlyCents < PLANS.creator.yearlyCents);
  assert.equal(planFor("nonsense").id, "free");
});

test("a lapsed subscription falls back to Free", () => {
  assert.equal(activePlan({ plan: "pro", planStatus: "active" }).id, "pro");
  assert.equal(activePlan({ plan: "pro", planStatus: "past_due" }).id, "pro");
  assert.equal(activePlan({ plan: "pro", planStatus: "canceled" }).id, "free");
  assert.equal(activePlan(null).id, "free");
});

test("Studio AI actions are priced per action", () => {
  assert.equal(actionCreditsForKey("art:hibiscus"), 5);
  assert.equal(actionCreditsForKey("pattern:waves:"), 5);
  assert.equal(actionCreditsForKey("edit:id:navy"), 5);
  assert.equal(actionCreditsForKey("blank-understand:abc"), 2);
  assert.equal(actionCreditsForKey("f".repeat(64)), 10);
});

test("chat credits follow real token cost (1 credit ≈ 1¢)", () => {
  const luna = { provider: "openai" as const, model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 };
  // 3,000 in + 500 out on Luna ≈ $0.0012 → ~0.12 credits.
  assert.ok(Math.abs(creditsForUsage(luna, { prompt_tokens: 3000, completion_tokens: 500 }) - 0.12) < 0.001);
  assert.equal(creditsForUsage(luna, { prompt_tokens: 1, completion_tokens: 1 }), 0.01);
});

test("jobs route to the right provider, and fall back to OpenAI without keys", () => {
  withEnv({ AI_BASE_URL: undefined, OPENAI_API_KEY: "sk-test-openai", ANTHROPIC_API_KEY: "sk-ant-test", GEMINI_API_KEY: "g-test" }, () => {
    assert.equal(resolveModel("chat", "light").model, "gpt-5.6-luna");
    assert.equal(resolveModel("reason", "smart").model, "claude-sonnet-5");
    assert.equal(resolveModel("reason", "deep").model, "claude-opus-5");
    assert.equal(resolveModel("research", "smart").model, "gemini-3.7-flash");
  });
  withEnv({ AI_BASE_URL: undefined, OPENAI_API_KEY: "sk-test-openai", ANTHROPIC_API_KEY: undefined, GEMINI_API_KEY: undefined, GOOGLE_GENERATIVE_AI_API_KEY: undefined }, () => {
    assert.equal(resolveModel("reason", "smart").model, "gpt-5.6-luna");
    assert.equal(resolveModel("research", "deep").model, "gpt-5.6-luna");
  });
  withEnv({ AI_BASE_URL: "http://localhost:4000/v1", LITELLM_API_KEY: "sk-proxy" }, () => {
    assert.equal(resolveModel("research", "smart").model, "sweetoh-research-smart");
  });
  assert.ok(litellmAliases().some((a) => a.alias === "sweetoh-reason-smart" && a.model === "anthropic/claude-sonnet-5"));
});

test("creator Printify tokens are encrypted at rest and tamper-evident", () => {
  withEnv({ CREATOR_SECRETS_KEY: "unit-test-key" }, () => {
    const sealed = encryptToken("printify-token-123");
    assert.ok(!sealed.includes("printify-token-123"));
    assert.equal(decryptToken(sealed), "printify-token-123");
    const parts = sealed.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    assert.throws(() => decryptToken(parts.join(":")));
  });
});

test("memory reaches Skink as a compact private block, not chat history", () => {
  const now = new Date();
  const block = memoryPromptBlock([
    { id: "m1", userId: "u", kind: "brand", title: "Brand name", body: "Isla Bloom", source: "skink", pinned: true, archivedAt: null, createdAt: now, updatedAt: now },
  ]);
  assert.match(block, /\[brand\].*Brand name: Isla Bloom/);
  assert.match(memoryPromptBlock([]), /don't know anything/);
});
