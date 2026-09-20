# Create with Sweet'Oh

Sweet'Oh has two doors:

- **Shop with Sweet'Oh**: customers buy from the Sweet'Oh Creations shop (`/`, `/collections`).
- **Create with Sweet'Oh**: creators build their own print-on-demand brand with the Sweet'Oh Studio and **Skink**, Sweet'Oh AI (`/create` → `/studio`).

Creators aren't locked in. They send products to **their own** Printify store (and from there to Etsy, Shopify, TikTok Shop and so on), download print files for any printer, or request a print from the Sweet'Oh shop when it has capacity. Sweet'Oh-hosted creator stores (with custom domains and Stripe Connect) are the next phase and aren't built yet.

## Where things live

| Area | Path | Notes |
|---|---|---|
| Landing | `app/(store)/create` | Markets Skink, the Studio and the plans |
| Sign up / in | `app/(creator-auth)/studio/{join,login}` | Account is confirmed immediately (switch on email verification once Resend is wired) |
| Creator Studio | `app/(creator)/studio/*` | Home, Ask Skink, Catalog, Design, My designs, Print requests, My tools, Memory, Plans, Printify & account |
| Editor | `app/(partner)/partner/canvas/product-editor.tsx` | Shared with the partner; `mode="creator"` swaps pricing for **Sell it** |
| Partner view | `/partner/creator-requests` | Separate from shop orders, with an on/off capacity switch |

## Isolation

Each creator gets their **own `venture` row** (their private workspace) plus a `creator` `app_user`. Every existing query is already scoped by `ventureId`, so blanks, designs, uploads and print files stay private to that creator. The Sweet'Oh storefront only ever reads the default venture (`SWEETOH_VENTURE_SLUG`). `/partner` is still partner-only, and the `creator` role has **no** partner permissions (`scripts/verify-create-with-sweetoh.test.ts`).

## Skink (Sweet'Oh AI)

`lib/ai/router.ts` picks a model per **job** and **level**. Creators never choose a model directly.

| Job | Light (Free) | Smart (Creator) | Deep (Pro) |
|---|---|---|---|
| chat | gpt-5.6-luna | gpt-5.6-luna | gpt-5.6-sol |
| reason | gpt-5.6-luna | claude-sonnet-5 | claude-opus-5 |
| research | gemini-3.7-flash | gemini-3.7-flash | gemini-3.1-pro-preview |

- Images use `gpt-image-2.5-flare` by default (`PRODUCT_IMAGE_MODEL` overrides it; `PRODUCT_IMAGE_MODEL_PREMIUM` defaults to Sunburst).
- Conversation runs on **chat**. Skink calls `think_it_through` (→ reason) and `research` (→ research) as tools.
- All providers are called through the OpenAI SDK, using the Anthropic and Gemini OpenAI-compatible endpoints.
- A missing `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` falls back to Luna, so nothing breaks before the keys are set.
- **LiteLLM:** set `AI_BASE_URL` (plus `LITELLM_API_KEY`) and every call goes to the proxy as `sweetoh-<job>-<level>`. `litellmAliases()` prints the alias → model table for the LiteLLM config.

**Memory** (`lib/domains/skink/memory.ts`) is durable private intelligence (brand, goal, decision, correction, and so on), separate from saved conversations (`skink_thread` / `skink_message`). Skink saves with its `remember` tool. Creators edit it at `/studio/memory`.

## What creators are paying for

Sweet'Oh AI is the intelligence layer; **Skink** is the agent creators talk to. Subscribers pay for Skink's help running a print-on-demand business: learning it, setting up **their own** store (Printify, Etsy, Shopify…), finding a niche, designing products, pricing, listings and what to make next. Printing with Sweet'Oh is optional and capped by the partner's capacity.

Sweet'Oh does not try to replace ChatGPT, Claude, Gemini, Canva or Printify. Skink uses them — see **My tools** below.

## My tools (use what the creator already pays for)

`lib/domains/skink/handoff.ts`, `/studio/tools`. A creator says which subscriptions they already have; Skink prepares the exact prompt plus their brand context for that tool (`buildHandoffPack`), they run it there, and paste the result back, which is filed into memory. It costs **no credits**, and Skink can offer it mid-conversation with the `prepare_handoff` tool.

## Plans and credits

`lib/domains/creator/plans.ts`. 1 credit ≈ $0.01 of raw provider cost.

- **Free:** Light model, 50 credits a month, 10 saved designs, Printify send.
- **Creator: $49/month, first 3 months free, card up front** (Stripe `trial_period_days: 90`). Light + Smart routing (Luna, Sonnet, Flash). 1,500 credits a month, 1,000 during the trial.
- **Pro: $111/month, or $666/year (6 months free).** Higher model tiers. 3,500 credits a month.
- **Top-up:** 500 credits for $10.

Chat is metered from real token usage. Studio AI actions are priced per action and refunded if the AI call fails.

## Environment to add before launch

| Variable | Why |
|---|---|
| `ANTHROPIC_API_KEY` | Claude for the reasoning job |
| `GEMINI_API_KEY` | Gemini for the research job |
| `CREATOR_SECRETS_KEY` | Any long random string. Encrypts creators' Printify tokens. Falls back to a key derived from the service-role key if unset; set it before real creators connect, and never change it afterwards |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Live keys |
| `RESEND_API_KEY`, `SWEETOH_FROM_EMAIL` | Transactional email |
| `NEXT_PUBLIC_SITE_URL` | The public domain (Stripe return URLs use it) |

**Stripe webhook** → `/api/webhooks/stripe`, with these events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Prices are sent inline, so no Stripe products need creating. Turn on the **Customer portal** in Stripe for the "Manage billing" button.

## Verify

```bash
npx tsc --noEmit
for t in scripts/*.test.ts; do npx tsx --test "$t"; done
npx next build
```

Then run the browser pass: discover → Create → visitor Skink → sign up → Skink remembers the brand → catalog → design → save → Sell it (download) → sign out and back in → Skink recalls the brand → Plans → Stripe Checkout. A second creator must see none of the first creator's data, and must not be able to reach `/partner`.
