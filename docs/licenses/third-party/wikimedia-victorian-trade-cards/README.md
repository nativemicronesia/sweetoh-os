# Wikimedia Commons — Victorian trade card / advertising ephemera

Six Victorian-era chromolithograph trade cards, a genuinely new decorative
genre for the Studio library: colorful commercial ephemera art, distinct
from every prior pack this session. Two Christmas cards (a robin and a
hummingbird, both directly useful for holiday sublimation designs), a
die-cut hand-fan advertising card, a Lea & Perrins' Sauce advertisement, a
"Waiting for the fishing party" genre-scene card, and an ornately
gold/blue-scrolled Victorian business card border.

## Rejected candidates — appropriateness, not licensing

Two other technically-public-domain candidates found in the same research
pass were deliberately excluded, independent of and in addition to the
cultural-sensitivity framework already documented for tatau/tapa/Native
American material: 19th-century American trade-card advertising is a
well-documented genre that frequently carries racialized caricature. One
candidate ("Kaufmann and Goldsmith Confectionery") used "Chinese Problem"
caricature imagery; another ("American advertising card, 1880s") depicted
a rural-stereotype figure in a composition matching a well-documented
racist advertising trope. Both were rejected outright on inspection,
before any download or license check — a technical PD tag never settles
whether content is appropriate to repurpose as generic commercial design
stock. A third weak candidate ("John Bowen & Co") was dropped simply for
being text-only with no meaningful design content.

## Deferred, not rejected — two items pending re-fetch

Two further clean, appropriate candidates were fully researched, license-
verified, and metadata-recorded (a "Sanitas Grape Food" fashion-plate
trade card and a second ornate Victorian business-card border, "BM
1983,U.176") but their full-resolution downloads repeatedly failed with
an explicit Wikimedia CDN 429 ("Too many requests... use thumbnail images
in sizes listed") during this session — a real signal from Wikimedia
operations to slow down, not a transient blip, so it was respected rather
than retried aggressively. Their API records remain useful for a future
session to complete; the pack shipped with the 6 items that downloaded
cleanly rather than blocking on the other 2 or forcing thumbnail-only
resolution into the registry.

## Rights and provenance

- Source: [Wikimedia Commons](https://commons.wikimedia.org), six
  individually-licensed files; four are independent uploads, two are
  British Museum trade-card prints (`BM 1983,U.175` and its companion).
- License: Public Domain — confirmed independently, live, for each file
  via the Wikimedia Commons API, checking `extmetadata.LicenseShortName
  === "Public domain"` and `extmetadata.Restrictions === ""`.
  `node scripts/ingest-wikimedia-victorian-trade-cards.mjs` re-checks
  this, the exact page title, and the exact `descriptionurl` before
  generating Studio records; each original download is additionally
  verified against Wikimedia's own recorded SHA-1 hash for that upload.
  The raw API response for each file is preserved in `records/`.
- Images were downloaded from Wikimedia's original-resolution upload URLs
  and normalized to the Studio registry's 2400px ceiling. No cropping was
  needed.
- `SOURCE-MANIFEST.json` records each asset's Commons URL, creator, date,
  and SHA-256 hashes of the original download and normalized output.
