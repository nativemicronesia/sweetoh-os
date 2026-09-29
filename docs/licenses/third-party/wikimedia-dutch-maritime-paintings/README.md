# Wikimedia Commons — Dutch Golden Age maritime paintings

Eight 17th-century Dutch maritime paintings (Rijksmuseum originals, via
Wikimedia Commons), found while following up a Lorikeet scout report that
flagged the Rijksmuseum as a strong, plausibly well-licensed source for
ocean/maritime subject matter genuinely distinct from the Wellcome
Collection's natural-history line engravings built earlier this session.

The Rijksmuseum's own RijksData API requires a self-registered developer
key (an account-creation step, parked as a DX/owner action rather than
something to do autonomously); Wikimedia Commons already hosts a large,
independently-licensed set of Rijksmuseum paintings from the museum's own
GLAM open-data program, reusing the same Wikimedia ingestion pipeline and
rights-verification pattern built for the Pacific charts pack.

Four calm/working scenes (ships off a coast, ships before IJselmonde, a
frigate on the IJ, a fleet at the Texel roadstead), one becalmed fleet
portrait, and two dramatic storm scenes (a turbulent sea, warships in a
storm) — full-color oil paintings, not engravings, adding real tonal and
textural range to the Ocean & Nautical category alongside the existing
line-art content.

## Rights and provenance

- Source: [Wikimedia Commons](https://commons.wikimedia.org), eight
  separate files, all originally digitized by the
  [Rijksmuseum](https://www.rijksmuseum.nl) (one — the Van de Velde — is
  hosted on Commons without a direct Rijksmuseum permalink in its
  metadata, but carries the same Public Domain license tag).
- License: Public Domain — confirmed independently, live, for each file
  via the Wikimedia Commons API, checking `extmetadata.LicenseShortName
  === "Public domain"` and `extmetadata.Restrictions === ""`.
  `node scripts/ingest-wikimedia-dutch-maritime-paintings.mjs` re-checks
  this, the exact page title, and the exact `descriptionurl` before
  generating Studio records; each original download is additionally
  verified against Wikimedia's own recorded SHA-1 hash for that upload.
  The raw API response for each file is preserved in `records/`.
- Images were downloaded from Wikimedia's original-resolution upload URLs
  (2928–7290px on the long edge) and normalized to the Studio registry's
  2400px ceiling. No cropping was needed.
- Four of the eight downloads initially failed with a generic Wikimedia
  error page (blocked default `curl` user agent, not a rights issue) and
  were retried successfully with an identifying User-Agent header.
- `SOURCE-MANIFEST.json` records each asset's Commons URL, creator, date,
  and SHA-256 hashes of the original download and normalized output.
