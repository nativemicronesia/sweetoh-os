# Wellcome Collection — hand-coloured botanical engravings

Fifteen individual hand-coloured botanical engravings (18th–19th century),
each a single named plant specimen plate, found via the same Wellcome
Collection catalogue search vein as the embroidery-sprigs pack. Real named
historical botanical illustrators: William Curtis (founder of *Curtis's
Botanical Magazine*), James Sowerby, Henry Cranke Andrews, Franz Anton von
Scheidl, and Johann Michael Seligmann.

## Why fifteen individual plants rather than one themed subset

Unlike the embroidery sprigs (one coherent five-plate set from a single
publication), these are independent standalone works spanning several
different historical botanical publications and illustrators. Wellcome's
catalogue search for `"Coloured engraving" flowering stem` returned 357
results; fifteen were selected for genuine visual/botanical variety
(flowers, a succulent, a fruiting plum, a houseplant) and individually
confirmed CC0-equivalent PDM rather than trusting the search result set
wholesale. ~340 more candidates in the same search remain unverified — a
reasonable lead for a future batch, not a claim that this pack is
exhaustive.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), fifteen
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-botanical-plates.mjs` re-checks this plus
  the IIIF image identity before generating Studio records; the raw API
  response and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
