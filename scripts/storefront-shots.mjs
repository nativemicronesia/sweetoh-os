/** Screenshots storefront pages at phone / tablet / laptop widths. STOREFRONT_URL defaults to local dev. */
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
const out = process.env.SHOTS ?? "/tmp/storefront";
mkdirSync(out, { recursive: true });
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => p && existsSync(p));
const devices = { phone: [390, 844], tablet: [820, 1180], laptop: [1366, 820] };
const pages = (process.env.PAGES ?? "/").split(",");
const only = process.env.DEVICES?.split(",");
const full = process.env.FULL !== "0";
const browser = await chromium.launch({ executablePath: chrome });
for (const [name, [width, height]] of Object.entries(devices)) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: name !== "laptop" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
    if (full) { for (let y = 0; y < 12000; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(60); } await page.evaluate(() => window.scrollTo(0, 0)); }
    await page.waitForTimeout(1500);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const file = `${out}/${name}${p.replace(/[^a-z0-9]+/gi, "-")}.png`;
    await page.screenshot({ path: file, fullPage: full });
    console.log(name, p, over > 1 ? `SIDEWAYS SCROLL +${over}px` : "ok", file);
  }
  if (errors.length) console.log("  errors:", [...new Set(errors)].slice(0, 4).join(" | "));
  await ctx.close();
}
await browser.close();
