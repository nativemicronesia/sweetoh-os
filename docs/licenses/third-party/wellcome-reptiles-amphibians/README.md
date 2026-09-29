# Wellcome Collection — reptile and amphibian engravings

Eight 18th/19th-century reptile and amphibian engravings, found via the
same Wellcome Collection catalogue vein as the other Wellcome packs. Fills
a real gap: prior Wellcome packs covered botanical plates, marine life,
insects, cryptogams and shells, but no reptiles or amphibians — a natural
subject for engraving-suitable line/etching work with the same wide reach
as the other natural-history packs.

One composite amphibian plate (edible frog, tree frog, horned frog and
their tadpoles, "Plate I" from a 19th-century natural history volume) and
seven single-subject plates: a bull frog, a laced (monitor) lizard from
Australia, a lizard on a stone, and four snake engravings (an expanded-hood
snake, two Indian snakes credited to Patrick Russell's herpetological
work, and a horned viper).

A related search for "chameleon" surfaced a plate combining two live
chameleons with a chameleon skeleton — checked and found to carry no
confirmed open license on the live catalogue record, so it was excluded
outright rather than substituted on trust; two other candidates were
checked in its place instead.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), eight
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-reptiles-amphibians.mjs` re-checks this plus
  the IIIF image identity before generating Studio records; the raw API
  response and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide, well
  above the Studio registry's 2400px normalized output ceiling relative to
  their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
