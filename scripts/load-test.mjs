/**
 * A small load test: fires many requests with limited concurrency and reports
 * throughput and latency percentiles. Point it at a LOCAL server by default
 * (npm run build && npm start -- -p 3003). Do not aim it at production.
 *
 *   node scripts/load-test.mjs icons-search --concurrency 40 --total 2000
 */
const [, , scenarioName = "icons-search", ...rest] = process.argv;
const arg = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : fallback; };
const BASE = arg("base", "http://localhost:3003");
const concurrency = Number(arg("concurrency", 30));
const total = Number(arg("total", 1000));
if (/sweetohcreations\.shop/.test(BASE) && arg("i-mean-it") !== "yes") { console.error("Refusing to load-test production. Use a local server."); process.exit(2); }

const WORDS = ["coffee", "heart", "wave", "palm", "sun", "moon", "fish", "star", "shell", "boat", "tree", "flower", "home", "music", "camera", "gift", "fire", "cloud", "wind", "anchor", "bird", "cat", "dog", "book", "cup", "key", "lock", "map", "pin", "rocket"];
const SETS = "ph,lucide,tabler,heroicons,iconoir,bi,ri,mdi";
const scenarios = {
  // Distinct queries so the CDN cache cannot help: this is the worst case for the server.
  "icons-search": (i) => `/api/studio/icons/search?q=${WORDS[i % WORDS.length]}${Math.floor(i / WORDS.length)}&sets=${SETS}&limit=60`,
  "icons-search-real": (i) => `/api/studio/icons/search?q=${WORDS[i % WORDS.length]}&sets=${SETS}&limit=60&start=${(i % 3) * 60}`,
  "icons-svg": (i) => `/api/studio/icons/ph/${WORDS[i % WORDS.length]}-bold?size=${96 + (i % 7)}`,
  health: () => "/api/health",
  login: () => "/owner/login",
};
const pick = scenarios[scenarioName];
if (!pick) { console.error(`Unknown scenario. Try: ${Object.keys(scenarios).join(", ")}`); process.exit(2); }

const times = [];
let failed = 0, limited = 0, next = 0;
const started = performance.now();
async function worker() {
  while (next < total) {
    const i = next++;
    const t = performance.now();
    try {
      const res = await fetch(BASE + pick(i));
      await res.arrayBuffer();
      if (res.status === 429) limited++;
      else if (!res.ok && res.status !== 404) failed++;
    } catch { failed++; }
    times.push(performance.now() - t);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
const seconds = (performance.now() - started) / 1000;
times.sort((a, b) => a - b);
const q = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(0);
console.log(`${scenarioName}: ${total} requests, ${concurrency} at a time, ${seconds.toFixed(1)}s, ${(total / seconds).toFixed(0)} req/s`);
console.log(`latency ms  p50 ${q(0.5)}  p95 ${q(0.95)}  p99 ${q(0.99)}  max ${times[times.length - 1].toFixed(0)}`);
console.log(`failed ${failed}  rate-limited ${limited}`);
process.exit(failed ? 1 : 0);
