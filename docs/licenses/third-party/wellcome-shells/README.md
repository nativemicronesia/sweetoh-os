# Wellcome Collection — shell/conchology engravings

Four 19th-century shell engravings, found via the same Wellcome Collection
catalogue vein as the other Wellcome packs. Fills a real, specifically
identified gap: shells/conchology was flagged early in this session as
thin despite being directly on-brand for SweetOh's ocean identity, and
these are exactly the kind of clean, dense line-engraving content
(hundreds of individually numbered shell specimens per plate) that suits
engraving production — one of SweetOh's two confirmed shop methods.

Three of the four are large composite "table" plates by Captain Thomas
Brown (drawn) and R. Scott (engraved), showing 79, 105, and 163
individually numbered shell specimens respectively on a single sheet —
genuinely dense, engraving-appropriate reference material. The fourth is
a smaller etching of heart-shaped (cordiform) shells.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), four
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-shells.mjs` re-checks this plus the IIIF
  image identity before generating Studio records; the raw API response
  and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API (2000px wide for
  three items; 1600px for one after repeated 502 errors at 2000px from
  the IIIF server — a transient server issue, not a rights concern),
  still well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- A related search for "cowrie shell" on the same catalogue surfaced
  human skulls decorated with cowrie-shell eyes (funerary/ritual objects)
  — deliberately not pursued; shells as a subject are fine, but that
  specific material reads as sensitive ceremonial content, not a design
  reference, consistent with how this library treats similar material
  elsewhere.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
