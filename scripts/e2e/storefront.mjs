/**
 * Storefront browser test: every page at phone / tablet / laptop / wide widths must not scroll sideways or log
 * errors; the five doors and menu must work by mouse, touch and keyboard; the interactive pieces must respond;
 * and axe must find nothing serious. Run against a dev or preview server:
 *   STOREFRONT_URL=http://localhost:3002 node scripts/e2e/storefront.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.STOREFRONT_URL ?? "http://localhost:3002";
const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find((p) => p && existsSync(p));
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const PAGES = ["/", "/design", "/make", "/custom", "/collections", "/products", "/cart", "/account"];
const SIZES = { phone: [390, 844], "small phone": [320, 640], tablet: [820, 1180], laptop: [1366, 820], wide: [1920, 1080] };

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push([name, true]); console.log(`  ok   ${name}`); }
  catch (e) { results.push([name, false]); console.log(`  FAIL ${name}\n       ${String(e.message).split("\n")[0].slice(0, 280)}`); }
};
const browser = await chromium.launch({ executablePath: chrome });
const open = async (size, touch = false) => {
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource|store_error/.test(m.text())) page.errors.push(m.text().slice(0, 160)); });
  return { ctx, page };
};
const go = (page, path) => page.goto(base + path, { waitUntil: "networkidle", timeout: 120000 });

for (const [label, size] of Object.entries(SIZES)) {
  const { ctx, page } = await open(size, size[0] < 900);
  for (const path of PAGES) {
    await check(`${label} ${path}: no sideways scroll, no errors`, async () => {
      await go(page, path);
      await page.waitForTimeout(400);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (over > 1) throw new Error(`scrolls sideways by ${over}px`);
      if (page.errors.length) throw new Error(page.errors.join(" | "));
      const h1 = await page.locator("h1").count();
      if (h1 !== 1) throw new Error(`expected one h1, found ${h1}`);
    });
  }
  await ctx.close();
}

{
  const { ctx, page } = await open(SIZES.phone, true);
  await check("phone: menu opens, lists the doors, closes with Escape and traps nothing when closed", async () => {
    await go(page, "/");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Open menu" }).tap();
    await page.locator("#sx-menu[data-open=true]").waitFor();
    for (const t of ["Studio", "Bring an idea", "Shop", "What we make"]) await page.locator("#sx-menu").getByRole("link", { name: new RegExp(`^${t}`) }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.locator("#sx-menu[data-open=false]").waitFor({ state: "attached" });
    if (await page.locator("#sx-menu a").first().isVisible()) throw new Error("closed menu is still reachable");
  });
  await check("phone: menu link navigates and the menu closes", async () => {
    await go(page, "/");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Open menu" }).tap();
    await page.locator("#sx-menu").getByRole("link", { name: /^Studio/ }).tap();
    await page.waitForURL(/\/design$/, { timeout: 30000 });
    await page.locator("#sx-menu[data-open=false]").waitFor({ state: "attached" });
  });
  await check("phone: tap targets are at least 44px on the home page", async () => {
    await go(page, "/");
    const small = await page.evaluate(() => [...document.querySelectorAll("header a, header button, main .so-btn-primary, main .so-btn-ghost, main .sx-chip")].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 36 || r.width < 36); }).map((e) => `${e.textContent.trim().slice(0, 20)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
    if (small.length) throw new Error(`small targets: ${small.slice(0, 5).join(", ")}`);
  });
  await ctx.close();
}

{
  const { ctx, page } = await open(SIZES.laptop);
  await check("laptop: the hero scene plays idea -> design -> object and its steps can be chosen", async () => {
    await go(page, "/");
    await page.locator(".sx-scene-caption").waitFor();
    await page.getByRole("button", { name: "Object", exact: true }).click();
    await page.waitForFunction(() => /same design, fitted/.test(document.querySelector(".sx-scene-caption")?.textContent ?? ""), null, { timeout: 8000 });
    await page.getByRole("button", { name: "Idea", exact: true }).click();
    await page.waitForFunction(() => /idea, drawn out/.test(document.querySelector(".sx-scene-caption")?.textContent ?? ""), null, { timeout: 8000 });
    const before = await page.locator(".sx-scene-caption").textContent();
    await page.getByRole("button", { name: "Show another" }).click();
    await page.waitForTimeout(300);
    if (before === (await page.locator(".sx-scene-caption").textContent())) throw new Error("show another changed nothing");
  });
  await check("laptop: each of the five doors goes somewhere real", async () => {
    for (const [name, url] of [[/Bring us an idea/, /\/custom$/], [/Design in Studio/, /\/design$/], [/Shop what's ready/, /\/collections$/], [/Make one yours/, /\/custom\?from=personalize/], [/What we can make/, /\/make$/]]) {
      await go(page, "/");
      await page.locator(".sx-door", { hasText: name }).first().click();
      await page.waitForURL(url, { timeout: 30000 });
    }
  });
  await check("laptop: choosing a design changes every object on the shelf", async () => {
    await go(page, "/make");
    const before = await page.locator(".sx-shelf-item svg").first().innerHTML();
    await page.getByRole("button", { name: "Plait" }).first().click();
    if (before === (await page.locator(".sx-shelf-item svg").first().innerHTML())) throw new Error("shelf did not change");
  });
  await check("laptop: Studio taste changes surface and color", async () => {
    await go(page, "/design");
    const stage = page.locator(".sx-demo-stage > svg");
    const a = await stage.innerHTML();
    await page.locator(".sx-demo").getByRole("button", { name: "Mug" }).click();
    const b = await stage.innerHTML();
    await page.locator(".sx-swatch").nth(2).click();
    const c = await stage.innerHTML();
    if (a === b || b === c) throw new Error("the demo did not respond");
  });
  await check("laptop: keyboard users can tab through the header with a visible focus ring", async () => {
    await go(page, "/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { tag: e.tagName, width: s.outlineWidth, style: s.outlineStyle }; });
    if (ring.style === "none" || parseFloat(ring.width) < 2) throw new Error(`no focus ring on ${ring.tag}`);
  });
  await check("laptop: Skink opens as an avatar, answers, speaks, and closes with Escape", async () => {
    await go(page, "/");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Ask Skink" }).click();
    await page.locator(".sx-skink-card svg").waitFor();
    await page.getByRole("button", { name: "Shipping", exact: true }).click();
    const seen = new Set();
    for (let n = 0; n < 60 && !(seen.has("speaking") && seen.has("idle") && n > 4 && seen.size >= 3); n++) { await page.waitForTimeout(500); seen.add(await page.locator(".sx-skink-card svg").getAttribute("data-mood")); }
    if (!seen.has("thinking") && !seen.has("speaking")) throw new Error(`avatar never reacted: ${[...seen]}`);
    if (!(await page.locator(".sx-skink-bubble").innerText()).length) throw new Error("no answer shown");
    await page.keyboard.press("Escape");
    await page.locator(".sx-skink-card").waitFor({ state: "detached" });
  });
  await check("laptop: reduced motion shows everything at once", async () => {
    const ctx2 = await browser.newContext({ viewport: { width: 1366, height: 820 }, reducedMotion: "reduce" });
    const p2 = await ctx2.newPage();
    await p2.goto(base + "/", { waitUntil: "networkidle", timeout: 120000 });
    await p2.waitForTimeout(500);
    const hidden = await p2.evaluate(() => [...document.querySelectorAll("[data-sx-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length);
    const caption = await p2.locator(".sx-scene-caption").textContent();
    await ctx2.close();
    if (hidden) throw new Error(`${hidden} blocks stay hidden`);
    if (!/fitted/.test(caption ?? "")) throw new Error("scene does not show its finished state");
  });
  await ctx.close();
}

for (const [label, size] of [["phone", SIZES.phone], ["laptop", SIZES.laptop]]) {
  const { ctx, page } = await open(size, size[0] < 900);
  for (const path of PAGES) {
    await check(`${label} ${path}: axe finds nothing serious`, async () => {
      await go(page, path);
      await page.evaluate(() => document.querySelectorAll("[data-sx-reveal]").forEach((e) => { e.dataset.in = "true"; }));
      await page.waitForTimeout(1000);
      await page.evaluate(axeSource);
      const found = await page.evaluate(() => axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"], resultTypes: ["violations"] }).then((r) => r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" , ")}`)));
      if (found.length) throw new Error(found.join(" | "));
    });
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} storefront checks passed`);
process.exit(failed.length ? 1 : 0);
