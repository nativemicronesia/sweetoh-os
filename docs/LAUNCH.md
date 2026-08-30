# Sweet'Oh Creations — Launch checklist

Companion: [`BRAND-TOPOLOGY.md`](./BRAND-TOPOLOGY.md), [`PARTNER-OPS.md`](./PARTNER-OPS.md).
NMH build surface: `nmh-os` → `/canvas/web` (Dekaz Web Build Studio) — see `nmh-os/docs/dekaz-web-studio.md`.

## Sequencing

1. **Sweet'Oh** launches first (this app) — partner photo → AI → publish first.
2. **Island Sprouts** is refined in parallel and launches soon after.
3. Facebook remains the interim customer shop while the Sweet'Oh storefront hardens.
4. **Storefront polish** can run from NMH `/canvas/web` (chat Dekaz → Cursor mission → preview) or Cursor directly.

## Pre-launch (code)

- [x] Product detail page (`/products/[slug]`)
- [x] No dead `/storefront` or `/partner/production-queue` links
- [x] Catalog seed: base POD products + featured collection (`npm run db:seed:catalog`)
- [x] Owner can access partner ops workspace (`requirePartnerWorkspace`)
- [x] Policy pages: privacy, terms, shipping, returns
- [x] Resend gate is Sweet'Oh-only (`isResendConfigured`)
- [x] Dedicated Supabase project (`sweetoh-os`) + migrations applied (local dogfood)
- [x] Partner login is public (`app/(partner-auth)/partner/login`) — not behind partner layout
- [x] NMH Dekaz Web Build Studio points at this app via `SWEETOH_OS_URL`
- [ ] Resend credentials in env: `RESEND_API_KEY` + `SWEETOH_FROM_EMAIL`
- [ ] Stripe live/test keys + webhook → `/api/webhooks/stripe`
- [ ] `NEXT_PUBLIC_SITE_URL` = public Sweet'Oh domain (not localhost)
- [ ] Deploy Vercel + domain for Sweet'Oh front door

## Commands

```bash
npm run db:seed              # venture + owner/partner/creator
npm run db:seed:catalog      # launch products + featured
npm run dev                  # http://localhost:3002
```

DATABASE_URL must use the **session** pooler (`aws-0-…pooler.supabase.com:5432`) for migrations;
transaction mode (`:6543`) is fine for the app at runtime.

## Smoke

1. `/` → Create CTA + featured products  
2. `/products` → list → `/products/{slug}` → add to cart  
3. `/studio` → blank → AI / upload / library / place → mockup → cart (blank-aware composite; Place keeps canvas layout)  
4. Checkout → Stripe → success → order email (if Resend set)  
5. `/partner/login` → Overview → `/partner/create` → `/partner/review` → publish/submit  
6. Storefront: `/collections` → Kids / Apparel / … → product grid  
7. `/partner/library` → upload / approve → `/partner/canvas` place+rotate → save  
8. `/partner/create` photo → draft + design appears in library → Studio Place mode  
9. Studio chat bar: "what's waiting on me?" (read), then a real write; confirm it lands in the DB  
10. From NMH: `/canvas/web` → attach brand ref → chat Dekaz → mission on `sweetoh-os`  
11. Orders: `/partner/orders` (Catalog and Custom tabs) when fulfillment is needed  

## Explicitly later

- Full owner Command Center (port from Island Sprouts)
- Island Sprouts “room” wiring and cross-venture custom product handoff
- Facebook auto-post API
- Dekaz partner chat (her desk) — distinct from NMH Web Build Studio
