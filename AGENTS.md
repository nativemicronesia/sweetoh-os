# Sweet'Oh OS: agent notes

Micronesian-owned local print-on-demand shop, printing in Lacey, Washington
today (Guam and the FSM are the next locations in the works), with a
Printify-style partner back office. Next.js 16 App Router, Supabase Postgres (Drizzle), Stripe, Fabric.js.

**Current mission: read [`docs/STUDIO-NEXT.md`](docs/STUDIO-NEXT.md) first.**
It explains the intention (our own 2D + 3D mockup engine on top of the
Printify-style editor), what already exists, the rules, and how to verify.

Quick rules:
- Printify = catalog data only (`catalog.read`). Never orders or fulfillment.
- `/partner` is for the Sweet'Oh partner only.
- Migrations are hand-written SQL in `drizzle/` plus a journal entry, and
  must stay additive. The live DB is the only DB.
- Verify with typecheck, `npx tsx --test scripts/*.test.ts`, a build, and a
  real browser pass. Clean up test data.
- Deploy only when the owner asks (`vercel --prod`; pushes don't deploy).
- Act and show results; keep questions to the one that truly blocks you.
