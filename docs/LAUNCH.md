# Sweet'Oh Creations — Launch checklist

Companion: [`BRAND-TOPOLOGY.md`](./BRAND-TOPOLOGY.md), [`PARTNER-OPS.md`](./PARTNER-OPS.md).

## Sequencing

1. **Sweet'Oh** launches first (this app) — partner photo → AI → publish first.
2. **Island Sprouts** is refined in parallel and launches soon after.
3. Facebook remains the interim customer shop while the Sweet'Oh storefront hardens.

## Pre-launch (code)

- [x] Product detail page (`/products/[slug]`)
- [x] No dead `/storefront` or `/partner/production-queue` links
- [x] Catalog seed: base POD products + featured collection (`npm run db:seed:catalog`)
- [x] Owner can access partner ops workspace (`requirePartnerWorkspace`)
- [x] Policy pages: privacy, terms, shipping, returns
- [x] Resend gate is Sweet'Oh-only (`isResendConfigured`)
- [ ] Resend credentials in env: `RESEND_API_KEY` + `SWEETOH_FROM_EMAIL`
- [ ] Stripe live/test keys + webhook → `/api/webhooks/stripe`
- [ ] `NEXT_PUBLIC_SITE_URL` = public Sweet'Oh domain (not localhost)
- [ ] Deploy Vercel + domain for Sweet'Oh front door

## Commands

```bash
npm run db:seed              # venture + owner/partner
npm run db:seed:catalog      # launch products + featured
npm run dev                  # http://localhost:3002
```

## Smoke

1. `/` → Create CTA + featured products  
2. `/products` → list → `/products/{slug}` → add to cart  
3. `/create` → design preview → cart (needs ≥1 active base product)  
4. Checkout → Stripe → success → order email (if Resend set)  
5. `/partner/login` → **New from photo** → draft → publish → `/partner/products`  
6. Orders: `/partner/queue` / `/partner/jobs` when fulfillment is needed  

## Explicitly later

- Full owner Command Center (port from Island Sprouts)
- Island Sprouts “room” wiring and cross-venture custom product handoff
- Facebook auto-post API
- Dekaz partner chat
