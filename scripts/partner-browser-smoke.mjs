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
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const port = Number(process.env.PARTNER_BROWSER_PORT ?? 3025);
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
    server.listen(candidate, "127.0.0.1", () => server.close(() => resolve(true)));
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
let tempDir;
let appLogs = "";
const browserErrors = [];

try {
  const executablePath = chromeExecutable();
  const portCheck = await portAvailable(port);
  if (portCheck !== true) throw new Error(`Port ${port} is unavailable (${portCheck}). Set PARTNER_BROWSER_PORT to an unused local port.`);
  tempDir = await mkdtemp(path.join(os.tmpdir(), "sweetoh-partner-browser-"));
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
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(`${origin}/partner/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator("form.login-form").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  try {
    await page.waitForURL((url) => url.pathname === "/partner", { timeout: 45_000 });
  } catch {
    const loginError = await page.locator('[role="alert"]').allTextContents().then((items) => items.join(" ").trim()).catch(() => "");
    throw new Error(loginError ? `Partner login was rejected: ${loginError}` : `Partner login did not reach /partner (current path ${new URL(page.url()).pathname}).`);
  }

  if (process.env.PARTNER_BROWSER_STUDIO_ONLY === "1") {
    // Exercise Studio directly. The home page performs several unrelated
    // operational queries and can be slow in a cold local browser session.
    // This read-only path adds one asset to the in-memory canvas, checks it in
    // Layers, then undoes it before leaving; it never saves partner data.
    await page.goto(`${origin}/partner/canvas`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const assetLibraryButton = page.getByRole("button", { name: "Asset library", exact: true });
    await assetLibraryButton.waitFor({ state: "visible", timeout: 90_000 });
    await assetLibraryButton.click();
    const search = page.getByPlaceholder("Search elements and fonts");
    await search.fill("tropical leaf");
    const assetButton = page.getByRole("button", { name: "Add Tropical leaf", exact: true });
    await assetButton.waitFor({ state: "visible", timeout: 30_000 });
    await assetButton.click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.locator(".pe-layers");
    await layers.getByText("Tropical leaf", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
    const undo = page.getByRole("button", { name: /undo/i });
    await undo.waitFor({ state: "visible", timeout: 10_000 });
    await undo.click();
    await layers.getByText("Tropical leaf", { exact: true }).waitFor({ state: "detached", timeout: 15_000 });
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
      creativeLibrarySearch: "found Tropical leaf",
      studioInsertion: "layer appeared",
      history: "undo removed the inserted layer",
      inspection,
      pageErrors: browserErrors,
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

  if (process.env.PARTNER_BROWSER_SESSION_ONLY === "1") {
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
    const assetLibraryButton = page.getByRole("button", { name: "Asset library", exact: true });
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
  if (appLogs) console.error(`Next.js output: ${appLogs.slice(-2500)}`);
  if (browserErrors.length) console.error(`Browser page errors: ${browserErrors.join(" | ")}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  await stopProcess(app);
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}
