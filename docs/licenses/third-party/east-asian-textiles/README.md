# East/Central Asian textiles — National Museum of World Cultures (Netherlands)

Three photographs of historical textiles from the Netherlands' National
Museum of World Cultures collection, via Europeana — a Manchu (Qing
dynasty style) dragon robe, a gold-thread embroidered shoulder cloth, and
a red silk brocade jacket. Same reachable image server and CC0
verification pattern as the Indonesian, kente, and huipil packs.

## On the dragon robe specifically

Qing dynasty dragon robes were historically rank-regulated court dress,
but that imperial system ended with the Qing dynasty in 1912 — this is
historical costume, not a living restricted practice. It is freely and
openly displayed and reproduced as historical art/textile scholarship by
major world museums (the Met, the V&A, the Palace Museum in Beijing), and
dragon-robe imagery is extremely commonly reproduced commercially
worldwide. No equivalent institutional "closed by exception" signal
applies the way it does to the Pacific ceremonial material parked
elsewhere in this library (see
[`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories)).

## On the shoulder cloth's title

The museum's own catalogue title describes it as "typical Chinese
embroidery of gold thread," which is retained as this asset's title and
primary tag even though its visual weave/border style (ikat-style
grounds, a paisley-form border) reads to a non-expert eye as more
evocative of Central Asian or Persian textile conventions. The source
institution's own cataloging is treated as authoritative rather than an
untrained visual guess; both descriptive angles are reflected in the
tags.

## Rights and provenance

- Source: [Europeana](https://www.europeana.eu), aggregating the
  [National Museum of World Cultures](https://www.materialculture.nl/en)
  (Netherlands). Three separate records (see `assets.json` for each
  Europeana item ID).
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) —
  confirmed independently, live, for each item via the Europeana Record
  API, checking `edmRights` equals the CC0 URL exactly and cross-checking
  the record's `edmIsShownBy` image URL against the one actually
  downloaded. `node scripts/ingest-east-asian-textiles.mjs` re-checks this
  before generating Studio records; the raw API response for each item is
  preserved in `records/`.
- Images were used at their native downloaded resolution (all well above
  the Studio registry's 2400px normalized output ceiling). No cropping
  was applied.
- `SOURCE-MANIFEST.json` records each asset's Europeana item ID, source
  record URL, original dimensions, and SHA-256 hashes of the original
  download and normalized output.
