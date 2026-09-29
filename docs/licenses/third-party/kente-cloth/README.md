# Kente cloth — National Museum of World Cultures (Netherlands)

Five photographs of genuine Ghanaian kente cloth (Akan weaving tradition)
from the Netherlands' National Museum of World Cultures collection, via
Europeana — the same reachable image server and rights-verification
pattern as the Indonesian textiles pack. West African textile coverage was
completely absent from the Creative Library before this.

## Why kente is treated differently from the parked Pacific ceremonial material

Kente is a living, openly-taught, actively and commercially produced
textile tradition — woven and sold globally, worn publicly, and used as a
celebrated symbol of Ghanaian and Pan-African identity (including as
graduation stoles, a widespread public practice). This is categorically
different from the Marshallese/Yapese/Pohnpeian tattoo and tapa/siapo
material parked elsewhere in this library: there is no equivalent
institutional "closed by exception" signal for kente the way multiple
museums explicitly apply to Pacific ceremonial material (see
[`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories)).
Six candidates were reviewed; one (a plain undyed white cloth with thin
blue stripes, not a decorated Kente pattern) was dropped for lacking real
design value, not for a rights reason.

## Rights and provenance

- Source: [Europeana](https://www.europeana.eu), aggregating the
  [National Museum of World Cultures](https://www.materialculture.nl/en)
  (Netherlands). Five separate records (see `assets.json` for each
  Europeana item ID).
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) —
  confirmed independently, live, for each item via the Europeana Record
  API, checking `edmRights` equals the CC0 URL exactly and cross-checking
  the record's `edmIsShownBy` image URL against the one actually
  downloaded. `node scripts/ingest-kente-cloth.mjs` re-checks this before
  generating Studio records; the raw API response for each item is
  preserved in `records/`.
- Images were used at their native downloaded resolution (all well above
  the Studio registry's 2400px normalized output ceiling). No cropping was
  applied.
- `SOURCE-MANIFEST.json` records each asset's Europeana item ID, source
  record URL, original dimensions, and SHA-256 hashes of the original
  download and normalized output.
