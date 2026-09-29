# Wellcome Collection — fungi, lichen and moss engravings

Seven 19th-century engravings of cryptogams (non-flowering plants) —
mushrooms, lichens, and mosses — found via the same Wellcome Collection
catalogue vein as the botanical, marine-life, and insect packs. Fills a
gap the existing `wellcome-botanical-plates` pack (flowering plants only)
didn't cover. The centerpiece is a richly detailed French comparative
mycology chart ("Tableau comparatif des champignons comestibles et
vénéneux") by Hocquart and Perrot, showing dozens of edible and poisonous
mushroom species side by side.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), seven
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-cryptogams.mjs` re-checks this plus the
  IIIF image identity before generating Studio records; the raw API
  response and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
