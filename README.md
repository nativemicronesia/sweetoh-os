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
| `/products`, `/products/[slug]` | Catalog + PDP |
| `/create` | Customer AI design → cart |
| `/cart`, `/checkout` | Commerce |
| `/partner` | Studio home (pack by role) |
| `/partner/studio` | Create · Print · Listings |
| `/partner/queue` | Ship |
| `/partner/assist` | Sweet'Oh AI assist |

Partner thesis: [`docs/PARTNER-OPS.md`](./docs/PARTNER-OPS.md).
