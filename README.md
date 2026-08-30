# Sweet'Oh Creations OS

Standalone storefront + **shared POD Studio** for NMH ventures (Sweet'Oh partner,
Island Sprouts / NMH creators).

See [`docs/BRAND-TOPOLOGY.md`](./docs/BRAND-TOPOLOGY.md) and [`docs/LAUNCH.md`](./docs/LAUNCH.md).

## Dev

```bash
npm install
cp .env.example .env.local   # fill values
npm run db:migrate
npm run db:seed
npm run db:seed:catalog
npm run dev                  # http://localhost:3002
```

## Surfaces

| Path | Role |
|------|------|
| `/` | Storefront home |
| `/collections` | Category aisles (apparel, kids, home…) |
| `/collections/[slug]` | Products in a category |
| `/products`, `/products/[slug]` | Catalog + PDP |
| `/studio` | Design studio (blank → AI / upload / library / place → mockup → cart) |
| `/create` | Redirects to `/studio` |
| `/cart`, `/checkout` | Commerce |
| `/partner` | Command center (Overview) |
| `/partner/create` | Partner create |
| `/partner/library` | Design library (upload / approve) |
| `/partner/canvas` | Place design on blank → save to library |
| `/partner/review` | Listing decisions |
| `/partner/orders` | Fulfillment |

Partner thesis: [`docs/PARTNER-OPS.md`](./docs/PARTNER-OPS.md).
