# Wikimedia Commons — historical Pacific/Caroline Islands nautical charts

Two public-domain historical nautical charts covering the actual waters
SweetOh's own Micronesian communities are from — Chuuk (Truk), Pohnpei
(Ponapi), Yap, Guam, and the wider Caroline Islands — found via Wikimedia
Commons' `Category:Maps_of_the_Caroline_Islands`.

## Why these two, and not more from the same category

The category also lists a hand-drawn 1817 Chamisso expedition field sketch,
which was reviewed and deliberately excluded: it is genuinely public domain
but too faint, cramped, and hard to read to function as a usable design
element (this is an editorial/quality judgment, not a rights issue). ~15
more Admiralty charts and Atoll Research Bulletin scans in the same category
were not reviewed this pass and are a reasonable lead for a future batch.

This pack deliberately stays in the safe lane identified during scouting:
historical navigational/scientific-expedition documentation, not cultural
or ceremonial material. Earlier research (see
[`STUDIO-CREATIVE-KNOWLEDGE.md`](../../STUDIO-CREATIVE-KNOWLEDGE.md#creative-scope-beyond-predefined-pod-categories))
found that Pacific cultural/ceremonial material is often institutionally
restricted even under a nominally open license, and multiple independent
sources converged on parking it rather than ingesting it. Nautical charts of
open ocean and reef anchorages carry no such concern.

## Rights and provenance

- **Admiralty Chart No. 970** — "Islands and Anchorages in the Caroline
  Islands," United Kingdom Hydrographic Office, published 1929. [Commons
  file](https://commons.wikimedia.org/wiki/File:Admiralty_Chart_No_970_Islands_and_Anchorages_in_the_Caroline_Islands,_Published_1929.jpg).
  License: Public domain (UK Crown work, no known copyright restrictions per
  Commons' own extmetadata).
- **Track of the Albatross** — from Station 240 west of Pohnpei through the
  Carolines to Guam, February 1900, USFC Steamer *Albatross* expedition
  (Alexander Agassiz). [Commons
  file](<https://commons.wikimedia.org/wiki/File:Track_of_the_Albatross_from_Pohnpei_through_the_Caroline_Islands_to_Guam_in_February_1900_(map0027541873).jpg>),
  sourced from the NOAA Photo Library. License: Public domain.
- Both licenses were independently confirmed live against the Wikimedia
  Commons API (`action=query&prop=imageinfo&iiprop=extmetadata`), not taken
  on the earlier scout's word alone. `node
  scripts/ingest-wikimedia-commons-pacific-charts.mjs` re-checks
  `extmetadata.LicenseShortName === "Public domain"`,
  `extmetadata.Restrictions === ""`, and the exact `descriptionurl` and page
  title before generating the Studio record; the raw API response for each
  file is preserved in `records/`.
- Images were fetched at a 3840px-wide thumbnail (Commons snapped the
  request up from the requested 2000px), well above the Studio registry's
  2400px normalized output ceiling, rather than the full multi-hundred-
  megapixel originals (the Admiralty chart's original is 16265×11092). No
  cropping was needed — both are clean full-page scans.
- `SOURCE-MANIFEST.json` records each asset's Commons file-revision SHA-1
  (from the API), the downloaded original's SHA-256, and the normalized
  output's SHA-256.
