import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createConnection, createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const sharp = require("sharp");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

// 3042 is the stable local port used by the pre-authorized partner browser path.
const port = Number(process.env.PARTNER_BROWSER_PORT ?? 3042);
// Match Next's advertised dev origin so webpack HMR and client resources stay same-origin.
const origin = `http://localhost:${port}`;
const email = process.env.FOUNDATION_PARTNER_EMAIL;
const password = process.env.FOUNDATION_PARTNER_PASSWORD;
if (!email || !password) {
  throw new Error("Set FOUNDATION_PARTNER_EMAIL and FOUNDATION_PARTNER_PASSWORD in .env.local before running this smoke check.");
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found) return found;
  const command = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(command, [process.platform === "win32" ? "chrome.exe" : "google-chrome"], { encoding: "utf8" });
  const executable = result.stdout?.trim().split(/\r?\n/)[0];
  if (executable && existsSync(executable)) return executable;
  throw new Error("Google Chrome or Chromium was not found. Set CHROME_BIN to its executable path.");
}

function mockedGoogleFontResponses() {
  // Next.js includes this hook specifically to keep tests from depending on Google Fonts availability.
  const { getFontAxes } = require(path.join(root, "node_modules/next/dist/compiled/@next/font/dist/google/get-font-axes.js"));
  const { getGoogleFontsUrl } = require(path.join(root, "node_modules/next/dist/compiled/@next/font/dist/google/get-google-fonts-url.js"));
  const fonts = [
    { name: "Outfit", weights: ["variable"], axes: undefined },
    { name: "Fraunces", weights: ["variable"], axes: ["SOFT", "opsz"] },
    { name: "Inter", weights: ["400", "700"] },
    { name: "Montserrat", weights: ["400", "800"] },
    { name: "Anton", weights: ["400"] },
    { name: "Bebas Neue", weights: ["400"] },
    { name: "Oswald", weights: ["400", "700"] },
    { name: "Playfair Display", weights: ["400", "800"] },
    { name: "Pacifico", weights: ["400"] },
    { name: "Permanent Marker", weights: ["400"] },
    { name: "Caveat", weights: ["400", "700"] },
    { name: "Lobster", weights: ["400"] },
    { name: "Barlow Condensed", weights: ["400", "700"] },
    { name: "Space Grotesk", weights: ["400", "700"] },
    { name: "Fraunces", weights: ["400", "700"] },
  ];
  return Object.fromEntries(fonts.map(({ name, weights, axes }) => {
    const url = getGoogleFontsUrl(name, getFontAxes(name, weights, ["normal"], axes), "swap");
    const fontWeight = weights[0] === "variable" ? "100 900" : weights.join(" ");
    const css = `@font-face { font-family: '${name}'; font-style: normal; font-weight: ${fontWeight}; font-display: swap; src: local('Arial'); unicode-range: U+0000-00FF; }`;
    return [url, css];
  }));
}

async function portAvailable(candidate) {
  const server = createServer();
  return new Promise((resolve) => {
    server.once("error", (error) => resolve(error.code ?? String(error)));
    // Match Next's wildcard/dual-stack listener. Checking only IPv4 can miss
    // a stale Next process bound to ::: and falsely report the port as free.
    server.listen(candidate, () => server.close(() => resolve(true)));
  });
}

function reviewProductId(href) {
  const pathname = new URL(href, origin).pathname;
  const match = /^\/partner\/review\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(pathname);
  if (!match) throw new Error(`Expected a product review URL with a UUID, got ${pathname}.`);
  return match[1];
}

async function waitForPort(candidate, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const connected = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port: candidate });
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => { socket.destroy(); resolve(false); });
    });
    if (connected) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Next.js did not open ${origin} within ${timeoutMs / 1000} seconds.`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {}
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (child.exitCode === null) {
    try {
      if (process.platform !== "win32" && child.pid) process.kill(-child.pid, "SIGKILL");
      else child.kill("SIGKILL");
    } catch {}
  }
}

let app;
let browser;
let smokePage;
let tempDir;
let appLogs = "";
const browserErrors = [];
const browserNetworkEvents = [];
let cleanupTask;
let imageSmokeName = null;
let compositionSmokeName = null;

function cleanup() {
  cleanupTask ??= (async () => {
    await browser?.close().catch(() => {});
    await stopProcess(app);
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  })();
  return cleanupTask;
}

for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => {
    process.exitCode = exitCode;
    void cleanup().finally(() => process.exit(exitCode));
  });
}

try {
  const executablePath = chromeExecutable();
  const portCheck = await portAvailable(port);
  if (portCheck === "EPERM" || portCheck === "EACCES") {
    console.warn(`Port ${port} preflight was denied (${portCheck}); checking availability through the actual Next.js startup instead.`);
  } else if (portCheck !== true) {
    throw new Error(`Port ${port} is unavailable (${portCheck}). Set PARTNER_BROWSER_PORT to an unused local port.`);
  }
  tempDir = await mkdtemp(path.join(os.tmpdir(), "sweetoh-partner-browser-"));
  imageSmokeName = `studio-image-smoke-${Date.now()}`;
  const imageSmokePath = path.join(tempDir, `${imageSmokeName}.png`);
  const imageSmokeSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#fff"/><circle cx="256" cy="270" r="148" fill="#ef476f"/><path d="M256 335c-8-74 17-137 84-190-2 73-26 139-84 190Zm-3 7c8-71-17-130-80-174 1 66 26 124 80 174Z" fill="#1f7048"/><circle cx="256" cy="270" r="55" fill="#ffd166"/></svg>`);
  await sharp(imageSmokeSvg).png().toFile(imageSmokePath);
  const fontMocksPath = path.join(tempDir, "google-fonts.cjs");
  await writeFile(fontMocksPath, `module.exports = ${JSON.stringify(mockedGoogleFontResponses())};\n`);

  // This repository's installed Next/Turbopack build cannot resolve its internal Google font loader;
  // the supported webpack dev path works with Next's mocked font responses and leaves app code untouched.
  app = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_FONT_GOOGLE_MOCKED_RESPONSES: fontMocksPath },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  app.stdout.on("data", (chunk) => { appLogs = `${appLogs}${chunk}`.slice(-5000); });
  app.stderr.on("data", (chunk) => { appLogs = `${appLogs}${chunk}`.slice(-5000); });
  await waitForPort(port);

  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-gpu", "--no-first-run", "--no-default-browser-check"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  smokePage = page;
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) => browserNetworkEvents.push(`failed ${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "request failed"}`));
  page.on("request", (request) => browserNetworkEvents.push(`request ${request.method()} ${request.url()}`));
  page.on("response", (response) => browserNetworkEvents.push(`response ${response.status()} ${response.url()}`));

  // Next's streamed partner page can return HTML while deferred development
  // resources keep DOMContentLoaded pending. Wait for response commit, then
  // for the actual login form that the smoke interacts with.
  await page.goto(`${origin}/partner/login`, { waitUntil: "commit", timeout: 90_000 });
  await page.locator("form.login-form").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  try {
    await page.waitForURL((url) => url.pathname === "/partner", { timeout: 90_000 });
  } catch {
    const loginError = await page.locator('[role="alert"]').allTextContents().then((items) => items.join(" ").trim()).catch(() => "");
    throw new Error(loginError ? `Partner login was rejected: ${loginError}` : `Partner login did not reach /partner (current path ${new URL(page.url()).pathname}).`);
  }

  if (process.env.PARTNER_BROWSER_READONLY_DESIGN_CHECK === "1") {
    // Reopen an existing private composition and create a local template copy;
    // neither navigation writes to the saved source design.
    await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const librarySummary = await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h2")].find((item) => item.textContent?.startsWith("Library ("));
      const rows = [...document.querySelectorAll("li")];
      const compositions = rows.flatMap((row) => {
        const link = row.querySelector('a[href^="/partner/canvas?composition="]');
        if (!link) return [];
        const compositionName = row.querySelector("p.text-sm.font-medium")?.textContent?.trim() ?? "Saved design";
        return [{ href: link.href, name: compositionName }];
      });
      return { libraryCount: heading?.textContent ?? "Library count unavailable", visibleCompositions: compositions.length, compositions };
    });
    let designJourney = null;
    const source = librarySummary.compositions[0];
    if (source) {
      const sourceId = new URL(source.href).searchParams.get("composition");
      await page.goto(source.href, { waitUntil: "commit", timeout: 90_000 });
      await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
      await page.getByRole("button", { name: "Layers", exact: true }).click();
      const sourceLayers = await page.locator(".pe-layer-row").count();
      if (!sourceId) throw new Error("The saved Studio design link had no composition ID.");
      await page.goto(`${origin}/partner/canvas?template=${encodeURIComponent(sourceId)}`, { waitUntil: "commit", timeout: 90_000 });
      await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
      const templateFallback = await page.locator(".pe-production-boundary").filter({ hasText: /removed because current rights|unavailable font/i }).count() > 0;
      await page.getByRole("button", { name: "Layers", exact: true }).click();
      const templateLayers = await page.locator(".pe-layer-row").count();
      if (!templateLayers && sourceLayers) throw new Error("Creating an editable Studio template copy dropped every source layer.");
      designJourney = { sourceReopened: true, sourceLayers, templateOpened: true, templateLayers, currentRightsOrFontFallbackShown: templateFallback, savedSourceMutated: false };
    }
    console.log(JSON.stringify({ browser: browser.version(), librarySummary: { libraryCount: librarySummary.libraryCount, visibleCompositions: librarySummary.visibleCompositions }, designJourney, persistentWrites: 0, pageErrors: browserErrors }));
    await context.close();
  } else if (process.env.PARTNER_BROWSER_READONLY_PRODUCT_CHECK === "1") {
    // Inspect one real private product and reopen its verified Studio surface
    // without submitting forms or saving any product/design changes.
    await page.goto(`${origin}/partner/products`, { waitUntil: "commit", timeout: 90_000 });
    await page.getByRole("heading", { name: "My products", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const productListCounts = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".product-table tbody tr")];
      const states = rows.map((row) => row.querySelector("td:nth-child(2)")?.textContent?.trim() ?? "(no status)");
      return {
        rows: rows.length,
        privateDraftRows: rows.filter((row) => row.textContent?.includes("Private draft")).length,
        reviewLinks: document.querySelectorAll('a[href^="/partner/review/"]').length,
        blankLinks: document.querySelectorAll('a[href^="/partner/canvas?blank="]').length,
        stateCounts: Object.fromEntries([...new Set(states)].map((state) => [state, states.filter((candidate) => candidate === state).length])),
      };
    });
    const blankTargets = await page.locator(".product-table tbody tr").evaluateAll((rows) => rows.flatMap((row) => {
      const link = row.querySelector('a[href^="/partner/canvas?blank="]');
      return link ? [{ href: link.href }] : [];
    }));
    const privateDrafts = await page.locator(".product-table tbody tr").evaluateAll((rows) => rows.flatMap((row) => {
      const action = row.querySelector('a[href^="/partner/review/"]');
      const text = row.innerText;
      return action && text.includes("Private draft · only you can see it") ? [{ href: action.href, rowText: text }] : [];
    }));
    const inspected = [];
    let verifiedStudio = null;
    for (const draft of privateDrafts) {
      const productId = reviewProductId(draft.href);
      await page.goto(draft.href, { waitUntil: "commit", timeout: 90_000 });
      await page.getByRole("heading", { name: "Product workspace", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      const productionCard = page.locator("article").filter({ hasText: "Production surface & placement" }).first();
      const verified = await productionCard.getByText("Verified production blank", { exact: true }).count() > 0;
      inspected.push({ productId, private: true, verifiedProductionBlank: verified });
      if (!verified) continue;
      const openSurface = productionCard.getByRole("link", { name: "Open verified surface in Studio", exact: true });
      if (!(await openSurface.count())) continue;
      const studioHref = await openSurface.getAttribute("href");
      if (!studioHref) continue;
      const productName = draft.rowText.split("Private draft · only you can see it")[0].trim();
      await page.goto(new URL(studioHref, origin).href, { waitUntil: "commit", timeout: 90_000 });
      await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
      await page.getByText("Verified production blank", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      const selectedDraft = await page.getByRole("combobox", { name: "Choose private product draft" }).locator("option:checked").textContent();
      if (!selectedDraft?.includes(productName)) throw new Error(`Read-only Studio reopen selected '${selectedDraft}' instead of private product '${productName}'.`);
      const activeRegion = page.locator('.pe-surface-bar select[aria-label="Active print area"] option:checked');
      await activeRegion.waitFor({ state: "attached", timeout: 30_000 });
      verifiedStudio = { productId, productName, selectedDraft, activePrintArea: await activeRegion.textContent(), studio: "read-only open showed this product’s verified production blank and saved print region" };
      break;
    }
    if (!verifiedStudio && blankTargets.length) {
      await page.goto(blankTargets[0].href, { waitUntil: "commit", timeout: 90_000 });
      await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
      const barText = await page.locator(".pe-surface-bar").innerText();
      const activeRegion = page.locator('.pe-surface-bar select[aria-label="Active print area"] option:checked');
      verifiedStudio = {
        workspaceType: "saved private blank · read only",
        verifiedProductionBlank: barText.includes("Verified production blank"),
        printRegion: await activeRegion.count() ? await activeRegion.textContent() : null,
        studioCanvas: "opened without edits",
      };
    }
    console.log(JSON.stringify({ browser: browser.version(), productListCounts, privateDraftsInspected: inspected, verifiedStudio, persistentWrites: 0, pageErrors: browserErrors }));
    await context.close();
  } else if (process.env.PARTNER_BROWSER_CLEANUP_ASSET_NAMES) {
    await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const cleanupNames = process.env.PARTNER_BROWSER_CLEANUP_ASSET_NAMES.split(",").map((name) => name.trim()).filter(Boolean);
    const cleanupResults = [];
    for (const name of cleanupNames) {
      const card = page.getByText(name, { exact: true }).locator("xpath=ancestor::li[1]");
      if (!(await card.count())) { cleanupResults.push({ name, status: "not present" }); continue; }
      await card.getByRole("button", { name: "Remove", exact: true }).click();
      await page.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000, waitUntil: "commit" });
      await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
      await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      cleanupResults.push({ name, status: "archived through My files" });
    }
    console.log(JSON.stringify({ browser: browser.version(), temporaryAssetCleanup: cleanupResults, pageErrors: browserErrors }));
    await context.close();
  } else if (process.env.PARTNER_BROWSER_STUDIO_ONLY === "1") {
    // Exercise Studio directly. The home page performs several unrelated
    // operational queries and can be slow in a cold local browser session.
    // This path exercises insertion and local crash recovery in an isolated
    // browser context, without saving a partner asset or product.
    await page.goto(`${origin}/partner/canvas`, { waitUntil: "commit", timeout: 90_000 });
    await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByText("Loading product…", { exact: true }).waitFor({ state: "detached", timeout: 45_000 });
    const desktopViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
    const assetLibraryButton = page.getByRole("button", { name: "Library", exact: true });
    await assetLibraryButton.waitFor({ state: "visible", timeout: 90_000 });
    await assetLibraryButton.click();
    await page.getByRole("heading", { name: "Asset library", exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    const search = page.getByPlaceholder("Search elements and fonts");
    const totalAssets = await page.getByLabel("Studio asset category").locator("option").first().textContent();
    await search.fill("doctor x-ray lungs");
    const assetButton = page.getByRole("button", { name: "Add Doctor checks X-ray image", exact: true });
    await assetButton.waitFor({ state: "visible", timeout: 30_000 });
    const assetResponse = await page.request.get(`${origin}/api/studio/assets/libreclipart-858-v1`, { timeout: 90_000 });
    if (!assetResponse.ok() || !assetResponse.headers()["content-type"]?.startsWith("image/")) {
      throw new Error(`Rights-approved Doctor checks X-ray image asset did not load (${assetResponse.status()}).`);
    }
    await assetButton.click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.locator(".pe-layers");
    await layers.getByText("Doctor checks X-ray image", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    // Select the inserted object and exercise the existing transform controls
    // through their history-backed inputs.
    await layers.getByRole("button", { name: "Doctor checks X-ray image", exact: true }).click();
    const bounds = page.locator(".pe-props .pe-grid2 input[type='number']");
    const xControl = bounds.nth(0);
    const widthControl = bounds.nth(2);
    const movedX = String(Number(await xControl.inputValue()) + 2);
    const resizedWidth = String(Number(await widthControl.inputValue()) + 1);
    await xControl.fill(movedX);
    await widthControl.fill(resizedWidth);
    if (await xControl.inputValue() !== movedX || await widthControl.inputValue() !== resizedWidth) throw new Error("Studio did not apply the selected artwork move/resize controls.");
    const geometry = page.locator(".pe-props .pe-grid2 input[type='number']").nth(4);
    await geometry.fill("18");
    await geometry.blur();
    if (await geometry.inputValue() !== "18") throw new Error("Studio did not apply the selected artwork rotation.");
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
    if (await geometry.inputValue() !== "18") throw new Error("Studio redo did not restore the selected artwork rotation.");
    // Create a practical, text-heavy hierarchy using the existing text presets
    // and selected-text properties, then test duplicate/delete history.
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: "Add a heading", exact: true }).click();
    const textContent = page.getByLabel("Text", { exact: true });
    await textContent.fill("ISLAND DAYS");
    await page.getByLabel("Font", { exact: true }).selectOption("montserrat");
    await page.getByLabel("Font size", { exact: true }).fill("56");
    await page.getByRole("button", { name: "center", exact: true }).click();
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await page.locator(".pe-props .pe-swatches button[aria-label='#1f7048']").click();
    await page.getByRole("button", { name: "Add a subheading", exact: true }).click();
    await textContent.fill("Made for slow summer mornings");
    await page.getByLabel("Font", { exact: true }).selectOption("inter");
    await page.getByLabel("Font size", { exact: true }).fill("30");
    await page.getByRole("button", { name: "Add body text", exact: true }).click();
    await textContent.fill("Designed for bright island days");
    await page.waitForTimeout(1_500);
    const savedTextStack = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith("sweetoh:draft:"));
      const draft = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
      const layers = draft?.studio?.surfaces?.flatMap((surface) => surface.layers) ?? [];
      return ["ISLAND DAYS", "Made for slow summer mornings", "Designed for bright island days"].map((text) => {
        const layer = layers.find((candidate) => candidate.kind === "text" && candidate.text === text);
        return layer ? { text, y: layer.y, fontSize: layer.fontSize } : null;
      });
    });
    if (savedTextStack.some((item) => !item) || !(savedTextStack[0].y < savedTextStack[1].y && savedTextStack[1].y < savedTextStack[2].y)) {
      throw new Error(`New text presets did not land as a readable top-to-bottom stack: ${JSON.stringify(savedTextStack)}`);
    }
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.locator(".pe-layers").getByRole("button", { name: "ISLAND DAYS", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".pe-layers").getByRole("button", { name: "Made for slow summer mornings", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(".pe-layers").getByRole("button", { name: "Designed for bright island days", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const textRowsBeforeCopy = await page.locator(".pe-layer-row").count();
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    if (await page.locator(".pe-layer-row").count() !== textRowsBeforeCopy + 1) throw new Error("Duplicate did not create a separate text layer.");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
    if (await page.locator(".pe-layer-row").count() !== textRowsBeforeCopy) throw new Error("Text duplicate/delete undo and redo did not preserve layer state.");
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByRole("button", { name: "Originals & fonts", exact: true }).click();
    await search.fill("tropical leaf");
    await page.getByRole("button", { name: "Add Tropical leaf", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
    await page.getByRole("button", { name: "Add Tropical leaf", exact: true }).click();
    await page.getByRole("button", { name: "My reusable assets", exact: false }).click();
    const reusableSearch = page.getByPlaceholder("Search names, tags, source or method");
    await reusableSearch.fill("doctor x-ray lungs");
    const reusableResults = await page.locator(".pe-asset-card").count();
    // The reusable-asset shelf may be empty for this partner; the verified
    // launch collection above remains available independently.
    const tabletViewport = { width: 768, height: 1024 };
    await page.setViewportSize(tabletViewport);
    const tabletLayout = await page.evaluate(() => {
      const panel = document.querySelector(".pe-panel");
      const rail = document.querySelector(".pe-rail");
      const box = panel?.getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, panelVisible: Boolean(box && box.width > 0 && box.height > 0), railVisible: Boolean(rail && rail.getBoundingClientRect().height > 0) };
    });
    if (tabletLayout.horizontalOverflow || !tabletLayout.panelVisible || !tabletLayout.railVisible) throw new Error(`Studio library is not usable at tablet size: ${JSON.stringify(tabletLayout)}`);
    await page.getByRole("button", { name: "Originals & fonts", exact: true }).click();
    await search.fill("party confetti");
    await page.getByRole("button", { name: "Add Party confetti", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
    await page.getByRole("button", { name: "Add Party confetti", exact: true }).click();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    const previewDialog = page.getByRole("dialog", { name: "Preview", exact: true });
    await previewDialog.getByRole("heading", { name: "Print-area preview", exact: true }).waitFor({ state: "visible", timeout: 20_000 });
    const previewBoundary = previewDialog.locator(".pe-production-boundary");
    if (!(await previewBoundary.innerText()).includes("not a product mockup")) throw new Error("Studio did not distinguish print-area artwork from a product mockup when no verified blank is present.");
    if (!(await previewDialog.getByRole("button", { name: "Continue to pricing", exact: true }).isDisabled())) throw new Error("Studio allowed pricing to continue without a verified production blank.");
    const printDownload = page.waitForEvent("download", { timeout: 30_000 });
    await previewDialog.locator(".pe-stack button").first().click();
    const exported = await printDownload;
    const printPath = path.join(tempDir, exported.suggestedFilename());
    await exported.saveAs(printPath);
    const printMetadata = await sharp(printPath).metadata();
    if (printMetadata.format !== "png" || !printMetadata.hasAlpha || !printMetadata.width || !printMetadata.height || Math.max(printMetadata.width, printMetadata.height) > 6000) {
      throw new Error(`Studio print export did not produce a bounded transparent PNG: ${JSON.stringify({ format: printMetadata.format, alpha: printMetadata.hasAlpha, width: printMetadata.width, height: printMetadata.height })}`);
    }
    await previewDialog.getByRole("button", { name: "Close preview", exact: true }).click();
    const printExport = { filename: exported.suggestedFilename(), width: printMetadata.width, height: printMetadata.height, transparentPng: printMetadata.hasAlpha };
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await layers.getByText("Tropical leaf", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await layers.locator(".pe-layer-row").filter({ hasText: "Party confetti" }).waitFor({ state: "visible", timeout: 15_000 });
    if (process.env.PARTNER_BROWSER_CAPTURE_STUDIO_SCREENSHOTS === "1") {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(150);
      await page.screenshot({ path: "/private/tmp/sweetoh-studio-desktop.png" });
      await page.setViewportSize({ width: 768, height: 1024 });
    }
    const multiSelect = page.locator(".pe-layer-select");
    await multiSelect.nth(0).check();
    await multiSelect.nth(1).check();
    await page.getByRole("heading", { name: "2 objects", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByRole("button", { name: "To front", exact: true }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
    await layers.getByRole("button", { name: "ISLAND DAYS", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await layers.getByRole("button", { name: "ISLAND DAYS", exact: true }).click();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator(".pe-props").scrollIntoViewIfNeeded();
    await page.getByLabel("Font", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const tabletTypography = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, propertiesVisible: Boolean(document.querySelector(".pe-props select[aria-label='Font']")?.getBoundingClientRect().height) }));
    if (tabletTypography.horizontalOverflow || !tabletTypography.propertiesVisible) throw new Error(`Selected text properties are not usable at tablet size: ${JSON.stringify(tabletTypography)}`);
    const typographyLabels = await page.evaluate(() => [...document.querySelectorAll(".pe-props .pe-num span")].map((label) => ({ text: label.textContent?.trim(), clipped: label.scrollWidth > label.clientWidth })));
    if (!["Size", "Text width", "Outline"].every((text) => typographyLabels.some((label) => label.text === text && !label.clipped))) throw new Error(`Typography control labels are clipped at tablet size: ${JSON.stringify(typographyLabels)}`);
    await page.getByLabel("Outline width", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    if (process.env.PARTNER_BROWSER_CAPTURE_STUDIO_SCREENSHOTS === "1") {
      await page.screenshot({ path: "/private/tmp/sweetoh-studio-tablet.png" });
    }
    // Let the editor's debounced recovery snapshot land, then exercise a real
    // refresh/reopen. The browser context is isolated and discarded afterward,
    // so this proves persistence without writing a partner asset or product.
    await page.waitForTimeout(1_500);
    page.on("dialog", (dialog) => void dialog.accept());
    await page.reload({ waitUntil: "commit", timeout: 90_000 });
    await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByRole("button", { name: "Restore it", exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Restore it", exact: true }).click();
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByRole("heading", { name: "Asset library", exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByPlaceholder("Search elements and fonts").fill("butterfly");
    const continuedAsset = page.getByRole("button", { name: "Add Butterfly", exact: true });
    await continuedAsset.waitFor({ state: "visible", timeout: 30_000 });
    await continuedAsset.click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await layers.getByText("Doctor checks X-ray image", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await layers.getByText("Butterfly", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: /undo/i }).click();
    await layers.getByText("Butterfly", { exact: true }).waitFor({ state: "detached", timeout: 15_000 });
    await layers.getByText("Doctor checks X-ray image", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await layers.getByRole("button", { name: "ISLAND DAYS", exact: true }).click();
    const reopenedText = page.getByLabel("Text", { exact: true });
    await reopenedText.fill("ISLAND DAYS · KEEP CREATING");
    if (await reopenedText.inputValue() !== "ISLAND DAYS · KEEP CREATING") throw new Error("Studio could not continue editing saved typography after refresh.");

    // Import a temporary, locally generated image and exercise image-specific
    // controls. It is a flat white backdrop with vector artwork so background
    // removal stays on the existing local path and does not spend AI credits.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Uploads", exact: true }).click();
    await page.getByLabel("Upload artwork file").setInputFiles(imageSmokePath);
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await layers.getByRole("button", { name: imageSmokeName, exact: true }).waitFor({ state: "visible", timeout: 45_000 });
    await layers.getByRole("button", { name: imageSmokeName, exact: true }).click();
    // Verify the existing mask and shadow controls affect the selected image.
    for (const label of ["Oval", "Round", "Original"]) {
      const maskButton = page.getByRole("button", { name: label, exact: true });
      await maskButton.click();
      if (await maskButton.getAttribute("aria-pressed") !== "true") throw new Error(`Image mask '${label}' did not become active.`);
    }
    const depthSection = page.locator(".pe-props section.pe-section").filter({ hasText: "Depth and shadow" });
    await depthSection.getByRole("button", { name: "Add soft shadow", exact: true }).click();
    await depthSection.getByRole("button", { name: "Remove soft shadow", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const shadowBlur = depthSection.locator("label.pe-slider").filter({ hasText: "Blur" }).locator("input[type='range']");
    const shadowBlurBefore = await shadowBlur.inputValue();
    const shadowBlurBounds = await shadowBlur.boundingBox();
    if (!shadowBlurBounds) throw new Error("The image shadow blur control was not visible.");
    await page.mouse.click(shadowBlurBounds.x + shadowBlurBounds.width * 0.63, shadowBlurBounds.y + shadowBlurBounds.height / 2);
    if (await shadowBlur.inputValue() === shadowBlurBefore) throw new Error("The image shadow blur control did not respond.");
    await depthSection.getByRole("button", { name: "Remove soft shadow", exact: true }).click();
    await depthSection.getByRole("button", { name: "Add soft shadow", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    // Exercise the real mixed-object selection controls with an imported image,
    // a reusable graphic and text together. Save snapshots are isolated to this
    // disposable browser context and let the smoke assert that group movement
    // changes every selected layer rather than only the active one.
    const rowFor = (name) => page.locator(".pe-layer-row").filter({ hasText: name });
    const selectRow = async (name) => {
      const row = rowFor(name);
      await row.waitFor({ state: "visible", timeout: 15_000 });
      await row.locator("input.pe-layer-select").check();
      return row;
    };
    const imageRow = await selectRow(imageSmokeName);
    const leafRow = await selectRow("Tropical leaf");
    const headingRow = await selectRow("ISLAND DAYS · KEEP CREATING");
    await page.getByRole("heading", { name: "3 objects", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    const readDraftPositions = () => page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith("sweetoh:draft:"));
      const draft = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
      return draft?.studio?.surfaces?.flatMap((surface) => surface.layers.map(({ id, x, y, scaleX, scaleY }) => ({ id, x, y, scaleX, scaleY }))) ?? [];
    });
    await page.waitForTimeout(1_500);
    const positionsBeforeMove = await readDraftPositions();
    const canvasKeyboardTarget = page.locator(".pe-stage canvas.upper-canvas");
    const canvasBounds = await canvasKeyboardTarget.boundingBox();
    if (!canvasBounds) throw new Error("The canvas was not available for moving a selected composition.");
    const dragStart = { x: canvasBounds.x + canvasBounds.width / 2, y: canvasBounds.y + canvasBounds.height / 2 };
    await page.mouse.move(dragStart.x, dragStart.y);
    await page.mouse.down();
    await page.mouse.move(dragStart.x + 16, dragStart.y + 12, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(1_500);
    const positionsAfterMove = await readDraftPositions();
    const movedLayers = positionsBeforeMove.flatMap((before) => {
      const after = positionsAfterMove.find((item) => item.id === before.id);
      return after && (Math.abs(after.x - before.x) > 0.01 || Math.abs(after.y - before.y) > 0.01) ? [{ dx: after.x - before.x, dy: after.y - before.y }] : [];
    });
    if (movedLayers.length !== 3 || Math.max(...movedLayers.map(({ dx }) => dx)) - Math.min(...movedLayers.map(({ dx }) => dx)) > 0.05 || Math.max(...movedLayers.map(({ dy }) => dy)) - Math.min(...movedLayers.map(({ dy }) => dy)) > 0.05) throw new Error(`Dragging the canvas selection did not move all three selected layers together (${movedLayers.length}/3 moved by the same amount).`);
    // Drag the visible bottom-right ActiveSelection handle outward; all three
    // underlying layer scales should grow together and remain independently saved.
    const selectionCorner = { x: canvasBounds.x + canvasBounds.width * 0.669, y: canvasBounds.y + canvasBounds.height * 0.625 };
    await page.mouse.move(selectionCorner.x, selectionCorner.y);
    await page.mouse.down();
    await page.mouse.move(selectionCorner.x + 14, selectionCorner.y + 14, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(1_500);
    const positionsAfterResize = await readDraftPositions();
    const resizedLayers = positionsBeforeMove.flatMap((before) => {
      const after = positionsAfterResize.find((item) => item.id === before.id);
      return after && after.scaleX > before.scaleX * 1.01 && after.scaleY > before.scaleY * 1.01 ? [after] : [];
    });
    if (resizedLayers.length !== 3) throw new Error(`Resizing the canvas selection did not scale all three selected layers together (${resizedLayers.length}/3 changed; tried ${JSON.stringify(selectionCorner)} within ${JSON.stringify(canvasBounds)}).`);
    await page.getByRole("button", { name: "Group", exact: true }).click();
    for (const row of [imageRow, leafRow, headingRow]) {
      if (!(await row.innerText()).includes("Grouped")) throw new Error("Grouping did not mark every selected layer in Layers.");
    }
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.waitForFunction(({ name, grouped }) => {
      const row = [...document.querySelectorAll(".pe-layer-row")].find((item) => item.textContent?.includes(name));
      return Boolean(row) && row.textContent?.includes("Grouped") === grouped;
    }, { name: imageSmokeName, grouped: false }, { timeout: 15_000 });
    for (const row of [imageRow, leafRow, headingRow]) await row.locator("input.pe-layer-select").check();
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.waitForFunction(({ name, grouped }) => {
      const row = [...document.querySelectorAll(".pe-layer-row")].find((item) => item.textContent?.includes(name));
      return Boolean(row) && row.textContent?.includes("Grouped") === grouped;
    }, { name: imageSmokeName, grouped: true }, { timeout: 15_000 });
    for (const row of [imageRow, leafRow, headingRow]) await row.locator("input.pe-layer-select").check();
    await page.getByRole("button", { name: "Ungroup", exact: true }).click();
    await page.waitForFunction(({ name, grouped }) => {
      const row = [...document.querySelectorAll(".pe-layer-row")].find((item) => item.textContent?.includes(name));
      return Boolean(row) && row.textContent?.includes("Grouped") === grouped;
    }, { name: imageSmokeName, grouped: false }, { timeout: 15_000 });
    const readLayerOrder = () => page.locator(".pe-layer-row").evaluateAll((rows) => rows.map((row) => row.querySelector("span")?.textContent?.trim() ?? ""));
    const layerOrderBefore = await readLayerOrder();
    await page.getByRole("button", { name: "To front", exact: true }).click();
    const layerOrderAfter = await readLayerOrder();
    if (layerOrderAfter.slice(0, 3).some((name) => ![imageSmokeName, "Tropical leaf", "ISLAND DAYS · KEEP CREATING"].some((selectedName) => name.startsWith(selectedName)))) throw new Error("To front did not bring the selected composition layers above the unselected layers.");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.waitForFunction((expected) => JSON.stringify([...document.querySelectorAll(".pe-layer-row")].map((row) => row.querySelector("span")?.textContent?.trim() ?? "")) === JSON.stringify(expected), layerOrderBefore, { timeout: 15_000 });
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.waitForFunction((expected) => JSON.stringify([...document.querySelectorAll(".pe-layer-row")].map((row) => row.querySelector("span")?.textContent?.trim() ?? "")) === JSON.stringify(expected), layerOrderAfter, { timeout: 15_000 });
    for (const row of [imageRow, leafRow, headingRow]) await row.locator("input.pe-layer-select").check();
    await page.getByRole("button", { name: "Align selected hcenter to selection", exact: true }).click();
    for (const row of [imageRow, leafRow, headingRow]) await row.locator("input.pe-layer-select").check();
    await page.getByRole("button", { name: "Canvas", exact: true }).click();
    await page.getByRole("button", { name: "Align selected left to canvas", exact: true }).click();
    const partyRow = rowFor("Party confetti");
    await partyRow.getByRole("button", { name: "Hide layer", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".pe-layer-row[data-hidden='true']") !== null);
    await partyRow.getByRole("button", { name: "Show layer", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".pe-layer-row[data-hidden='true']") === null);
    await partyRow.getByRole("button", { name: "Lock layer", exact: true }).click();
    await partyRow.getByRole("button", { name: "Unlock layer", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    if (!(await partyRow.getByRole("button", { name: "Party confetti", exact: true }).isDisabled())) throw new Error("A locked layer remained selectable from Layers.");
    await partyRow.getByRole("button", { name: "Unlock layer", exact: true }).click();
    if (await partyRow.getByRole("button", { name: "Party confetti", exact: true }).isDisabled()) throw new Error("Unlock did not restore selection from Layers.");
    for (const row of [imageRow, leafRow, headingRow]) await row.locator("input.pe-layer-select").uncheck();
    await layers.getByRole("button", { name: imageSmokeName, exact: true }).click();
    await page.getByRole("button", { name: "Crop", exact: true }).click();
    const cropDialog = page.getByRole("dialog", { name: "Crop", exact: true });
    await cropDialog.getByRole("button", { name: "4:5", exact: true }).click();
    await page.waitForTimeout(500);
    await cropDialog.getByRole("button", { name: "Apply crop", exact: true }).click();
    const flipButtons = page.getByRole("button", { name: "Flip", exact: true });
    await flipButtons.nth(0).click();
    await flipButtons.nth(1).click();
    const adjustByPointer = async (labelText, fraction = 0.72) => {
      const slider = page.locator(".pe-props label.pe-slider").filter({ hasText: labelText }).locator("input[type='range']");
      await slider.scrollIntoViewIfNeeded();
      const before = await slider.inputValue();
      const box = await slider.boundingBox();
      if (!box) throw new Error(`Image adjustment control '${labelText}' is not visible.`);
      await page.mouse.click(box.x + box.width * fraction, box.y + box.height / 2);
      if (await slider.inputValue() === before) throw new Error(`Image adjustment '${labelText}' did not respond.`);
    };
    for (const label of ["Brightness", "Contrast", "Saturation", "Cool ↔ Warm tint", "Soft focus", "Opacity"]) {
      await adjustByPointer(label, label === "Opacity" ? 0.68 : 0.72);
    }
    await page.getByRole("button", { name: "Remove background", exact: true }).click();
    const cutoutName = `${imageSmokeName} (no background)`;
    await layers.getByRole("button", { name: cutoutName, exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await layers.getByRole("button", { name: imageSmokeName, exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await layers.getByRole("button", { name: cutoutName, exact: true }).waitFor({ state: "visible", timeout: 15_000 });

    // Duplicate and remove the cutout, checking those image actions use the
    // same history stack while text and reusable graphics remain on the canvas.
    const imageRowsBeforeCopy = await page.locator(".pe-layer-row").count();
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    await page.locator(".pe-layer-row").nth(imageRowsBeforeCopy).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.locator(".pe-layer-row").nth(imageRowsBeforeCopy).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.waitForFunction((count) => document.querySelectorAll(".pe-layer-row").length === count, imageRowsBeforeCopy, { timeout: 15_000 });
    // Exercise freehand and erase on the desktop canvas, where the full
    // drawing surface is in view. Phone canvas visibility is checked below.
    await page.getByRole("button", { name: "Close panel", exact: true }).click().catch(() => {});
    await page.getByRole("button", { name: "Shapes", exact: true }).click();
    await page.getByRole("button", { name: "Draw", exact: true }).click();
    await page.getByRole("button", { name: "Finish drawing", exact: true }).waitFor({ state: "visible", timeout: 10_000 });
    await page.getByLabel("Drawing brush").selectOption("marker");
    const drawCanvasBounds = await page.locator(".pe-stage canvas.upper-canvas").boundingBox();
    if (!drawCanvasBounds) throw new Error("The drawing canvas was not available.");
    const strokeStart = { x: drawCanvasBounds.x + drawCanvasBounds.width * 0.45, y: drawCanvasBounds.y + drawCanvasBounds.height * 0.45 };
    const strokeEnd = { x: drawCanvasBounds.x + drawCanvasBounds.width * 0.62, y: drawCanvasBounds.y + drawCanvasBounds.height * 0.55 };
    await page.mouse.move(strokeStart.x, strokeStart.y);
    await page.mouse.down();
    await page.mouse.move(strokeEnd.x, strokeEnd.y, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Finish drawing", exact: true }).click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const strokeRow = page.locator(".pe-layer-row").filter({ hasText: "Freehand stroke" }).first();
    await strokeRow.waitFor({ state: "visible", timeout: 15_000 });
    await strokeRow.getByRole("button", { name: "Freehand stroke", exact: true }).click();
    const strokeStyle = page.locator(".pe-props section.pe-section").filter({ hasText: "Stroke style" });
    await strokeStyle.waitFor({ state: "visible", timeout: 15_000 });
    await strokeStyle.locator("label.pe-select select").first().selectOption("dashed");
    // Studio autosaves locally on a 1.2 second debounce after the command.
    await page.waitForTimeout(1_500);
    const storedDrawing = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((item) => item.startsWith("sweetoh:draft:"));
      const draft = key ? JSON.parse(localStorage.getItem(key) || "null") : null;
      return draft?.studio?.surfaces?.flatMap((surface) => surface.layers).find((layer) => layer.kind === "drawing");
    });
    if (!storedDrawing || storedDrawing.brush !== "dashed") throw new Error("The finished drawing did not save as an editable, styled Studio layer.");
    await page.getByRole("button", { name: "Shapes", exact: true }).click();
    await page.getByRole("button", { name: "Erase strokes", exact: true }).click();
    const eraseCanvasBounds = await page.locator(".pe-stage canvas.upper-canvas").boundingBox();
    if (!eraseCanvasBounds) throw new Error("The stroke eraser canvas was not available.");
    await page.mouse.move(eraseCanvasBounds.x + eraseCanvasBounds.width * 0.45, eraseCanvasBounds.y + eraseCanvasBounds.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(eraseCanvasBounds.x + eraseCanvasBounds.width * 0.62, eraseCanvasBounds.y + eraseCanvasBounds.height * 0.55, { steps: 8 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Finish erasing", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.locator(".pe-layer-row").filter({ hasText: "Freehand stroke" }).first().waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.locator(".pe-layer-row").filter({ hasText: "Freehand stroke" }).waitFor({ state: "detached", timeout: 15_000 });
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.locator(".pe-props").scrollIntoViewIfNeeded();
    await adjustByPointer("Contrast", 0.6);
    const tabletImageEditing = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, propertiesVisible: Boolean(document.querySelector(".pe-props input[type='range']")?.getBoundingClientRect().height) }));
    if (tabletImageEditing.horizontalOverflow || !tabletImageEditing.propertiesVisible) throw new Error(`Selected image controls are not usable at tablet size: ${JSON.stringify(tabletImageEditing)}`);

    // A narrow phone viewport is the most constrained supported layout. Keep
    // the selected object and controls visible without horizontal scrolling.
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneLayout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, canvasVisible: Boolean(document.querySelector(".pe-stage canvas.lower-canvas")?.getBoundingClientRect().width), propertiesVisible: Boolean(document.querySelector(".pe-props input[type='range']")?.getBoundingClientRect().height) }));
    if (phoneLayout.horizontalOverflow || !phoneLayout.canvasVisible || !phoneLayout.propertiesVisible) throw new Error(`Studio phone layout did not expose the canvas and selected image controls cleanly: ${JSON.stringify(phoneLayout)}`);
    if (process.env.PARTNER_BROWSER_CAPTURE_STUDIO_SCREENSHOTS === "1") {
      await page.screenshot({ path: "/private/tmp/sweetoh-studio-phone.png" });
    }
    await page.getByRole("button", { name: "Close panel", exact: true }).click().catch(() => {});
    await page.getByRole("button", { name: "Library", exact: true }).click();
    const phoneLibrarySearch = page.getByPlaceholder("Search elements and fonts");
    await phoneLibrarySearch.fill("butterfly");
    const phoneAsset = page.getByRole("button", { name: "Add Butterfly", exact: true });
    await phoneAsset.waitFor({ state: "visible", timeout: 20_000 });
    await phoneAsset.click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.locator(".pe-layer-row").filter({ hasText: "Butterfly" }).waitFor({ state: "visible", timeout: 15_000 });
    const phoneLibraryLayout = await page.evaluate(() => ({ width: innerWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth, resultVisible: Boolean(document.querySelector(".pe-layer-row")?.getBoundingClientRect().height) }));
    if (phoneLibraryLayout.horizontalOverflow || !phoneLibraryLayout.resultVisible) throw new Error(`Creative Library search and insertion are not usable on phone: ${JSON.stringify(phoneLibraryLayout)}`);
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: "Layers", exact: true }).click();

    // Remove the temporary cutout before saving, so the
    // real persisted test composition references only approved reusable assets.
    const temporaryCutoutLayer = page.getByRole("button", { name: cutoutName, exact: true });
    await temporaryCutoutLayer.click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await temporaryCutoutLayer.waitFor({ state: "detached", timeout: 15_000 });
    compositionSmokeName = `Studio smoke ${Date.now()}`;
    await page.getByLabel("Product name", { exact: true }).fill(compositionSmokeName);
    await page.getByRole("button", { name: "Save reusable design", exact: true }).click();
    await page.waitForURL(/\/partner\/library\?success=/, { timeout: 60_000, waitUntil: "commit" });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const savedCompositionLinks = await page.locator("li").evaluateAll((rows, name) => rows.flatMap((row) => {
      const link = row.querySelector('a[href^="/partner/canvas?composition="]');
      const rowName = row.querySelector("p.text-sm.font-medium")?.textContent?.trim();
      return link && rowName === name ? [{ href: link.getAttribute("href"), name: rowName }] : [];
    }), compositionSmokeName);
    if (savedCompositionLinks.length !== 1) throw new Error(`Expected exactly one newly saved disposable composition, found ${savedCompositionLinks.length}.`);
    await page.goto(new URL(savedCompositionLinks[0].href, origin).href, { waitUntil: "commit", timeout: 90_000 });
    await page.locator(".pe-stage canvas.lower-canvas").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const reopenedLayerNames = await page.locator(".pe-layer-row").allTextContents();
    if (!reopenedLayerNames.some((name) => name.includes("Butterfly")) || !reopenedLayerNames.some((name) => name.includes("Tropical leaf"))) {
      const rightsFallback = await page.locator(".pe-production-boundary").filter({ hasText: /removed because current rights|unavailable font/i }).allTextContents();
      throw new Error(`Saved composition reopened without its expected Creative Library layers: ${JSON.stringify({ reopenedLayerNames, rightsFallback })}`);
    }
    const savedCompositionHref = savedCompositionLinks[0].href;

    // Make a small edit on the reopened copy, then archive only the new
    // disposable composition and two temporary test assets.
    await page.getByRole("button", { name: "ISLAND DAYS · KEEP CREATING", exact: true }).click();
    await page.getByRole("button", { name: "Text", exact: true }).click();
    await textContent.fill("ISLAND DAYS · STILL CREATING");
    if (await textContent.inputValue() !== "ISLAND DAYS · STILL CREATING") throw new Error("The reopened saved composition could not be edited.");
    await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const compositionCard = page.locator("li").filter({ has: page.locator(`a[href="${savedCompositionHref}"]`) });
    await compositionCard.getByRole("button", { name: "Remove", exact: true }).click();
    await page.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000, waitUntil: "commit" });
    await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
    await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    for (const name of [cutoutName, imageSmokeName]) {
      const card = page.getByText(name, { exact: true }).locator("xpath=ancestor::li[1]");
      await card.getByRole("button", { name: "Remove", exact: true }).click();
      await page.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000, waitUntil: "commit" });
      await page.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 90_000 });
      await page.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    }
    const inspection = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      assetCards: document.querySelectorAll(".pe-asset-card").length,
      libraryGridScrollHeight: document.querySelector(".pe-asset-grid")?.scrollHeight ?? null,
      documentHeight: document.documentElement.scrollHeight,
    }));
    console.log(JSON.stringify({
      browser: browser.version(),
      partnerLogin: "passed",
      studio: "opened directly without changing product data",
      libraryCoverage: { totalAssets, desktopViewport, tabletLayout, reusableShelfResults: reusableResults },
      creativeLibrarySearch: "searched medical, tropical and celebration themes; inserted approved illustration, SweetOh original and pattern assets",
      typography: "created three text layers; edited copy, font, size, alignment, weight and color; duplicate/delete history passed",
      textPlacement: savedTextStack.map(({ text, y }) => ({ text, y })),
      imageEditing: "uploaded a temporary image; crop, flip, opacity, brightness, contrast, saturation, tint, soft focus and local background removal passed; undo/redo, duplicate/delete and tablet controls passed",
      imageMaskAndShadow: "cycled the original, oval and round masks; added, adjusted and removed a soft shadow",
      drawingAndErasing: "created a styled editable stroke; verified local autosave; erased it and recovered/restored the history state",
      previewAndExport: { truthfulPrintAreaOnlyPreview: true, pricingBlockedWithoutVerifiedBlank: true, printExport },
      phoneLayout: "canvas and selected-object controls remained visible at 390×844 without horizontal overflow",
      imageRefreshAndCleanup: "restored edited image after refresh, continued editing, then archived both temporary My files records",
      selectionAndHistory: "selected a mixed image/graphic/text set; dragged and resized all three together; grouped/ungrouped, aligned to selection/canvas, changed front/back order, hid/showed and locked/unlocked a layer; undo/redo passed",
      tabletTypography,
      studioRefreshRecovery: "restored the inserted layer from the isolated browser draft after refresh",
      phoneLibrary: { searched: "butterfly", inserted: "Butterfly", ...phoneLibraryLayout },
      savedDesign: "saved one composition, reopened it from My files with its layers intact, edited its heading locally, then removed only that disposable composition",
      continuedEditing: "inserted Butterfly after restore, undid that insertion, and edited recovered heading text",
      partnerData: "unchanged; browser context closed without saving a partner asset or product",
      inspection,
      pageErrors: browserErrors,
      browserNetworkEvents: browserNetworkEvents.slice(-20),
    }));
    await context.close();
  } else {
  const productsLink = page.locator('a[href="/partner/products"]').first();
  await productsLink.waitFor({ state: "visible", timeout: 20_000 });
  await productsLink.click();
  await page.getByRole("heading", { name: "My products" }).waitFor({ state: "visible", timeout: 20_000 });
  if (new URL(page.url()).pathname !== "/partner/products") throw new Error(`Partner products navigation landed on ${new URL(page.url()).pathname}.`);
  await page.getByRole("textbox", { name: "Search your products" }).waitFor({ state: "visible", timeout: 10_000 });

  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByRole("heading", { name: "My products" }).waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('summary[aria-label="Account menu"]').click();
  const signedOut = page.waitForURL((url) => url.pathname === "/partner/login", { timeout: 30_000 });
  await page.getByRole("button", { name: "Sign out" }).click();
  await signedOut;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const signedBackIn = page.waitForURL((url) => url.pathname === "/partner", { timeout: 45_000 });
  await page.getByRole("button", { name: "Sign in" }).click();
  await signedBackIn;
  await page.locator('a[href="/partner/products"]').first().click();
  await page.getByRole("heading", { name: "My products" }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("textbox", { name: "Search your products" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.goto(`${origin}/partner/inspiration`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByRole("heading", { name: "Inspiration" }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByLabel("Image or screenshot").waitFor({ state: "visible", timeout: 10_000 });
  const feedbackTrigger = page.locator('summary[aria-label="Send feedback"]').first();
  await feedbackTrigger.click();
  if (!(await page.locator(".pf-feedback-details").evaluate((details) => details.open))) throw new Error("Feedback trigger did not open its panel.");
  const feedbackPopover = page.locator(".pf-feedback-popover");
  await feedbackPopover.waitFor({ state: "visible", timeout: 10_000 });
  await feedbackPopover.locator("#partner-feedback-note").waitFor({ state: "visible", timeout: 10_000 });
  if (!(await feedbackPopover.innerText()).includes(new URL(page.url()).pathname)) throw new Error("Feedback did not capture the current page context.");
  await feedbackTrigger.click();

  const productionSurfaceProductId = process.env.PARTNER_BROWSER_PRODUCTION_SURFACE_PRODUCT_ID;
  if (productionSurfaceProductId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productionSurfaceProductId)) {
      throw new Error("PARTNER_BROWSER_PRODUCTION_SURFACE_PRODUCT_ID must be a product UUID, never a canvas or blank route segment.");
    }
    const reviewId = reviewProductId(`${origin}/partner/review/${productionSurfaceProductId}`);
    await page.goto(`${origin}/partner/review/${reviewId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByRole("heading", { name: "Product workspace" }).waitFor({ state: "visible", timeout: 30_000 });
    const attach = page.getByText("Attach a production blank to this product", { exact: true });
    if (await attach.count()) {
      await attach.waitFor({ state: "visible", timeout: 20_000 });
      await attach.click();
      const imagePath = process.env.PARTNER_BROWSER_PRODUCTION_BLANK_IMAGE;
      if (!imagePath) throw new Error("Set PARTNER_BROWSER_PRODUCTION_BLANK_IMAGE to a temporary transparent PNG fixture.");
      await page.locator('input[name="photo"]').setInputFiles(imagePath);
      for (const [name, value] of Object.entries({ areaX: "20", areaY: "20", areaWidth: "60", areaHeight: "60", printWidth: "3", printHeight: "3" })) {
        await page.locator(`[name="${name}"]`).fill(value);
      }
      await page.locator('[name="confirmBlank"]').check();
      const saved = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/partner/review/${reviewId}`, { timeout: 60_000 });
      await page.getByRole("button", { name: "Save confirmed production surface" }).click();
      await saved;
    }
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByRole("heading", { name: "Product workspace" }).waitFor({ state: "visible", timeout: 30_000 });
    await page.goto(`${origin}/partner/canvas?targetDraft=${productionSurfaceProductId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.getByRole("combobox", { name: "Choose private product draft" }).waitFor({ state: "visible", timeout: 45_000 });
    const selectedDraft = await page.getByRole("combobox", { name: "Choose private product draft" }).locator("option:checked").textContent();
    if (!selectedDraft?.includes("TEMP QA")) throw new Error("Studio did not select the temporary product surface saved from review.");
    await page.locator(".pe-surface-bar").getByText("Front", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    await page.locator(".pe-surface-bar").getByText("Verified production blank", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const activeRegion = page.locator('.pe-surface-bar select[aria-label="Active print area"] option:checked');
    await activeRegion.waitFor({ state: "attached", timeout: 30_000 });
    if ((await activeRegion.textContent()) !== "Print area") throw new Error("Studio did not restore the saved print region.");
    await page.locator(".print-canvas canvas, canvas.lower-canvas").first().waitFor({ state: "visible", timeout: 30_000 });
    console.log(JSON.stringify({ browser: browser.version(), temporaryReview: "opened by UUID", productionBlankForm: "submitted with explicit confirmation and supplied test geometry", persistedReview: "reopened", studio: "selected exact TEMP QA product; Front blank, print region and canvas restored", pageErrors: browserErrors }));
  }

  if (process.env.PARTNER_BROWSER_STUDIO_ONLY === "1") {
    // The Studio-only branch already emitted its bounded result and closed
    // the context; do not run the partner-session or fallback Studio journey.
  } else if (process.env.PARTNER_BROWSER_SESSION_ONLY === "1") {
    console.log(JSON.stringify({
      browser: browser.version(),
      partnerLogin: "passed",
      productsNavigation: "passed",
      refreshRestoredSession: "passed",
      signOut: "passed",
      signBackIn: "passed",
      workspaceReopen: "passed",
      inspirationCaptureSurface: "loaded without uploading test data",
      feedbackCaptureSurface: "opened with page context",
      pageErrors: browserErrors,
    }));
    await context.close();
  } else {
    await page.goto(`${origin}/partner/canvas`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const assetLibraryButton = page.getByRole("button", { name: "Library", exact: true });
    await assetLibraryButton.waitFor({ state: "visible", timeout: 45_000 });
    await assetLibraryButton.click();
    await page.getByPlaceholder("Search elements and fonts").fill("butterfly");
    await page.getByRole("button", { name: "Add Butterfly" }).click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.locator(".pe-layers").getByText("Butterfly", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });

    console.log(JSON.stringify({
      browser: browser.version(),
      partnerLogin: "passed",
      partnerHome: "passed",
      myProductsNavigation: "passed",
      productsHeading: "My products",
      productsSearchControl: "visible",
      creativeLibrarySearch: "found Butterfly",
      studioCanvasInsertion: "Butterfly layer visible",
      pageErrors: browserErrors,
    }));
    await context.close();
  }
  }
} catch (error) {
  console.error(`Partner browser smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  if (imageSmokeName && smokePage) {
    try {
      await smokePage.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 45_000 });
      await smokePage.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      if (compositionSmokeName) {
        const card = smokePage.getByText(compositionSmokeName, { exact: true }).locator("xpath=ancestor::li[1]");
        if (await card.count()) {
          await card.getByRole("button", { name: "Remove", exact: true }).click();
          await smokePage.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000, waitUntil: "commit" });
          await smokePage.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 45_000 });
          await smokePage.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        }
      }
      for (const name of [`${imageSmokeName} (no background)`, imageSmokeName]) {
        const card = smokePage.getByText(name, { exact: true }).locator("xpath=ancestor::li[1]");
        if (await card.count()) {
          await card.getByRole("button", { name: "Remove", exact: true }).click();
          await smokePage.waitForURL(/\/partner\/library\?success=/, { timeout: 30_000, waitUntil: "commit" });
          await smokePage.goto(`${origin}/partner/library`, { waitUntil: "commit", timeout: 45_000 });
          await smokePage.getByRole("heading", { name: "My files", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
        }
      }
      console.error(`Archived temporary Studio image records: ${imageSmokeName} and its cutout, if created.`);
    } catch (cleanupError) {
      console.error(`Temporary image cleanup needs follow-up for ${imageSmokeName}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    }
  }
  if (appLogs) console.error(`Next.js output: ${appLogs.slice(-2500)}`);
  if (browserErrors.length) console.error(`Browser page errors: ${browserErrors.join(" | ")}`);
  if (browserNetworkEvents.length) console.error(`Browser network events: ${browserNetworkEvents.slice(-30).join(" | ")}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
