# Cleveland Museum of Art Open Access material

This pack includes only object records whose exact API value is `share_license_status: "CC0"` and whose print image URL is present in that same record. The ingestion script rejects records with any other rights status, a mismatched object ID, or an image URL that differs from the configured source. It does not infer rights from an artwork date, search result, or the museum's broader data release.

- [CMA Open Access policy](https://www.clevelandart.org/open-access): CMA says its CC0 images may be downloaded, shared, remixed, reused, and used in commercial or noncommercial applications without permission or fee. Its FAQ says CC0-designated works require no attribution.
- [CMA Open Access API](https://openaccess-api.clevelandart.org/): documents `share_license_status`, the `cc0` search filter, object image URLs, and the object-level record. Each complete API response is preserved in `records/`.
- [CMA Open Access source repository](https://github.com/ClevelandMuseumArt/openaccess): explains that only works with `share_license_status: CC0` receive CC0 images and bundles the CC0 1.0 deed as `CC0-1.0-LEGALCODE.txt`.
- [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) is bundled as `CC0-1.0-LEGALCODE.txt`.

Attribution is not required. The pack retains exact creators, roles, dates, culture/region, object page, accession number, source-image URL, and recommended credit to keep the works identifiable. Japanese works are labeled as Japanese seasonal screen paintings by Kaihō Yūshō from the Momoyama period; they are not presented as generic Asian motifs. The selected records depict flowers, botanical studies, fruit, and birds rather than sacred or ceremonial subjects.

`SOURCE-MANIFEST.json` records each source ID and image URL, original and derived SHA-256 checksums, and dimensions. Full API object records and print-resolution source images are bundled alongside it. The Studio uses locally served WebP derivatives under its existing rights-approved asset path.
