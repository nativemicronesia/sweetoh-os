import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Every server action is a public endpoint. This test makes that visible: an action must
 * either check who is calling, or be on this short list of intentionally public ones, and
 * each public one (except signing out) must be rate limited.
 */
const PUBLIC: Record<string, boolean> = {
  // name -> must be rate limited
  joinWaitlistAction: true,
  joinAction: true,
  studioSignOutAction: false,
  signUpOwnerAction: true,
  forgotPasswordAction: true,
  resetPasswordAction: true,
  customerSignUpAction: true,
  customerSignInAction: true,
  customerSignOutAction: false,
  submitCustomRequestAction: true,
  // Guest checkout is public by design.
  createCheckoutSessionAction: true,
  // These check credentials themselves.
  signInAction: true,
  verifyOwnerAction: true,
  studioSignInAction: true,
  signOutAction: false,
};
const AUTH = /require[A-Z]\w*\(|getSessionUser\(|getCurrentCustomer\(/;

function actions() {
  const files = execSync(`git ls-files 'app/**/*.ts' 'app/**/*.tsx'`, { encoding: "utf8" }).split("\n").filter(Boolean)
    .filter((f) => /^"use server"/.test(readFileSync(f, "utf8")));
  const out: { file: string; name: string; body: string }[] = [];
  for (const file of files) {
    const parts = readFileSync(file, "utf8").split(/^export async function /m).slice(1);
    for (const part of parts) out.push({ file, name: part.slice(0, part.indexOf("(")), body: part.split(/^export /m)[0] });
  }
  return out;
}

test("every server action checks the caller, or is a known public action", () => {
  const all = actions();
  assert.ok(all.length > 80, `found ${all.length} actions`);
  const unchecked = all.filter((a) => !AUTH.test(a.body) && !(a.name in PUBLIC)).map((a) => `${a.file}: ${a.name}`);
  assert.deepEqual(unchecked, [], "these actions have no auth check and are not on the public list");
});

test("public actions that send email or accept passwords are rate limited", () => {
  const all = actions();
  for (const [name, limited] of Object.entries(PUBLIC)) {
    const action = all.find((a) => a.name === name);
    assert.ok(action, `${name} is on the public list but no longer exists; remove it from the list`);
    if (limited) assert.match(action.body, /actionBlocked\(/, `${name} must be rate limited`);
  }
});

test("there is no password sign-in endpoint for the owner (the owner uses an emailed link)", () => {
  assert.equal(actions().some((a) => a.name === "signInOwnerAction"), false);
});

test("the data export is the caller's own, rate limited, and never includes secrets", () => {
  const route = readFileSync("app/api/studio/my-data/route.ts", "utf8");
  assert.match(route, /requireCreator\(\)/);
  assert.match(route, /rateLimit\(/);
  assert.match(route, /private, no-store/);
  const builder = readFileSync("lib/domains/creator/data-export.ts", "utf8");
  assert.doesNotMatch(builder, /stripeCustomerId|stripeSubscriptionId|printifyShopId/, "payment and shop identifiers stay out");
  const tokenUses = builder.match(/printifyTokenEnc/g) ?? [];
  assert.equal(tokenUses.length, 1, "the encrypted token is only used to say whether one exists");
  assert.match(builder, /Boolean\(profile\.printifyTokenEnc\)/);
  // Every query is scoped to the signed-in person.
  assert.match(builder, /eq\(creatorMemory\.userId, userId\)/);
  assert.match(builder, /eq\(skinkThread\.userId, userId\)/);
  assert.match(builder, /eq\(creditLedger\.userId, userId\)/);
  assert.match(builder, /eq\(asset\.uploadedById, userId\)/);
  assert.match(builder, /eq\(asset\.ventureId, session\.ventureId\)/);
});
