# The Metropolitan Museum of Art Open Access material

This collection contains only individual Met object records that the API marks `isPublicDomain: true`, and only the matching `primaryImage` named by that record. The ingestion script rechecks the item-level public-domain flag and exact image URL before it creates the Studio pack. A search-result flag alone is not accepted as evidence.

- [The Met Open Access policy](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access) says the museum believes its Open Access images of public-domain works to be in the public domain and makes them available free for commercial or noncommercial use. It does not warrant that third parties will not assert rights.
- [The Met Collection API](https://metmuseum.github.io/) documents the object endpoint, the per-object `isPublicDomain` flag, and the corresponding high-resolution JPEG images. The exact item response is bundled in `records/` for every asset. The API's CC0 dedication applies to its factual dataset; these image entries are recorded as public domain, not mislabeled as CC0.

Attribution is not required for public-domain works. SweetOh retains each work's recorded title, creator, date, department, object page, image URL, and recommended museum credit so partners can identify the historical source. No artist attribution, region, or cultural context is invented when the record does not supply it. This first batch is historical European/American decorative work and botanical study; it does not repackage sacred or community-restricted cultural material as generic decoration.

For each work, `SOURCE-MANIFEST.json` records the API object ID, exact source image URL, original image checksum and dimensions, and derived Studio image checksum and dimensions. The source image bytes and full object response are kept beside this evidence. The Studio pack serves only the derived local image, under the existing rights-approved asset path.
