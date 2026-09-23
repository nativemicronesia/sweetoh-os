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
| Sweet'Oh AI (`lib/domains/studio-chat/`) | Skink in her back office — same actions as the buttons, plus memory, research and reasoning |
| Her agent (avatar) | Reserved — socials later |
| Dekaz router (`lib/ai/router.ts`) | How every AI call is made — shared with nmh-os |

### Sweet'Oh AI (partner)

Skink, for the partner (creators get their own Skink in /studio when that
opens). Every model call goes through the Dekaz router, `lib/ai/router.ts` —
kept identical to nmh-os's — which asks for a job at a level (chat, reason via `think_it_through`,
research via `research`). Every job runs on OpenAI. Her memories live in
`creator_memory` under her user id (private to her). Not metered — it's her
shop. Set `AI_BASE_URL` (+ `LITELLM_API_KEY`) to send everything through
LiteLLM as `dekaz-<job>-<level>`.
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
