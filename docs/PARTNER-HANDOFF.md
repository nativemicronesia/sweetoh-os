# Partner workspace handoff

## Start here

Sign in at `/partner/login`. The account must already have an active `app_user`
assignment with the partner or owner role; ordinary customer signup does not grant access.

1. **Create** opens Product Builder. Choose **Research a blank** or **List a finished product**.
2. Upload a photo, optionally add a supplier link or a label/model hint. AI searches
   sources and prepares a draft. Turn AI off to enter your own name and notes.
3. Check the match, source links, and unknown details. Confirm the product.
4. For a blank, generate a clean preview if useful, then open **Design studio**.
5. Choose library artwork, upload your own, or generate artwork. Position/rotate it,
   add a text layer, and set the print area against your physical item.
6. Save an editable composition to your library, or check **Save as product draft**.
7. In Review, edit the listing and price, then publish when ready. Blanks remain private.

## AI behavior and costs

- Research uses OpenAI Responses with web search and image input. Only retrieved
  source URLs are retained as evidence for specifications. One research workflow
  uses two model requests: a cited research report, then a structured product draft.
- Generated blank images are visual previews edited from the reference photo;
  they are not certified manufacturer mockups or print-production dimensions.
- External product pages are research sources. Their images are not automatically
  copied or licensed. Use your own or permitted supplier photography for exact imagery.
- The same photo + inputs reopens saved research without another AI call.
- New builder research, blank generation and artwork generation reserve a durable
  allowance in the existing audit log, default 40 requests per user per rolling day.
  Failed provider attempts count too. Identical requests have a three-minute retry guard.
- Existing Studio chat and older creator tools have separate behavior; the builder
  allowance is not a global OpenAI spending cap.
- Optional settings: `PRODUCT_RESEARCH_MODEL` (default `gpt-4.1`),
  `PRODUCT_IMAGE_MODEL` (default `gpt-image-1`), `PARTNER_AI_DAILY_LIMIT` (default `150`).
  Existing `OPENAI_API_KEY` is used. These model capabilities must be available to the account.

## Customer launch boundary

Customer Studio is deferred. Its public page is informational, and generation,
design-to-cart, and transcription actions require a partner/owner session.
Anonymous mascot questions return a local response without a model call.
No Facebook order-entry screen is added.

## Storage and verification

Uses the existing product, asset, AI-session and audit tables. No new migration is
required; existing migrations through 0019 must be applied. Composition text is
stored inside the existing JSON composition layout.

Required storage: `design-library` and `product-media`, plus existing Supabase
credentials. `next.config.ts` accepts image forms up to 12 MB; per-image validation
remains 10 MB.

Run `npx tsx --test scripts/verify-partner-builder.test.ts`, TypeScript checking,
and the production build. Before partner handoff, exercise one real product photo,
source matching, image generation, save/reopen, and a private listing draft with
her actual account. Never infer photographic accuracy from a successful API response.

Verified in development: production build, TypeScript, seven research/price/role
tests, and browser checks for mobile layout, text-save payload, product-draft
export intent, and exclusion of print-area guides from exported images.
Real partner-session checks passed login, manual private product creation,
confirmation, saving a $29.95 price, and paid blank-image generation. No product
was published. Real canvas checks also passed text-only artwork creation, saving
and reopening an editable composition, and creating a private product draft. No order
was placed. Private verification records are clearly
named and are not sale inventory. Required database columns and storage buckets
are present. Deployment and remote partner login have not been verified; the
running local workspace is at http://localhost:3002/partner/login.

The canvas currently supports one artwork layer plus editable text, not full
Canva-style multilayer editing. Supplier image import/licensing is not automated.

Implementation references: [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)
and [image generation](https://developers.openai.com/api/docs/guides/image-generation).
