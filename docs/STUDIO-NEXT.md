# Studio next: Sweet'Oh's own mockup engine (2D + 3D)

Handoff for the next builder (Astra / Codex). Written 2026-09-19 after the
Printify-style editor landed (`bd06757`).

## The intention, in the owner's words

> Right now we have a Printify-style studio editor. We want our own sauce,
> where we can have 2D and 3D mockups. We transform the Printify style into
> our own style: we find what's best for us, then we build it accordingly.

Read that as: **the Printify-style editor is the baseline, not the finish
line.** Keep its simplicity: catalog → design → preview → price → publish.
Then make the *visualization* ours:

- realistic 2D mockups the partner and customers trust, and
- 3D product views customers can spin,

chosen by what actually works for a **local** print shop in Guam and the FSM
(Micronesia). Don't copy Printify feature for feature.

**Research first, then build.** Compare approaches on real products, show
the owner side-by-side results, pick one, then build it end to end. Don't
ship a half-integrated experiment.

## What exists today (don't rebuild it)

Sweet'Oh is a single-partner local POD shop. Only the partner logs in
(`role === "partner"`); the owner uses NMH OS instead of this app.

| Piece | Where | Notes |
|---|---|---|
| Printify catalog (read only) | `lib/integrations/printify/catalog.ts` | `catalog.read` token only. Blueprints, colors/sizes (union across up to 8 providers), real print areas in px. **Never** use Printify orders, shops or fulfillment. |
| Variant model | `lib/domains/catalog/variants.ts` | Colors (name + hex), sizes, per-size upcharges, `CatalogSource` (brand, model, printAreas, images). Color-name → hex table. |
| Product editor | `app/(partner)/partner/canvas/product-editor.tsx` | Full-screen Fabric.js 6 editor. Views = `StudioSurface` (photo + print area + layers). Properties in inches at 300 DPI, DPI check, fonts, live color mockup strip, preview modal, print export at real print size. |
| Layout schema | `lib/domains/catalog/studio-layout.ts` | `studioLayoutSchema`: surfaces (id, name, position, assetId or `imageUrl` from images.printify.com, `area` as 0–1 fractions of a 720px square canvas) + layers (image / text with font key). **Extend with optional fields only**; saved designs must keep loading. |
| Photo intelligence | `lib/studio/tint.ts` | Browser-side garment mask (flood fill + Sobel edges + chroma), recolor with shading, placeholder/backdrop cleanup on flat shots, `analyzePhoto` scoring, `printAreaInBox`. This is the current "2D mockup engine". |
| Fonts | `lib/studio/fonts.ts` | Layouts store the font **key**, never the generated family name. |
| Save → product | `app/(partner)/partner/actions/library.ts` (`saveCanvasCompositionAction`) | Uploads the composite, per-view images and per-color mockups (`product_media.color`), then creates the draft. |
| Storefront | `app/(store)/components/product-buy.tsx` | Color swatches switch color-tagged mockups; size picker; price with upcharges. |
| Checkout / orders | `lib/integrations/stripe/checkout.ts`, `lib/domains/commerce/service.ts` | Variant per line in Stripe line-item metadata, shipping address (US + GU; FSM/Palau/RMI/CNMI enter as US + state). Orders store color, size and shipping. |

DB: migrations are **hand-written** SQL in `drizzle/` plus a
`meta/_journal.json` entry (drizzle snapshots stop at 0006; don't run
`drizzle-kit generate`). The latest is `0020_pod_variants_shipping`. The live
Supabase DB is the only DB, so keep changes additive and nullable.

## Where the current mockups fall short (your starting problems)

1. **Flat compositing.** The design is pasted flat onto the photo. It
   doesn't follow folds, curve around a mug, or pick up fabric texture and
   lighting. This is the biggest realism gap.
2. **Recolor is heuristic.** Great on flat or ghost shots of white blanks.
   Weak on model shots with dense printed placeholder patterns (it can't
   clean those), and it leaves faint edge artifacts at hems and sleeves.
3. **One photo per view.** Printify's lifestyle shots can't carry the design,
   because each photo would need its own print-area mapping.
4. **No 3D at all.**
5. **Image rights are unverified.** Printify catalog photos are Printify's.
   A long-term engine shouldn't depend on them for final storefront
   mockups. Own templates (her blank photos, licensed packs, or 3D models)
   remove that risk.

## Directions worth evaluating (not decisions)

**2D realism**
- Displacement + shading maps per template: warp the print by a
  displacement map derived from the blank photo, then multiply the photo's
  shading back over it. This is the standard Placeit/Printful-style
  technique. It can run client-side (WebGL shader or canvas) or server-side
  with `sharp`, which is already a dependency.
- A **template format of our own**: photo + garment mask + print-area quad
  (4 corners for perspective) + displacement/shading maps + color-zone mask.
  Author it once per product. Printify photos are only a fallback.
- Perspective (4-point) print areas instead of axis-aligned rectangles, so
  angled lifestyle shots work.

**3D**
- three.js via `@react-three/fiber` + `drei` (`Decal`, `useGLTF`) or
  `<model-viewer>`. The design is applied as a texture or decal on a GLB
  model of each blank. A mug is a cylinder UV and easy; tees and hoodies
  need decent garment models with print-area UVs (source or commission
  them, check licensing).
- 3D doubles as a 2D mockup generator: render fixed camera angles to PNG
  for the storefront gallery.
- Watch performance on the partner's devices and customers' phones (the
  Micronesia connection is often slow): lazy-load 3D, keep 2D as the
  default.

**Decide with evidence:** build a small comparison page (not in the partner
nav) that renders the same design on 2–3 products through each approach.
Screenshot it for the owner. Pick by realism, speed on a phone, authoring
cost per new product, and licensing.

## Non-negotiables

- The partner flow stays simple: catalog → design → preview → price →
  publish. New power goes into the editor and preview; don't add steps.
- Printify is catalog data only.
- Only the partner can use `/partner` (`requirePartnerWorkspace`).
- Don't break saved layouts, variant data, checkout metadata or orders.
  Extend, don't replace.
- Prices and variant validity are enforced server-side (see
  `assertVariantSelection`); anything new at checkout must be too.
- AI features: sweetoh-os calls OpenAI directly today. Long term, chat goes
  through the NMH Dekaz gateway (`.nmh-gateway`, text only for now). Don't
  add new AI providers.

## Working with the owner

- They know exactly the experience they want ("like Printify, but ours") and
  get frustrated by patching, over-explaining and slow progress. **Act, show
  results, ask at most one question when truly blocked.**
- They judge by the whole feel, so rebuild frames or engines properly
  instead of polishing around old ones.
- Their usage budget matters: be efficient and don't re-explore what this
  doc already covers.
- Show before/after screenshots. Say plainly what's verified and what isn't.

## How to verify (proven in this repo)

- `./node_modules/.bin/tsc --noEmit`, `npx tsx --test scripts/*.test.ts`
  (22 passing), `npm run build`, then `npx next start -p 3002`.
- Browser checks with Playwright: log in through `/partner/login` using
  `FOUNDATION_PARTNER_EMAIL` / `FOUNDATION_PARTNER_PASSWORD` from
  `.env.local` and save the storage state. Sessions rotate, so log in fresh
  per run.
- The editor has a long-lived canvas; wait until `.pe-loading` and the
  status toast are gone before screenshots.
- Test data: name it `E2E TEST DELETE ME`, then unpublish/archive products
  (`archiveProduct`) and assets (`archiveAsset`), and delete test orders by
  their fake `stripe_checkout_session_id`. It's the live DB.
- Deploys are **CLI-only** (`vercel --prod` from this repo; git push does
  not deploy). Deploy only when the owner says so.

## State at handoff

- Deployed to production: everything through `6bcb1d5` (variants, colors,
  sizes, shipping).
- Committed but **not deployed**: `bd06757` (the Printify-style editor).
  Confirm with the owner before shipping it or building on top in production.
- Open business items the owner decides: shipping fees (none charged yet),
  Stripe live keys (still test mode).
