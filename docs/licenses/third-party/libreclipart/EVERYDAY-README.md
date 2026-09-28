# Libreclipart everyday design vectors

This collection adds 109 individually checked SVGs across landscapes, food, school, backgrounds, places, travel, flowers, love, animals, people and decorative marks. They are discoverable in the existing Studio Creative Library and keep stable `libreclipart-{source ID}-v1` references.

## Rights and provenance

- Source: [Libreclipart.org](https://libreclipart.org/en/), each exact item page and SVG download recorded in `everyday-assets.json`.
- License: [Creative Commons Zero 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/). The site's [license statement](https://libreclipart.org/en/licenses) and each item page identify CC0. No attribution is required; commercial use, modifications and redistribution are permitted.
- `everyday-assets.json` records the observed individual item page license label, source URL, published date and source tags. `everyday-SOURCE-MANIFEST.json` records embedded SVG rights/creator metadata and SHA-256 hashes. `everyday-source/` contains the downloaded originals, including their original metadata. The generated Studio file is a separately normalized copy; it is regenerated with `node scripts/ingest-libreclipart-everyday.mjs`.
- A candidate is refused if its item-page CC0 label conflicts with its original SVG's rights metadata, if its original lacks a clear compatible rights claim, if it needs external resources or active SVG content, or if it cannot render. 23 candidates were excluded for absent or conflicting original rights claims. Assets already in SweetOh and visual near duplicates were also excluded during curation.

The item pages list Libreclipart.org as publisher; the source SVG's `dc:creator` is retained verbatim in the manifest. We do not infer an individual artist where the source does not identify one. The added intent tags describe the visible design use and subject, rather than claiming a culture or occasion not supported by the artwork.
