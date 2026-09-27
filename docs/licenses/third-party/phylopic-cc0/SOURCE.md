# PhyloPic CC0 silhouettes

This curated set preserves 367 original PhyloPic SVG files and the exact per-image provenance used to admit them into SweetOh Studio. The catalog source is [PhyloPic](https://www.phylopic.org/), using the [official API](https://api-docs.phylopic.org/) at API build 558. Image contributors and taxonomic names are recorded per image in `asset-manifest.json`.

## Rights decision

Every included image record reports the exact [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) license URI. The catalog query requested the commercial, no-attribution, no-share-alike subset; the import check then admitted only records whose individual license URL exactly matched CC0 1.0. Public Domain Mark records, attribution-required licenses, noncommercial licenses, share-alike licenses, and any record with missing license data were excluded. PhyloPic explains that its image licenses vary and that CC0 and Public Domain Mark images have different license designations in its [usage policy](https://www.phylopic.org/articles/image-usage); this pack intentionally accepts the explicit CC0 deed only.

For each included asset:

- Commercial use, modification, and redistribution are permitted under CC0 1.0.
- Attribution is not required. The contributor and an optional credit line remain recorded in the asset metadata and manifest.
- `sourceUrl` points to the original `source.svg`; `evidenceUrl` points to that image's PhyloPic API record pinned to build 558.
- `originals/<uuid>.svg` is byte-for-byte preserved and verified by SHA-256. Studio changes only the root SVG viewport width and height to 200 while preserving the original `viewBox` and path data, so graphics insert at the same predictable size as other Studio elements. Both original and Studio-rendered SVG hashes are recorded.
- Only self-contained vectors without external or embedded image references, scripts, foreign objects, or DTDs are included.

The manifest retains upstream vernacular names for provenance, but only a small set of reviewed, clean English common-name aliases is exposed as Studio search tags. No cultural or geographic identity is inferred from an organism's taxonomic name.

The bundled `CC0-1.0-LEGALCODE.txt` is the license text used for rights review. Rebuild the generated Studio module offline with:

```sh
node scripts/build-phylopic-assets.mjs
```

