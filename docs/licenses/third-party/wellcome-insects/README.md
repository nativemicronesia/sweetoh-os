# Wellcome Collection — entomological engravings

Eight 18th/19th-century insect engravings — dragonflies, mayflies,
butterflies, moths, and beetles — found via the same Wellcome Collection
catalogue vein as the botanical, marine-life and embroidery packs. Real
named historical natural-history illustrators and engravers: James Barbut
(entomologist and illustrator, engraved by J. Newton), Thomas Milton,
William Home Lizars, and J. Pass.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), eight
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-insects.mjs` re-checks this plus the IIIF
  image identity before generating Studio records; the raw API response
  and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
