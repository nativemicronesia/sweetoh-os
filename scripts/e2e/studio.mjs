/**
 * Browser smoke tests for the Studio editor, run against /studio-lab (a logged-out
 * editor that exists only when STUDIO_LAB=1).
 *
 *   STUDIO_LAB=1 npm run dev          # terminal 1
 *   npm run e2e:studio                # terminal 2   (E2E_URL, CHROME_PATH optional)
 *
 * Each scenario loads a fresh editor, drives it like a person would, and fails on
 * any console error or wrong result.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.E2E_URL ?? "http://localhost:3002";
const PORT = 9400 + Math.floor(Math.random() * 400);
const CHROME = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => p && existsSync(p));
if (!CHROME) { console.error("No Chrome found. Set CHROME_PATH."); process.exit(2); }

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${PORT}`, "--window-size=1440,900", `--user-data-dir=/tmp/studio-e2e-${PORT}`, "about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());

let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(500); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page"); } catch { /* starting */ } }
if (!target) { console.error("Chrome did not start."); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
let errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  // The editor warns before leaving with unsaved work; a test reload just accepts.
  if (d.method === "Page.javascriptDialogOpening") send("Page.handleJavaScriptDialog", { accept: true });
  if (d.method === "Runtime.exceptionThrown") errors.push("EXC " + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).split("\n")[0]);
  if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("CONSOLE " + d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
};
const send = (method, params = {}) => new Promise((r) => { const id = ++nextId; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error("page script failed: " + (r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text));
  return r.result?.result?.value;
};
const mouse = (type, x, y, extra = {}) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, ...extra });
const click = async (x, y) => { await mouse("mouseMoved", x, y); await mouse("mousePressed", x, y, { buttons: 1 }); await mouse("mouseReleased", x, y); await sleep(350); };
const drag = async (x1, y1, x2, y2) => {
  await mouse("mouseMoved", x1, y1); await mouse("mousePressed", x1, y1, { buttons: 1 });
  for (let i = 1; i <= 8; i++) { await mouse("mouseMoved", x1 + ((x2 - x1) * i) / 8, y1 + ((y2 - y1) * i) / 8, { buttons: 1 }); await sleep(20); }
  await mouse("mouseReleased", x2, y2); await sleep(400);
};
const waitFor = async (expression, what, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await ev(expression).catch(() => false)) return; await sleep(200); }
  throw new Error(`Timed out waiting for ${what}`);
};
const button = (label, scope = "document") => `[...${scope}.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
const rail = (label) => `[...document.querySelectorAll('.pe-rail button')].find((b) => b.textContent.includes(${JSON.stringify(label)}))`;
const heading = () => ev("document.querySelector('.pe-props-head h2')?.textContent ?? ''");

async function fresh(clear = true) {
  await send("Page.navigate", { url: `${BASE}/studio-lab` });
  await waitFor("!!document.querySelector('.pe-canvas canvas') && !document.querySelector('.pe-loading')", "the editor to load", 90000);
  if (clear) { await ev("localStorage.clear()"); }
  await sleep(500);
}

const results = [];
async function scenario(name, run) {
  errors = [];
  try {
    await run();
    const real = errors.filter((e) => !/favicon|Failed to load resource|React DevTools|Download the/.test(e));
    if (real.length) throw new Error("console errors: " + real.slice(0, 3).join(" | "));
    results.push([name, true]);
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push([name, false, error.message]);
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}
const eq = (actual, expected, what) => { if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); };
const has = (text, part, what) => { if (!String(text).includes(part)) throw new Error(`${what}: expected to include ${JSON.stringify(part)}, got ${JSON.stringify(String(text).slice(0, 200))}`); };

console.log(`Studio browser tests against ${BASE}/studio-lab`);

await scenario("text effect: gold foil on new text", async () => {
  await fresh();
  await ev(`${rail("Text")}.click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('.pe-seg button')].find((b) => b.textContent === 'Effects').click()`); await sleep(1800);
  await ev(`[...document.querySelectorAll('.fxg-card')].find((b) => b.getAttribute('aria-label').startsWith('Gold foil')).click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Text'", "text to be added");
  has(await ev("document.querySelector('.fx-controls')?.textContent"), "Foil", "effect name");
});

await scenario("text shape: wave", async () => {
  await fresh();
  await ev(`${rail("Text")}.click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('.pe-seg button')].find((b) => b.textContent === 'Effects').click()`); await sleep(1800);
  await ev(`[...document.querySelectorAll('.fxg-card')].find((b) => b.getAttribute('aria-label').startsWith('Wave')).click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Text'", "text to be added");
  has(await ev("[...document.querySelectorAll('.fx-controls')].map((e) => e.textContent).join(' ')"), "Wave", "shape name");
});

await scenario("icons: search and add a recolorable icon", async () => {
  await fresh();
  await ev(`${rail("Elements")}.click()`); await sleep(600);
  await ev(`[...document.querySelectorAll('.el-tabs button')].find((b) => b.textContent.trim().startsWith('Icons')).click()`); await sleep(500);
  await ev(`(() => { const i = document.querySelector('.el-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'coffee'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await waitFor("document.querySelectorAll('.el-grid button.el-add').length > 3", "icon results", 90000);
  await ev(`document.querySelectorAll('.el-grid button.el-add')[1].click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Icon'", "icon to be added");
});

await scenario("pen tool: draw, close, edit points, done", async () => {
  await fresh();
  await ev(`${rail("Shapes")}.click()`); await sleep(500);
  await ev(`${button("Pen tool (P)")}.click()`); await sleep(400);
  await click(650, 260); await drag(800, 250, 880, 210); await click(880, 420); await drag(700, 520, 640, 480); await click(650, 262);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Vector path'", "a closed path layer");
  await ev(`${button("Edit points")}.click()`);
  await waitFor("!!document.querySelector('.pe-vector-bar')", "the point editor");
  await drag(800, 250, 760, 330);
  await ev(`${button("Done", "document.querySelector('.pe-vector-bar')")}.click()`);
  await waitFor("!document.querySelector('.pe-vector-bar')", "the editor to close");
  eq(await heading(), "Vector path", "selection after editing");
});

await scenario("shapes: subtract one from another, then export a real SVG", async () => {
  await fresh();
  await ev(`window.__svg = null; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { if (b && b.type === 'image/svg+xml') b.text().then((t) => (window.__svg = t)); return o(b); };`);
  await ev(`${rail("Shapes")}.click()`); await sleep(500);
  for (const label of ["Square", "Circle"]) { await ev(`[...document.querySelectorAll('.pe-shapes button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`); await sleep(1300); }
  await drag(766, 380, 836, 420);
  await drag(560, 200, 975, 520);
  await waitFor(`!!${button("Subtract")}`, "the combine buttons");
  await ev(`${button("Subtract")}.click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Vector path'", "the combined path", 30000);
  await ev("document.querySelector('details summary')?.click()"); await sleep(300);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find((b) => b.textContent.includes('SVG')).click()`);
  await waitFor("!!window.__svg", "the SVG file");
  const svg = await ev("window.__svg");
  has(svg, "<path", "svg has vector paths");
  has(svg, 'viewBox="', "svg viewBox");
  if (/<text|<image|<script/.test(svg)) throw new Error("svg contains non-vector content");
});

await scenario("shapes that touch exactly can be combined without freezing the page", async () => {
  await fresh();
  await ev(`${rail("Shapes")}.click()`); await sleep(500);
  // A circle inscribed in a square: the case that makes a naive boolean loop forever.
  for (const label of ["Square", "Circle"]) { await ev(`[...document.querySelectorAll('.pe-shapes button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`); await sleep(1300); }
  await drag(560, 200, 975, 520);
  await waitFor(`!!${button("Subtract")}`, "the combine buttons");
  await ev(`${button("Subtract")}.click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Vector path'", "the combined path", 30000);
  // The page stayed responsive the whole time.
  eq(await ev("1 + 1"), 2, "page responds");
});

await scenario("quick mockups: design on a product, downloadable", async () => {
  await fresh();
  await ev(`window.__png = 0; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = (b) => { if (b && b.type === 'image/png') window.__png = b.size; return o(b); };`);
  await ev(`${rail("Text")}.click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('.pe-seg button')].find((b) => b.textContent === 'Effects').click()`); await sleep(1800);
  await ev(`[...document.querySelectorAll('.fxg-card')].find((b) => b.getAttribute('aria-label').startsWith('Gold foil')).click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Text'", "text to be added");
  await ev(`${rail("Mockups")}.click()`);
  await waitFor(`(() => { const b = ${button("Download", "document.querySelector('.mk')")}; return b && !b.disabled; })()`, "the mockup to be ready", 30000);
  // The preview actually shows a garment with artwork: it has plenty of drawn pixels.
  const drawn = await ev(`(() => { const c = document.querySelector('.mk-canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n / (d.length / 4); })()`);
  if (!(drawn > 0.9)) throw new Error(`mockup preview looks empty (${drawn})`);
  await ev(`[...document.querySelectorAll('.mk .pe-seg button')].find((b) => b.textContent === 'Hoodie').click()`); await sleep(800);
  await ev(`${button("Download", "document.querySelector('.mk')")}.click()`);
  await waitFor("window.__png > 20000", "a real PNG file", 30000);
});

await scenario("autosave: work survives a reload", async () => {
  await fresh();
  await ev(`${rail("Shapes")}.click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('.pe-shapes button')].find((b) => b.textContent.trim() === 'Heart').click()`);
  await waitFor("document.querySelector('.pe-props-head h2')?.textContent === 'Shape'", "the shape");
  await waitFor("Object.keys(localStorage).some((k) => k.startsWith('sweetoh:draft:'))", "an autosaved draft", 20000);
  await send("Page.navigate", { url: `${BASE}/studio-lab` });
  await waitFor("!!document.querySelector('.pe-canvas canvas') && !document.querySelector('.pe-loading')", "the editor to reload", 90000);
  await waitFor(`!!${button("Restore it")}`, "the restore prompt");
  await ev(`${button("Restore it")}.click()`);
  await ev(`${rail("Layers")}.click()`);
  await waitFor("document.querySelectorAll('.pe-layer-select').length >= 1", "the restored layer");
});

const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
chrome.kill();
process.exit(failed.length ? 1 : 0);
