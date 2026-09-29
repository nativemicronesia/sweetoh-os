# Wellcome Collection — bird engravings

Eight 18th/19th-century bird engravings, found via the same Wellcome
Collection catalogue vein as the other Wellcome packs. A genuinely
on-brand gap for SweetOh's ocean/island identity: a common tropic bird
perched on an ocean rock with waves breaking below (tropicbirds nest on
Pacific islands and are a natural fit for the brand), a racket-tailed
kingfisher plate with vivid iridescent color, a parrot in a rainforest, a
cockatoo, a second kingfisher, two herons, and a swallow in flight.

A related "bird of paradise," "albatross" and "hummingbird" search on the
same catalogue surfaced nothing usable (no results, or unrelated matches
like manuscript letter collections) — not every promising query yields
real candidates, and none were forced.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), eight
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-birds.mjs` re-checks this plus the IIIF
  image identity before generating Studio records; the raw API response
  and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
