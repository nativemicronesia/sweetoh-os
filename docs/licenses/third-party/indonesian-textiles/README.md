# Indonesian textiles — National Museum of World Cultures (Netherlands)

Ten photographs of real Indonesian textiles — batik, ikat, songket
(gold-thread weaving), and kain prada (gold-leaf cloth) — from the
Netherlands' National Museum of World Cultures collection, via Europeana.
Global textile-pattern coverage was a real gap the Creative Library had
(existing packs are mostly Western European/North American in origin);
these are genuine, richly patterned woven and dyed textiles, not
Western-made "world pattern" pastiches.

## How this was found (and what didn't work)

An earlier scouting pass identified the Swedish Museum of Ethnography
(also on Europeana, `SMVK_EM_*` object IDs) as a strong CC0 batik/ikat
source, but its image server (`collections.smvk.se`) was unreachable
(connection timeouts) across multiple attempts this session. The National
Museum of World Cultures' image server
(`collectie.wereldculturen.nl`) — a different institution surfaced by the
same Europeana searches — proved reachable and was used instead. Both are
equally legitimate CC0 sources; this was a connectivity choice, not a
quality judgment. The Swedish museum's holdings remain a reasonable lead
for a future pass if its server becomes reachable.

## Rights and provenance

- Source: [Europeana](https://www.europeana.eu), aggregating the
  [National Museum of World Cultures](https://www.materialculture.nl/en)
  (Netherlands). Ten separate records (see `assets.json` for each
  Europeana item ID).
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) —
  confirmed independently, live, for each item via the Europeana Record
  API, checking `edmRights` equals the CC0 URL exactly and cross-checking
  the record's `edmIsShownBy` image URL against the one actually
  downloaded. `node scripts/ingest-indonesian-textiles.mjs` re-checks this
  before generating Studio records; the raw API response for each item is
  preserved in `records/`.
- Batik and ikat are living, actively-taught, commercially-produced
  textile craft traditions (not a restricted lineage/ceremonial practice),
  consistent with how this library already distinguishes openly-taught
  craft traditions from culturally-restricted material (see
  [`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories)).
  No cultural-sensitivity flag applies here the way it does to Pacific
  ceremonial/tattoo material.
- Images were used at their native downloaded resolution (all
  well above the Studio registry's 2400px normalized output ceiling). No
  cropping was applied; each photograph is used as the source museum
  presented it, including its own photography backdrop.
- `SOURCE-MANIFEST.json` records each asset's Europeana item ID, source
  record URL, original dimensions, and SHA-256 hashes of the original
  download and normalized output.
