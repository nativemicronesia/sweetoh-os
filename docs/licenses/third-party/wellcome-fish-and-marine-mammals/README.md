# Wellcome Collection — fish and marine mammal engravings

Eight 19th-century fish and marine mammal engravings, distinct from the
existing `wellcome-marine-life` pack (which covers corals, anemones, sea
urchins and other invertebrates): a classic whale/dolphin/porpoise
comparison plate, a three-species shark composite (lesser spotted shark,
porbeagle, white shark), a swordfish suspended mid-air, a walrus/manatee/
pike composite, a plain fish-in-the-sea etching, and three distinct flying
fish plates (with a boat, with its aerial and aquatic predators including
an albatross and a dolphin, and paired with a Chinese seaport vignette).

Two initially promising candidates ("a tortoise, a turtle and a flying
fish" and a "fourteen fishes" composite plate) had no confirmed open
license on their live catalogue records and were excluded outright rather
than trusted; two independently-checked substitutes (swordfish, pike/
walrus/manatee) took their place. A related "octopus" search surfaced a
plate already ingested in the `wellcome-marine-life` pack and was not
duplicated here.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), eight
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-fish-and-marine-mammals.mjs` re-checks
  this plus the IIIF image identity before generating Studio records; the
  raw API response and IIIF `info.json` for each work are preserved in
  `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
