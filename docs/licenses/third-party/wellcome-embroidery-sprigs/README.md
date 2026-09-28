# Wellcome Collection — 1775 embroidery-design flower sprig engravings

Five plates from *A New Book of Sprigs of Flowers for the Use of Ladies,
Tambour Workers &c* by Kilburn & Dodd (printed for R. Sayer & J. Bennett,
1776) — 18th-century engravings explicitly created as reusable embroidery
patterns, found via the Wellcome Collection catalogue while following up on
a scouting lead that flagged the already-verified Wellcome/Cleveland/
Smithsonian ornamental-print vein as the higher-trust path when a newer
aggregator source (freesvg.org-style sites) couldn't offer per-item
institutional verification.

This complements the existing `wellcome-printers-ornaments` pack (a
different single work, different content) — this is a separate five-work
set, not an extension of that pack's IIIF manifest.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), five
  separate catalogue works (`cqwy8xcd`, `tjhcd6kq`, `yvbzqfk6`, `ykvqwre9`,
  `ruymcc9g`), each an individual 1775 engraving by William Kilburn (four
  plates) or "Dodd" (one plate, the Convolvulus/carnations sprig).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API (`GET /catalogue/v2/works/{id}?include=items`), checking
  both the item's `license.id === "pdm"` and its `accessConditions` status
  is `open`. `node scripts/ingest-wellcome-embroidery-sprigs.mjs` re-checks
  this plus the IIIF image identity before generating Studio records; the
  raw API response and IIIF `info.json` for each work are preserved in
  `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide
  (`/full/2000,/0/default.jpg`), well above the Studio registry's 2400px
  normalized output ceiling relative to their real detail level, rather
  than the full source scan. No cropping was needed — all five are clean
  full-plate scans.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
