# Partner ops — Sweet'Oh Studio (shared POD network)

Status: **LOCKED** — Studio for partner + venture creators.

## Doctrine

Sweet'Oh is NMH’s **shared POD layer**. Island Sprouts, NMH, and Sweet’Oh itself
**Create → Submit**; the partner **approves → Print → Ship**. Approved products
go live on Sweet’Oh and carry a `brandVentureSlug` for venture site fan-out.

## Who

| Role | Pack | Job |
|------|------|-----|
| **Partner** | `sweetoh_partner` | Print, approve listings, ship |
| **Creator** | `sweetoh_creator` | Create + submit for review |
| **Owner** | partner desk | Same as partner until owner OS |

## Loop

```
Venture creator / partner
    → Studio Create (photo, builder, drafts)
    → Submit for listing (creators) or Publish (partner own)
    → Partner Listings: Pending → Approve / Reject
    → Live on Sweet'Oh + outbox event for brand site
    → Print (any printer) → Ship
```

## Surfaces

| Path | Mode |
|------|------|
| `/partner` | Personalized home |
| `/partner/studio` | Studio hub |
| `/partner/studio/create` | Create door |
| `/partner/studio/print` → `/partner/jobs` | Print queue |
| `/partner/studio/listings` | Pending + drafts + live |
| `/partner/queue` | Ship |
| `/partner/assist` | Sweet'Oh AI (docked help) |

## AI layers

| Layer | Role |
|-------|------|
| Sweet'Oh AI Assist | Help on Create |
| Her agent (avatar) | Reserved — socials later |
| Dekaz | NMH only — not this desk |

## Fan-out

On approve/publish: `listing_outbox` event `product.listing.approved`.
Stub API: `GET /api/integrations/listing-events` (partner/owner).

## Packs

`lib/domains/workspace/packs.ts` — drives nav and home.
