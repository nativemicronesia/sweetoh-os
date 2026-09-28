# Wellcome Collection — marine life engravings

Six 18th/19th-century marine-life engravings — sea urchin, starfish, octopus,
cuttlefish, coral, a coconut crab, sea anemones — found via the same
Wellcome Collection catalogue vein as the botanical and embroidery packs.
Deliberately pursued given SweetOh's own ocean-motif brand identity; the
Creative Library had almost no genuine scientific marine-illustration
coverage before this (only a handful of emoji/clipart-style sea creatures).

Three are colored engravings (sea urchin/starfish/octopus/cuttlefish by
William Home Lizars; the coconut crab; a busy 1806 natural-history plate by
Heath showing corals, a narwhal, and two Murex shells alongside unrelated
birds/fish); three are plain wood engravings (sea-anemone/aquarium subjects),
giving real stylistic range within the theme.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), six
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-marine-life.mjs` re-checks this plus the
  IIIF image identity before generating Studio records; the raw API
  response and IIIF `info.json` for each work are preserved in `records/`.
- The "corals-narwhal-natural-history" plate is a busy period encyclopedia
  page (Richard Phillips, 1806) mixing several unrelated natural-history
  subjects on one sheet — included as-is (not cropped to isolate the marine
  subjects) since it's a documented historical unit, not a design element
  assembled from parts.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
