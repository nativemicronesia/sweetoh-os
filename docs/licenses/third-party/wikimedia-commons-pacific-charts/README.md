# Wikimedia Commons — Micronesian/Pacific nautical charts and maps

Nine public-domain (and one CC BY-SA, clearly marked) historical and modern
maps covering all seven Micronesian entities SweetOh's own community draws
from — Palau, the Federated States of Micronesia (Pohnpei/Chuuk/Yap/Kosrae),
Guam, the CNMI, the Marshall Islands, Nauru, and Kiribati — plus outer
atolls, found mainly via Wikimedia Commons' `Category:Maps_of_the_*`
categories for each entity.

## What's in this pack

| Entity | Item | Era | License |
|---|---|---|---|
| FSM (Caroline Is.) | Admiralty Chart No. 970, Islands and Anchorages | 1929 | Public domain |
| FSM (Pohnpei→Guam) | Track of the Albatross expedition chart | 1900 | Public domain |
| Palau | Admiralty Chart No. 1103, Peeloo Archipelago | 1796 | Public domain |
| Guam | Plan of Umatac Bay, with coastal profile views | 1796 | Public domain |
| Marshall Islands | Marshallese stick chart (Musée du quai Branly) | traditional/photographed | CC BY-SA 4.0 |
| Marshall Islands | Map of Majuro Atoll | mid-20th c. style | Public domain |
| Nauru | Nauru detail map with regional locator | 1988 | Public domain |
| Kiribati | Tarawa Atoll diagram (modern, minimal) | modern | Public domain |
| Kiribati | South Tarawa labeled satellite-style map | modern | Public domain |

## Why these, and not more from the same categories

Each entity's category was browsed for genuine navigational/cartographic
candidates and every promising item was independently re-verified per-file
against the live Commons API before inclusion — category membership alone
was never trusted (see `node scripts/ingest-wikimedia-commons-pacific-charts.mjs`,
which re-checks `extmetadata.LicenseShortName`, `extmetadata.Restrictions`,
and the exact `descriptionurl` and page title for every item). Some
candidates found during scouting were deliberately excluded:

- A hand-drawn 1817 Chamisso expedition field sketch of the Carolines is
  genuinely public domain but too faint and cramped to function as a usable
  design element (editorial/quality judgment, not a rights issue).
- A modern NOAA chart of Farallon de Medinilla (CNMI) was pulled after
  repeated attempts to correct its scan orientation produced inconsistent
  results; parked for a future pass with fresh eyes rather than shipped
  wrong or over-invested in on this pass.
- ~15 more Admiralty charts, Atoll Research Bulletin scans, and an
  Admiralty Chart Catalogue index page in the Caroline Islands category,
  plus most of a ~20-atoll "Map of [Atoll]" Marshall Islands series beyond
  Majuro, several more Gilbert Islands atoll maps (01–18 series, only two
  independently verified here), and Palau/Guam/CNMI leads a scout flagged
  but couldn't individually verify (rate-limited) — all reasonable leads
  for a future batch, not verified enough to ingest yet.

This pack deliberately stays in the safe lane identified during scouting:
historical/navigational/scientific documentation and modern reference
cartography, not restricted cultural/ceremonial material. See
[`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories)
for the fuller reasoning: multiple institutions (Auckland Museum, Te Papa)
treat Pacific cultural/ceremonial material as closed by exception to their
own open-access policies even under a nominally open license, so a CC0/PD
tag alone doesn't clear it for this library. Nautical charts, atoll
diagrams, and satellite-style reference maps carry no such concern.

**The Marshallese stick chart is a deliberate, considered exception to
"navigational only, no cultural motifs."** It depicts a traditional
wave-navigation instrument (a *rebbelib*/*meddo*), not a ceremonial or
restricted object — it is publicly exhibited in major world museums
(Musée du quai Branly, British Museum, Smithsonian) and celebrated in
Marshallese public culture, including on RMI postage stamps. It carries CC
BY-SA 4.0 (attribution + share-alike required), which the pipeline already
handles at the same tier as the existing OpenMoji pack; its `attributionText`
credits the Commons photographer and the museum.

Nauru's detail map labels former phosphate-mining infrastructure and a
colonial-era indentured-laborers settlement site as part of its normal
place-name/facility labeling (matching how the source U.S. government base
map documents the island) — this is factual geographic/infrastructure
labeling, not content that treats that history as a decorative motif.

## Rights and provenance

- All licenses were independently confirmed live against the Wikimedia
  Commons API (`action=query&prop=imageinfo&iiprop=extmetadata`) — not
  taken on a scout's word alone. The raw API response for each file is
  preserved in `records/`.
- Images were fetched at Commons' snapped thumbnail size (usually
  3840px on the long edge) rather than full originals where the source
  was very large (the Palau chart's original is 6122×4066; some Admiralty
  charts in this category exceed 16000px), well above the Studio registry's
  2400px normalized output ceiling. No cropping was needed for any item in
  this batch — all are clean full-frame scans or renders.
- `SOURCE-MANIFEST.json` records each asset's Commons file-revision SHA-1
  (from the API), the downloaded original's SHA-256, and the normalized
  output's SHA-256.
