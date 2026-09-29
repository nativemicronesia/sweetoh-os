# Huipil textiles — National Museum of World Cultures (Netherlands)

Five photographs of genuine Mesoamerican huipil garments (Mexican and
Guatemalan indigenous weaving/embroidery traditions) from the Netherlands'
National Museum of World Cultures collection, via Europeana — the same
reachable image server and rights-verification pattern as the Indonesian
textiles and kente cloth packs. Latin American/Mesoamerican textile
coverage was completely absent from the Creative Library before this.

## Why huipiles are treated like kente and batik, not like the parked Pacific material

Huipiles are a living, actively-worn, commercially and ceremonially produced
textile tradition across many indigenous Mexican and Guatemalan communities
today — woven and embroidered, sold in markets, and a continuing point of
cultural pride and identity, not a lineage-restricted or sacred-status
practice the way specific Pacific tattoo/tapa material was documented to
be. No equivalent institutional "closed by exception" signal applies (see
[`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories)).

Seven candidates were reviewed; two were dropped for being too subtle or
sparse to function as usable design elements (a white-on-white drawn-thread
huipil with very low contrast, and — kept despite sparseness — a
mostly-plain cream huipil retained for its distinct colorful collar
embroidery), an editorial/quality judgment, not a rights concern.

## Rights and provenance

- Source: [Europeana](https://www.europeana.eu), aggregating the
  [National Museum of World Cultures](https://www.materialculture.nl/en)
  (Netherlands). Five separate records (see `assets.json` for each
  Europeana item ID).
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) —
  confirmed independently, live, for each item via the Europeana Record
  API, checking `edmRights` equals the CC0 URL exactly and cross-checking
  the record's `edmIsShownBy` image URL against the one actually
  downloaded. `node scripts/ingest-huipil-textiles.mjs` re-checks this
  before generating Studio records; the raw API response for each item is
  preserved in `records/`.
- Images were used at their native downloaded resolution (all well above
  the Studio registry's 2400px normalized output ceiling). No cropping was
  applied.
- `SOURCE-MANIFEST.json` records each asset's Europeana item ID, source
  record URL, original dimensions, and SHA-256 hashes of the original
  download and normalized output.
