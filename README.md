# Sweet'Oh Creations OS

Standalone storefront + ops for **Sweet'Oh Creations** — NMH’s local print-on-demand shop.

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
| `/partner` | Partner desk (NMH handoff lands here) |
| `/partner/visual-intake` | Photo → Sweet'Oh AI draft |
| `/partner/drafts` | Edit + publish drafts |
| `/partner/products` | Manage live catalog |
| `/partner/queue`, `/partner/jobs` | Orders / production |

Partner thesis: [`docs/PARTNER-OPS.md`](./docs/PARTNER-OPS.md).
