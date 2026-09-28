# Font Awesome Free

A curated set of 54 solid-style icons from Font Awesome Free, adding a
visually distinct filled/silhouette style to the Creative Library — bold
shapes well suited to sublimation and vinyl-cut/screen-printing production,
complementing the existing Feather and Tabler line-icon packs rather than
duplicating them.

## Curation, not a bulk dump

Font Awesome Free ships 2000+ icons across solid/regular/brand styles; this
pack pulls only 54 solid icons chosen for real gift/POD relevance — animals,
food, faith symbols spanning multiple religions (cross, khanda, mosque, om,
place-of-worship — not just one tradition), tools, and everyday objects —
skipping UI chrome and the brand/trademark logo set entirely (Font Awesome's
brand icons are literal company trademarks, a real legal risk for a general
reusable design library regardless of the icon license, the same concern an
earlier scout flagged for a different brand-icon source). See
`fa-assets.json` for the exact list with SweetOh category/tag assignments.

## Rights and provenance

- Source: [FortAwesome/Font-Awesome](https://github.com/FortAwesome/Font-Awesome)
  on GitHub, pinned to commit `840c215f894f429b26b8c1402a65da835dc5a450`
  (6.x branch).
- License: icons are **CC BY 4.0** specifically (not MIT — Font Awesome
  Free's fonts are SIL OFL 1.1 and its code is MIT, but the icon *artwork*
  itself, which is what's bundled here, is CC BY 4.0). Confirmed directly
  from `LICENSE.txt` at the pinned commit, retained in this directory.
  Attribution is required; each asset's `attributionText` field carries the
  required credit, matching how the existing OpenMoji CC BY-SA pack is
  handled.
- `fa-SOURCE-MANIFEST.json` records each asset's original file, source URL
  pinned to the same commit, and SHA-256 hashes of the original and
  normalized SVG. `node scripts/ingest-font-awesome-free.mjs` validates SVG
  safety and shape (the expected 512-tall solid-icon viewBox) and confirms
  each normalized SVG renders before generating the Studio records.
  Original, unmodified files remain in `fa-source/`.
- Normalization only adds `width`/`height` attributes (scaled to a 200px
  tall canvas, preserving each icon's native aspect ratio — Font Awesome
  solid icons are not uniformly square) and `fill="currentColor"` on the
  root `<svg>` so Studio's existing per-layer color controls apply, the same
  approach the Feather pack uses for stroke color. Path data is untouched.
