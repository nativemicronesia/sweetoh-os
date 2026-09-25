# Studio editor foundation — shipped in this phase

## What is real

The partner canvas and creator design page share the existing Fabric.js editor. The existing saved `studioLayout` version remains `1`; image, text, shape and pattern layouts keep loading. The editor already supports print-area-aware placement, named regions, multi-surface products, layers and order, lock/visibility, selection and transforms, duplicate/delete, alignment guidelines and controls, undo/redo, crop, manual/AI artwork upload, editable patterns, local draft recovery, mockup preview, and transparent 300 DPI print export (maximum 6,000 pixels per side).

This phase adds a Library panel to both editor surfaces, 10 reusable original graphics across nature, accents, frames and patterns, search/category filtering, device-local favorites and recents, and three additional fonts (13 total). Graphic layers have stable registry keys and load into the same Fabric canvas, save format, print clipping, preview, and export path as other artwork. The server rejects unknown graphic IDs. The editor also adds a print-area-sized solid background action, pan mode, two-pointer zoom, font-size input and duplicate/redo/Escape keyboard shortcuts. Library actions pass through the validated, serializable command schema in `lib/studio/editor-commands.ts`; it defines the boundary a future AI tool can use. These changes do not touch commerce, partner fulfillment, or Island Sprouts integration.

The Library is a typed registry in `lib/studio/asset-library.ts` with stable ID, kind, category, tags, license, source, and SVG. IDs are persisted; old entries must remain available to reopen saved designs. The UI is `app/(partner)/partner/canvas/asset-library-panel.tsx`. Favorites and recents live in the browser; they are preferences, not part of customer artwork. Future licensed packs can be added to the manifest or backed by a database while keeping these stable IDs. Template storage and moderation are future work.

## Asset rights

- The 10 seed graphics and repeat motifs were drawn in this repo for SweetOh OS; they are original and may be used in customer designs. No third-party artwork was downloaded.
- The Studio fonts are served through `next/font/google`. Google Fonts' [repository](https://github.com/google/fonts) carries family-specific license files. Inter, Montserrat, Anton, Bebas Neue, Oswald, Playfair Display, Pacifico, Caveat, Lobster, Barlow Condensed, Space Grotesk and Fraunces are SIL Open Font License 1.1. Permanent Marker is Apache 2.0. Copies of each family license are in `docs/licenses/fonts/`.
- Uploaded customer images, Printify catalog photos, and AI output are **not** part of the reusable seed library. Their rights remain separate. Never add a third-party graphic/template without source and redistribution terms.

## Boundaries still ahead

- The seed graphics are single SVG-backed canvas objects, not editable path nodes. Pattern tiles from this pack are transformable graphics; the existing uploaded-artwork pattern tool remains the adjustable tile/repeat editor.
- The existing renderer is a flat 2D composite. Perspective/displacement templates, owned blank photography, 3D models and interactive product views remain the next mockup-engine boundary (`STUDIO-NEXT.md`).
- SweetOh AI currently generates/edits artwork and operates selected server-side partner tools. It does not yet dispatch canvas commands. The typed command boundary exists; the next AI integration must route suggestions through the visible editor with user review, undo, print-area constraints, and save validation.
- Favorites/recents are local to one browser. Shared team libraries, uploaded public packs, license review, storage quotas and template versioning need a server-side asset catalog before rollout.
