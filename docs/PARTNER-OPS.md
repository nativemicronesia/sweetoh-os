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
    → Create (photo or description)
    → Submit for review (creators) or Publish (partner own)
    → Review: Pending → Approve / Reject
    → Live on Sweet'Oh + outbox event for brand site
    → Orders: Custom jobs on the press → Catalog orders shipped
```

## Surfaces

Command-center layout: sidebar left, persistent Studio chat bar docked above
the workspace (`app/(partner)/partner/layout.tsx`).

| Path | Mode | Roles |
|------|------|-------|
| `/partner` | Overview — prioritized to-do | all |
| `/partner/create` | New piece — photo lane or text lane | all |
| `/partner/review` | Drafts + pending approvals | all (approve = partner/owner) |
| `/partner/orders` | Custom jobs / catalog orders tabs | all |
| `/partner/products` | Live catalog | partner/owner nav |
| `/partner/settings` | Read-only profile + workspace | partner/owner nav |

Retired paths redirect, they do not 404: `/partner/studio*` → Overview/Create/Review,
`/partner/visual-intake` + `/partner/intelligence` → Create, `/partner/design` and
`/partner/assist` → Overview, `/partner/drafts[/id]` → `/partner/review[/id]`,
`/partner/jobs` → Orders (Custom), `/partner/queue[/id]` → Orders (Catalog).

## AI layers

| Layer | Role |
|-------|------|
| Studio chat (`lib/domains/studio-chat/`) | Persistent chat bar — same actions as the buttons, via tool calling |
| Her agent (avatar) | Reserved — socials later |
| Dekaz | NMH only — not wired to this desk |

### Studio chat

Sweet'Oh's own chat, standalone. Structured like nmh-os's Dekaz
(`provider.ts` env-driven base-URL swap, `conversation.ts` bounded tool loop)
so pointing it at a shared Dekaz endpoint later is config, not a rewrite —
set `AI_BASE_URL` (and optionally `STUDIO_CHAT_MODEL` / `LITELLM_API_KEY`).
Routes: `POST /api/studio-chat` (JSON), `POST /api/studio-chat/stream` (SSE).

Tools wrap existing operations only. Write tools call the same role-checked
core functions the buttons call — `lib/domains/catalog/partner-listings.ts`
and `lib/domains/fulfillment/partner-jobs.ts` — so chat can never exceed what
the signed-in role could click. Creators are not given `publish_draft` or
`reject_draft` at all, and those functions refuse creators regardless.

## Fan-out

On approve/publish: `listing_outbox` event `product.listing.approved`.
Stub API: `GET /api/integrations/listing-events` (partner/owner).

## Packs

`lib/domains/workspace/packs.ts` — drives nav and home.
