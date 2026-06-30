# Product Intelligence Engine (PIE)

A Dekaz capability. Currently implemented inside `island-sprouts-os` as a
temporary home — **this folder is written as if it already belongs in**
**`dekaz/modules/intelligence/product-engine/`** in the Dekaz repository.

## Isolation rules (do not violate)

- Zero imports from `@/lib/...` or anything else in `island-sprouts-os`.
- **Avoid Sweet'Oh-specific naming** and use **generic PIE naming** in identifiers,
  env vars, schema names, and public API symbols. Venture branding belongs in host
  persona adapters (`sweetoh-ai.ts`), not in this module.
- Zero venture-specific business logic (no category enums, fulfillment types, or
  venture slugs).
- All config read from its own `DEKAZ_*` env vars (see `.env.example`
  in this folder), even though today those vars point at the same
  Supabase project Island Sprouts uses.
- All npm dependencies used here (`drizzle-orm`, `postgres`, `openai`,
  `@supabase/supabase-js`) are already dependencies of the host repo —
  using them is fine; importing host repo *code* is not.

Verify isolation at any time: `grep -r "@/lib" modules/intelligence/product-engine` should return nothing.

## What it is

PIE identifies a product's type from a photo and matches it to a
reusable mockup **Template** — a human-defined set of printable
regions for that product type, defined once and reused forever after.

V1 deliberately does **not** do automatic placement detection. That's
future scope, once there's a real corpus of templates to learn from.

## Flow

```
1. Upload a photo
2. AI identifies product_type (vision call, no placement guessing)
3. Look up an existing Template for that product_type
   - found  -> return it, no human step needed
   - not found -> a human defines placement_regions / safe_zones /
                  printable_areas on the uploaded photo once
4. Save the (new or matched) Template
5. The Template lives in the shared product_intelligence_assets table
   -- the Product Intelligence Library -- reusable by any future
   consumer venture AI.
```

## Consuming this module

Import only from `index.ts`. Nothing else in this folder is public
API. Host venture adapters call `runProductIntake()` via
`ProductIntelligencePort` and handle the two possible outcomes: template
matched, or template needed.

## Future extraction

When approved for extraction: copy this folder to
**`dekaz/modules/intelligence/product-engine/`** (preserve paths and file
contents), point `DEKAZ_*` env vars at Dekaz infrastructure, update the
host adapter import. **No major refactoring** inside this folder for the
move — if internals must change, isolation was broken earlier.

Full requirement: [docs/specs/DEKAZ-PIE-EXTRACTION-REQUIREMENT.md](../../docs/specs/DEKAZ-PIE-EXTRACTION-REQUIREMENT.md) — **no extraction yet**.
