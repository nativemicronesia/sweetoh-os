# Wellcome Collection — tropical/Pacific-relevant flora engravings

Eight 18th/19th-century tropical flora engravings, filling a real gap
identified by checking the existing `wellcome-botanical-plates` pack: it
covers only temperate European plants (iris, sunflower, anemone, etc.),
with nothing relevant to SweetOh's Micronesian/Pacific identity. This
pack covers four genuine Pacific staple/iconic plants: hibiscus (two
plates — the China rose, *Hibiscus rosa-sinensis*, culturally associated
across the Pacific), breadfruit (a full-color tropical landscape scene, a
Pacific staple food crop), coconut palm (paired with cinnamon and pinang
trees in a tropical landscape), plantain/banana (two plates — a detailed
botanical sectional study and a landscape pairing with a date palm), and
screwpine/pandanus (two plates — *Pandanus* is used across Micronesia for
weaving mats, baskets and thatch).

One candidate hibiscus plate had no confirmed open license on its live
catalogue record and was excluded; an independently-checked substitute
took its place.

## Rights and provenance

- Source: [Wellcome Collection](https://wellcomecollection.org), eight
  separate catalogue works (see `assets.json` for each work ID).
- License: [Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/) —
  confirmed independently, live, for each work via the Wellcome Collection
  catalogue API, checking both the item's `license.id === "pdm"` and its
  `accessConditions` status is `open`.
  `node scripts/ingest-wellcome-tropical-flora.mjs` re-checks this plus
  the IIIF image identity before generating Studio records; the raw API
  response and IIIF `info.json` for each work are preserved in `records/`.
- Images were fetched from the Wellcome IIIF Image API at 2000px wide,
  well above the Studio registry's 2400px normalized output ceiling
  relative to their real detail level. No cropping was needed.
- `SOURCE-MANIFEST.json` records each asset's IIIF image ID, the original
  and IIIF-reported dimensions (cross-checked against each other), and
  SHA-256 hashes of the original download and normalized output.
