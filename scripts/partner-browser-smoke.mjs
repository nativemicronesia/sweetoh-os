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
const origin = `http://127.0.0.1:${port}`;
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
    { name: "Outfit", axes: undefined },
    { name: "Fraunces", axes: ["SOFT", "opsz"] },
  ];
  return Object.fromEntries(fonts.map(({ name, axes }) => {
    const url = getGoogleFontsUrl(name, getFontAxes(name, ["variable"], ["normal"], axes), "swap");
    const css = `@font-face { font-family: '${name}'; font-style: normal; font-weight: 100 900; font-display: swap; src: url(https://fonts.gstatic.com/s/sweetoh-browser-smoke-${name.toLowerCase()}.woff2) format('woff2'); unicode-range: U+0000-00FF; }`;
    return [url, css];
  }));
}

async function portAvailable(candidate) {
  const server = createServer();
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(candidate, "127.0.0.1", () => server.close(() => resolve(true)));
  });
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
  if (!await portAvailable(port)) throw new Error(`Port ${port} is already in use. Set PARTNER_BROWSER_PORT to an unused local port.`);
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

  const productsLink = page.locator('a[href="/partner/products"]').first();
  await productsLink.waitFor({ state: "visible", timeout: 20_000 });
  await productsLink.click();
  await page.waitForURL((url) => url.pathname === "/partner/products", { timeout: 30_000 });
  await page.getByRole("heading", { name: "My products" }).waitFor({ state: "visible", timeout: 20_000 });
  await page.getByRole("textbox", { name: "Search your products" }).waitFor({ state: "visible", timeout: 10_000 });

  console.log(JSON.stringify({
    browser: browser.version(),
    partnerLogin: "passed",
    partnerHome: "passed",
    myProductsNavigation: "passed",
    productsHeading: "My products",
    productsSearchControl: "visible",
    pageErrors: browserErrors,
  }));
  await context.close();
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
