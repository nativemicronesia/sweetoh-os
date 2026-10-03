/**
 * A signed-in walk through the partner's real first-time journey, in a real browser:
 * sign in, look around, make a design (text, effect, sticker, mockup), save it, reopen it.
 * It writes ONE small test design with a unique name and removes it from My files at the end.
 *
 *   PARTNER_JOURNEY_URL=https://www.sweetohcreations.shop node scripts/partner-journey.mjs
 *
 * Credentials come from FOUNDATION_PARTNER_EMAIL / FOUNDATION_PARTNER_PASSWORD in .env.local.
 * Run it only with the owner's permission: it writes to the account it signs in to.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });
const base = process.env.PARTNER_JOURNEY_URL ?? "https://www.sweetohcreations.shop";
const email = process.env.FOUNDATION_PARTNER_EMAIL;
const password = process.env.FOUNDATION_PARTNER_PASSWORD;
if (!email || !password) throw new Error("Set FOUNDATION_PARTNER_EMAIL and FOUNDATION_PARTNER_PASSWORD in .env.local.");
const shots = process.env.PARTNER_JOURNEY_SHOTS ?? "/tmp/partner-journey";
mkdirSync(shots, { recursive: true });

const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => p && existsSync(p));
const stamp = Date.now();
const designName = `zz-journey-${stamp}`;
const headline = `Mama Bear ${String(stamp).slice(-4)}`;

const results = [];
const problems = [];
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/i.test(m.text())) problems.push(`console: ${m.text().slice(0, 160)}`); });
page.on("pageerror", (e) => problems.push(`exception: ${e.message.slice(0, 160)}`));
page.on("response", (r) => { if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });

const only = process.env.PARTNER_JOURNEY_ONLY;
async function step(name, run) {
  if (only && !name.includes(only) && !name.startsWith("sign in")) return;
  const before = problems.length;
  try {
    await run();
    const fresh = problems.slice(before);
    if (fresh.length) throw new Error(`browser problems: ${fresh.slice(0, 3).join(" | ")}`);
    results.push([name, true]);
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push([name, false]);
    console.log(`  FAIL ${name}\n       ${String(error.message).split("\n")[0].slice(0, 300)}`);
    await page.screenshot({ path: path.join(shots, `fail-${results.length}.png`) }).catch(() => {});
  }
}
const editorReady = () => page.locator(".pe-canvas canvas").first().waitFor({ state: "visible", timeout: 60_000 });
const rail = (label) => page.locator(".pe-rail button", { hasText: label }).first();

console.log(`Partner journey against ${base}`);

await step("sign in with email and password", async () => {
  await page.goto(`${base}/partner/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/partner", { timeout: 60_000 });
});

for (const [name, url, heading] of [
  ["back office home", "/partner", null],
  ["Studio home lists designs and ways to start", "/partner/studio", "Studio"],
  ["catalog", "/partner/catalog", null],
  ["My files", "/partner/library", "My files"],
  ["collage page", "/partner/studio/collage", "Make a collage"],
]) {
  await step(`page loads: ${name}`, async () => {
    const res = await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" });
    if (!res || res.status() >= 400) throw new Error(`status ${res?.status()}`);
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
    if (heading) await page.getByRole("heading", { name: heading, exact: true }).first().waitFor({ state: "visible", timeout: 15_000 });
  });
}

await step("start a portrait design from Studio home", async () => {
  await page.goto(`${base}/partner/studio`, { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Portrait artwork/ }).first().click();
  await page.waitForURL(/\/partner\/canvas\?new=portrait/, { timeout: 30_000 });
  await editorReady();
});

await step("add a heading and type her own words", async () => {
  await rail("Text").click();
  await page.getByRole("button", { name: "Add a heading" }).click();
  const box = page.locator("textarea.pe-textarea").first();
  await box.waitFor({ state: "visible", timeout: 15_000 });
  await box.fill(headline);
  if ((await box.inputValue()) !== headline) throw new Error("the words did not change");
});

await step("give the words a style (Block 3D effect)", async () => {
  await page.locator(".pe-seg button", { hasText: "Effects" }).first().click();
  await page.locator('.fxg-card[aria-label^="Block · Coral"]').click();
  await page.locator(".fx-controls", { hasText: "Block 3D" }).first().waitFor({ state: "visible", timeout: 15_000 });
});

await step("search for a sticker and add it", async () => {
  await rail("Elements").click();
  await page.locator(".el-search input").fill("bear");
  await page.locator('section[aria-label^="Stickers for"] button.el-add').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('section[aria-label^="Stickers for"] button.el-add').first().click();
  await page.locator(".pe-props-head h2", { hasText: "Icon" }).waitFor({ state: "visible", timeout: 20_000 });
});

await step("see it on a mug in Quick mockups", async () => {
  await rail("Mockups").click();
  await page.locator(".mk .pe-seg button", { hasText: "Mug" }).click();
  const download = page.locator(".mk").getByRole("button", { name: "Download", exact: true });
  await download.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => { const b = [...document.querySelectorAll(".mk button")].find((x) => x.textContent.trim().endsWith("Download")); return b && !b.disabled; }, null, { timeout: 30_000 });
  const painted = await page.evaluate(() => { const c = document.querySelector(".mk-canvas"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (d.length / 4); });
  if (!(painted > 0.5)) throw new Error("the mockup looks empty");
});

await step("name the design and save it", async () => {
  await page.getByLabel("Design name").fill(designName);
  await page.getByRole("button", { name: "Save design" }).click();
  await page.locator(".pe-title span", { hasText: /Saved/ }).waitFor({ state: "visible", timeout: 90_000 });
  if (await page.locator(".pe-error, [role=alert]").filter({ hasText: /couldn|error|failed/i }).count()) throw new Error("an error banner appeared after saving");
  await page.waitForURL(/\/partner\/canvas\?composition=/, { timeout: 15_000 });
});

await step("the saved design shows up on Studio home and reopens with its work", async () => {
  await page.goto(`${base}/partner/studio`, { waitUntil: "domcontentloaded" });
  const open = page.getByRole("link", { name: `Open ${designName}` });
  await open.waitFor({ state: "visible", timeout: 30_000 });
  await open.click();
  await page.waitForURL(/composition=/, { timeout: 30_000 });
  await editorReady();
  await rail("Layers").click();
  await page.locator(".pe-layer-row", { hasText: headline }).first().waitFor({ state: "visible", timeout: 30_000 });
  const rows = await page.locator(".pe-layer-row").count();
  if (rows < 2) throw new Error(`expected the text and the sticker, found ${rows} layer(s)`);
});

await step("duplicating a design opens a copy", async () => {
  await page.goto(`${base}/partner/studio`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(`More for ${designName}`).click();
  await page.locator(".sh-menu a", { hasText: "Duplicate" }).first().click();
  await page.waitForURL(/template=/, { timeout: 30_000 });
  await editorReady();
});

// Cleanup: remove every test file this run created (and any left by earlier runs of the old smoke test).
await step("clean up: hide every test design from My files", async () => {
  await page.goto(`${base}/partner/library`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  for (let round = 0; round < 6; round++) {
    const card = page.locator("li", { has: page.getByText(/zz-journey-\d+|studio-image-smoke-/) }).first();
    if (!(await card.count())) break;
    await card.getByRole("button", { name: "Hide file", exact: true }).click();
    await page.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000 });
    await page.goto(`${base}/partner/library`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  }
  const left = await page.getByText(/zz-journey-\d+/).count();
  if (left) throw new Error(`${left} test file(s) still listed`);
});

await browser.close();
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} steps passed${failed.length ? "" : ""}`);
if (problems.length) console.log(`browser problems seen (${problems.length}): ${[...new Set(problems)].slice(0, 5).join(" | ")}`);
console.log(`test design name: ${designName} (removed in the last step)`);
process.exit(failed.length ? 1 : 0);
