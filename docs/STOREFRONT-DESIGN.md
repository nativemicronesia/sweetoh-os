# Storefront design language

Brief: `docs/STOREFRONT-BRIEF.md`. This is how the storefront expresses it, and how to extend it without breaking it.

## The idea

SweetOh turns something rough (a photo, a thought, an occasion) into something real. The look is a **proof table**: uncoated paper, press ink, print-process color, registration and crop marks, hard offset shadows. Motion is only ever used to show that transformation: a sketch filling in, a design landing on a surface, one design taking the shape of many objects. It is never decoration.

Not used on purpose: palm trees, hibiscus, sunsets, soft SaaS gradients, glass panels, stock "AI" sparkle. The Micronesian roots show up as **real language** (the greeting set in `lib/shared/island-greetings.ts`), **real place** (the plotted Lacey to islands chart), and **original abstract forms** (bearings, tide, plait). Nothing here copies a traditional or sacred design; keep it that way.

## Tokens (`app/globals.css`)

| Token | Use |
| --- | --- |
| `--so-black` `#f4ecdd` | paper (the page) |
| `--so-surface` `#fbf6ea` | card paper |
| `--so-ink` `#16120d` | press ink: text, borders, shadows, dark sections |
| `--sx-vermilion` / `-deep` | the accent. Use `-deep` for text and small tags (AA contrast) |
| `--sx-reef` `#0d5654` | Studio, depth |
| `--sx-yellow` `#f0c419` | highlights only |
| `--sx-cyan`, `--sx-magenta` | artwork only |

Type: Fraunces (display, WONK on) for voice; Outfit for body; system mono for small "proof labels" (`.sx-mono`, `.so-eyebrow`).

## Components (`app/(store)/storefront.css`)

`sx-h1/h2/h3`, `sx-lede`, `sx-label`, `sx-card` (hard shadow), `sx-chip`, `sx-door`, `sx-ink` (dark section), `sx-paper` (page wrapper), `so-btn-primary/ghost` (press down on click), `sx-pcard`/`sx-tile`/`sx-drop`. Focus is always visible (vermilion ring, set globally). Tap targets are at least 44px.

Scroll reveals go through `<Reveal>`: if script or motion is unavailable (or the visitor prefers reduced motion) content is simply there.

## Imagery

There is no storefront photography yet. Imagery is original geometry (`components/scenes/art.tsx`) fitted onto drawn object forms (`objects.tsx`), so it can honestly show "idea, design, object". The hero (`transform-scene.tsx`), the object shelf (`object-wall.tsx`) and the Studio taste (`studio-demo.tsx`) are the three interactive pieces. When real photos exist, add them beside these, not instead: the sketch-to-print idea is the identity, photos are proof.

## Structure

Five doors, shown on the home page and in the header: **Bring us an idea** (`/custom`), **Studio** (`/design`), **Shop what's ready** (`/collections`), **Make one yours** (`/custom?from=personalize`, also `&product=` from product cards and pages), **What we make** (`/make`). `/studio` stays the creator/partner app and `/create` stays the creator program page; neither is in the storefront nav.

`/design` is honest about access: when the creator side is closed it says Studio is opening soon and offers the waitlist (`/studio/join`) plus "have us design it". When `CREATOR_SIGNUPS=open` the button becomes "Open Studio".

## Adding to it

- New section on a page: wrap in `<Reveal>`, use `sx-section` + `sx-wrap`, one `sx-label` and one `sx-h2`.
- New artwork: add a builder in `art.tsx` (+ clip in `ART_CLIP`), then a chip in `object-wall.tsx` / `studio-demo.tsx`.
- New object: add to `ObjectKind` and `OBJECTS` in `objects.tsx` with its print zone.
- Only add things SweetOh can really make. Anything unfinished stays off the page; `/make` has an honest "Something else: ask" entry instead.

## Tests

`node scripts/e2e/storefront.mjs` (against dev/preview via `STOREFRONT_URL`): every page at 320/390/820/1366/1920 widths for sideways scroll, console errors, one h1; menu, doors, scene, shelf, Studio taste, keyboard focus ring, tap targets, reduced motion; axe (serious/critical) on phone and laptop. `scripts/storefront-shots.mjs` takes screenshots of any pages at three sizes.
