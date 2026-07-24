# Partner ops — Sweet'Oh AI

Status: **LOCKED** — partner-first loop for Sweet'Oh OS v1.

## Who

The Sweet'Oh Creations partner (creator / maker). She already runs the Facebook page and produces custom products. Sweet'Oh OS exists so listing work is easy and her scarce time goes to **production and fulfillment**.

## Loop

```
NMH login
    → Sweet'Oh OS /partner
    → New from photo (visual intake)
    → Sweet'Oh AI prepares draft
    → Review price / title / media
    → Publish (she can publish — no owner gate for v1)
    → Manage products
    → Orders / production queue when sales come in
```

Facebook remains the customer channel for this phase. Catalog in Sweet'Oh is the system of record.

## Surfaces

| Path | Job |
|------|-----|
| `/partner` | Daily desk |
| `/partner/visual-intake` | Photograph item → AI draft |
| `/partner/intelligence` | Text-only AI draft (secondary) |
| `/partner/drafts` | Edit unpublished drafts |
| `/partner/products` | Manage published / catalog |
| `/partner/queue`, `/partner/jobs` | Fulfillment / production |

## AI vs human

| Sweet'Oh AI | Partner |
|-------------|---------|
| Title, description, draft product, attach photo | Confirm price, publish |
| Listing prep from photo + optional notes | Make / print / ship |

## NMH handoff

Configured in NMH OS via `SWEETOH_OS_URL` (or `NEXT_PUBLIC_SWEETOH_OS_URL`). Members of the `sweetoh` venture who are not NMH owners are redirected to `{SWEETOH_OS_URL}/partner` after sign-in. Owners stay in NMH and get a CTA.

Auth: prefer the same credentials she uses in NMH when environments share identity; otherwise she signs into Sweet'Oh partner login with her provisioned account (`FOUNDATION_PARTNER_*` / owner seed).
