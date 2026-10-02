# Studio scale notes

Measured on the production build, locally (`npm run build && npm start -- -p 3003`, then `node scripts/load-test.mjs <scenario>`). Re-measure after big changes. Never aim the load test at production.

| What | Result |
| --- | --- |
| Icon search, every query different (worst case) | 96 req/s, p95 0.7 s (was 28 req/s, p95 2.3 s before the name index and pre-filter) |
| Icon search, realistic repeated queries | 166 req/s, p95 0.34 s |
| Icon file (SVG) | 214 req/s, p95 0.33 s, cached for a year at the edge |
| Editor ready (cold, local) | about 1.0 s |
| Apply a text effect | about 50 ms |
| Quick mockup ready | about 0.7 s |
| JavaScript on first editor load | 585 KB gzipped (3.9 MB raw), 15 files. Budget: keep under 700 KB gzipped |

`E2E_URL=http://localhost:3003 E2E_BUDGETS=1 npm run e2e:studio` fails if editor-ready exceeds 6 s, applying an effect 2.5 s, or a mockup 6 s on a production build.

## What was fixed for scale

- **Icon search** reads a 650 KB name index (`lib/studio/icon-index.json`, rebuilt by `scripts/build-icon-index.ts`; a test fails when it is stale) instead of loading about 25 MB of icon data, pre-filters names with native substring checks, and remembers recent answers per instance.
- **Auth middleware** no longer runs on the public icon, asset, health and error-report routes. A search page fetches dozens of icons; for a signed-in user each one would have cost an auth round trip.
- **Rate limits** (per instance, `lib/shared/rate-limit.ts`): icon search 240 per minute per address, icon files 1500, error reports 20. Add a Vercel Firewall rate-limit rule for the same paths when a hard global limit is needed.
- **Design lists**: the plan-limit check is a SQL count, and the creator home and Skink ask for only recent designs, so a busy creator no longer pays for a signed thumbnail on every saved design on each page load.
- **Heavy work stays off the page thread**: shape combining runs in a worker with a time limit; jsPDF and paper.js load on demand.
- **Uploads** go straight to storage on signed URLs, so file size is not limited by the function request body.

## Watching it in production

- `GET /api/health` (instant) and `GET /api/health?deep=1` (also checks the database, 503 if down) for an uptime monitor.
- Browser errors from the editor are logged as `studio_client_error` lines (rate limited, no account or design content); alert on that string in Vercel logs.

## Known limits and next steps

- Several list pages (`/studio/designs`, `/partner/library`, `/partner/list`) still list every design. They need pagination before a library reaches hundreds.
- Rate limits are per instance. Add a firewall rule for hard limits.
- The icon JSON for a set loads on first use of that set in an instance (a few hundred ms cold).
- No load test yet covers signed-in pages; that needs a test account.
