# Feather Icons

A curated, engraving-appropriate subset of Feather Icons — clean single-stroke
line icons that fill a real gap in the Creative Library. SweetOh's two
confirmed shop production methods are sublimation and engraving; engraving
needs simple, clean single-color line art (no fills, no fine detail that
would blur when etched), and the library had almost nothing purpose-built for
that until this pack.

## Curation, not a bulk dump

Feather ships ~287 icons; most (chevrons, alignment controls, UI chrome like
`menu`/`x`/`toggle-*`) are interface controls, not printable designs, and
several concepts (anchor, book, briefcase, camera, coffee, compass, gift,
heart, moon, music, scissors, sun/sunrise/sunset, wind) already exist in the
same clean-line style via the Tabler pack already in this library. Only the
49 icons that add a genuinely new subject or fill a real gap (nautical,
weather, geometric frame shapes, occupation/hobby symbols, everyday objects)
were selected. See `feather-assets.json` for the exact list with SweetOh
category/tag assignments.

## Rights and provenance

- Source: [feathericons/feather](https://github.com/feathericons/feather) on
  GitHub, pinned to commit `3dc050d97405062eba78aa57115c0a15c63abdaa`.
- License: [MIT License](https://opensource.org/license/mit/), copyright (c)
  2013-2023 Cole Bemis. The full license text is retained in `LICENSE` in
  this directory, matching how the existing Tabler Icons MIT pack is
  recorded. MIT permits commercial use, modification and redistribution and
  only requires the copyright and permission notice to accompany copies —
  satisfied by keeping `LICENSE` in the repository, mirrored in each asset's
  `attributionText` field for the Studio registry's own record-keeping.
- `feather-SOURCE-MANIFEST.json` records each asset's original file, source
  URL pinned to the same commit, and SHA-256 hashes of the original and
  normalized SVG. `node scripts/ingest-feather-icons.mjs` validates SVG
  safety and shape (24x24 viewBox, `currentColor` stroke) and confirms each
  normalized SVG renders before generating the Studio records. Original,
  unmodified files remain in `feather-source/`.
- Normalization only resizes the `width`/`height` attributes from 24 to 200
  (matching the Tabler pack's convention); the `viewBox` and all path data
  are untouched, and `stroke="currentColor"` is kept as-is so Studio's
  existing per-layer color controls apply, exactly as the Tabler pack does.
