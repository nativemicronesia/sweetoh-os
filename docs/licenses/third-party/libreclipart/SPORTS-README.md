# Libreclipart sports illustrations

This batch adds 30 distinct sports vectors: athletes across swimming, football, tennis, fencing, boxing, basketball, running, skiing, gymnastics, archery, rugby, and other activities, plus reusable sports equipment and a generic basketball logo concept. Original SVG downloads are in `sports-source/`; per-item source URLs, publication dates, source tags, the item-page rights label, SVG rights text, SVG creator metadata, hashes, and Studio identities are in `sports-assets.json` and `sports-SOURCE-MANIFEST.json`.

[Libreclipart's license page](https://libreclipart.org/en/licenses) says its free vectors are CC0, usable commercially without attribution. Each accepted item page also identifies Creative Commons Zero, and each original SVG has a compatible public-domain or CC0 rights claim. Individual human artists are not identified; the SVG creator field credits Libreclipart.org or its earlier OpenSourceImages.org site where present. The exact source label and metadata are retained instead of inventing an individual author.

Items **74** and **60** were inspected but excluded. Although their current pages say Creative Commons Zero, their original SVGs say “Free OSI License,” whose terms could not be verified as CC0. They are not Studio assets or part of this pack. The generator also rejects a later addition with that conflicting claim.

Run `node scripts/ingest-libreclipart-sports.mjs` and `node --import tsx scripts/build-studio-asset-manifest.ts` after changing this curated pack. The generator keeps the downloaded originals unchanged and strips source metadata from Studio's render payload, preserving the rights evidence in the original files and manifests.
