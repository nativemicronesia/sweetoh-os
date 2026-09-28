# CC0 playing cards

A complete, standard poker-sized 56-card deck (52 cards across four suits,
2 jokers, 2 card backs) — a real, narrow but genuine papercraft/game-design
addition, filling a gap an earlier scouting pass flagged as thin (most
journaling/planner-sticker and papercraft material online is commercial,
not rights-clear). Custom playing card decks are a real thing people
commission from POD shops; this gives Studio a complete, print-ready deck
to build from rather than nothing.

## Why the whole deck, not a curated subset

Unlike an icon library, where curation means picking the most useful subset
and skipping redundant concepts, a card deck's usefulness depends on
completeness — a partial deck isn't a usable product. All 52 standard
cards, both jokers, and both card backs are included as one coherent set.
"Bonus" alternate-art variants in the source repository (multiple styles of
ace-of-spades and joker) were left out to keep one canonical version per
card rather than bloating the library with near-duplicates.

## Rights and provenance

- Source: [AustinGabriel/Public-Domain-and-CC0-Playing-Cards](https://github.com/AustinGabriel/Public-Domain-and-CC0-Playing-Cards)
  on GitHub, pinned to commit `3765067c32fcef42a30e87022332db729658e7cd`.
- License: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/),
  full text retained in `LICENSE.txt`. The repository's own README
  explicitly lists "Physical / print-on-demand card decks" as an intended
  use case.
- `cards-SOURCE-MANIFEST.json` records each asset's original file and
  SHA-256 hash. `node scripts/ingest-cc0-playing-cards.mjs` validates SVG
  safety and the expected standard poker-card viewBox (1500×2100) before
  generating the Studio records; original files are unmodified and remain
  in `svg-source/`.
- Each source SVG carries a standard Illustrator/Inkscape-style public-DTD
  `<!DOCTYPE>` declaration (referencing the public W3C SVG 1.1 DTD, not an
  internal subset) — this is normal, safe vector-editor export boilerplate,
  not the XXE-risk pattern (an internal DOCTYPE subset with `<!ENTITY>` /
  `SYSTEM` declarations). The ingest script's safety check specifically
  targets the dangerous pattern rather than rejecting any DOCTYPE outright,
  so it doesn't false-positive on ordinary exported SVGs.
