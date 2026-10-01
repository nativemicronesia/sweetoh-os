# Studio editor foundation — shipped in this phase

## What is real

The partner canvas and creator design page share the existing Fabric.js editor. The existing saved `studioLayout` version remains `1`; image, text, shape and pattern layouts keep loading. The editor already supports print-area-aware placement, named regions, multi-surface products, layers and order, lock/visibility, selection and transforms, duplicate/delete, alignment guidelines and controls, undo/redo, crop, manual/AI artwork upload, editable patterns, local draft recovery, mockup preview, and transparent 300 DPI print export (maximum 6,000 pixels per side).

This phase adds a Library panel to both editor surfaces, 14 reusable original graphics across nature, accents, frames, patterns, textures and backgrounds, search/category filtering, device-local favorites and recents, and three additional fonts (13 total). Graphic layers have stable registry keys and load into the same Fabric canvas, save format, print clipping, preview, and export path as other artwork. The server rejects unknown graphic IDs. The editor also adds a print-area-sized solid background action, pan mode, two-pointer zoom, font-size input and duplicate/redo/Escape keyboard shortcuts. Library actions pass through the validated, serializable command schema in `lib/studio/editor-commands.ts`; it defines the boundary a future AI tool can use. These changes do not touch commerce, partner fulfillment, or Island Sprouts integration.

The Library is a typed registry in `lib/studio/asset-library.ts` with stable ID, kind, category, tags, license, source, and SVG. IDs are persisted; old entries must remain available to reopen saved designs. The UI is `app/(partner)/partner/canvas/asset-library-panel.tsx`. Favorites and recents live in the browser; they are preferences, not part of customer artwork. Future licensed packs can be added to the manifest or backed by a database while keeping these stable IDs. Template storage and moderation are future work.

## Follow-on editor depth — shipped 2026-09-26

The saved version-1 layout now persists shape outlines and linear gradient presets, text letter spacing/outlines, and image brightness, contrast, saturation and soft-focus adjustments. These image edits are non-destructive: numeric settings remain attached to the source image layer and are reapplied when reopening. The shape drawer now includes oval, burst, hexagon and arrow shapes. These join the existing freeform transform, lock/visibility, crop, layer order, duplicate, history, alignment guides, pan/zoom and touch pinch paths.

The command schema now accepts bounded move, resize, rotate, flip/crop, opacity, shape/text styling, image adjustment, layer visibility/locking/order and print-region preparation intents in addition to add/history/delete/alignment actions. `findStudioAssets` searches only SweetOh-owned and licensed registry entries and returns their source/license; `buildStudioEditorState` creates a validated, serializable read-only document summary. This is a shared-intelligence seam, not an AI feature: no model currently invokes it or edits the canvas. Commands are validated and use the editor's ordinary checkpoint/capture path; they still require a future trusted tool adapter and explicit user review.

Mockup rendering now clips flat artwork to its active print area and has a versioned, rights-attributed quadrilateral template registry for perspective placement and material multiply blending. No product-specific perspective template is seeded because the repository has no documented, authorized template photography or validated garment geometry. Existing catalog photos continue through the flat fallback. Per-blank mesh fitting, garment shading maps, lifestyle photo sets and 3D remain planned.

This phase adds original SweetOh vector elements (confetti, scallop border, rainbow and sunshine) with SweetOh original-use provenance. No third-party visual pack or font was added.

## Asset rights

- The 10 seed graphics and repeat motifs were drawn in this repo for SweetOh OS; they are original and may be used in customer designs. No third-party artwork was downloaded.
- The Studio fonts are served through `next/font/google`. Google Fonts' [repository](https://github.com/google/fonts) carries family-specific license files. Inter, Montserrat, Anton, Bebas Neue, Oswald, Playfair Display, Pacifico, Caveat, Lobster, Barlow Condensed, Space Grotesk and Fraunces are SIL Open Font License 1.1. Permanent Marker is Apache 2.0. Copies of each family license are in `docs/licenses/fonts/`.
- Uploaded customer images, Printify catalog photos, and AI output are **not** part of the reusable seed library. Their rights remain separate. Never add a third-party graphic/template without source and redistribution terms.

## Boundaries still ahead

- The seed graphics are single SVG-backed canvas objects, not editable path nodes. Pattern tiles from this pack are transformable graphics; the existing uploaded-artwork pattern tool remains the adjustable tile/repeat editor.
- Native freehand drawing is shipped with persisted Pencil, Marker and dashed-line brush identities, reusable presets from two original procedural textures, color/size/opacity editing, and stylus pressure samples that reproduce variable-width strokes. Mouse and ordinary touch use a steady fallback. Imported brush packs, blending and path-node editing remain future work; physical stylus hardware was not available for this verification.
- Perspective templates are infrastructure only until licensed product photographs and measured print-area corners exist for a specific blank.
- SweetOh AI currently generates/edits artwork and operates selected server-side partner tools. It does not yet dispatch canvas commands. The typed command boundary exists; the next AI integration must route suggestions through the visible editor with user review, undo, print-area constraints, and save validation.
- Favorites/recents are local to one browser. Shared team libraries, uploaded public packs, license review, storage quotas and template versioning need a server-side asset catalog before rollout.

## Studio architecture: designs, products, geometry, mockups

**Studio creates designs; products consume designs; production geometry guarantees manufacturing accuracy; mockups visualize the result.** These are four separate things.

- **Studio (standalone).** `/partner/studio` is a first-class workspace in the main navigation. A design starts from a design type or a custom size (`lib/studio/design-canvas.ts`: px/in/mm/cm, 40-6000 px a side, exported at 300 DPI), is one artboard with a real physical size, and is saved, reopened, duplicated and replaced on its own (`actions/studio-design.ts`). It is stored as a `sweetoh_design` composition whose `compositionLayout` has no `blankProductId`; `isStandaloneDesign()` distinguishes it. It uses the same editor, Creative Library, uploads, text, shapes, layers and AI foundations as product design.
- **Product Design context.** `/partner/canvas?blank=` opens the same editor on a product's real surfaces. The canvas shows only a verified production blank; with none it shows the print-area surface alone. Supplier catalog photos and generated previews are references: view tabs draw each surface from its geometry, never from a supplier photo (which can carry sample artwork).
- **Applying a design.** `/partner/canvas?blank=<product>&template=<design>` places a standalone design on that product's print region (`lib/studio/design-apply.ts`: uniform contain-fit, centered). Applying to several products is done one product at a time; there is no batch apply yet.
- **Production geometry.** `lib/domains/catalog/production-geometry.ts` is the one place that converts a region's physical size to print pixels (300 DPI; Printify placeholders are pixel sizes at that DPI) and maps editor stage coordinates to print-file coordinates and back. Saving a design never rewrites an existing product's geometry; product setup owns it.
- **Mockups** are previews rendered from the print file and a production blank; they never define geometry.

Not yet built: artboard resize after creation, batch apply to many products, a verified clean-blank source for every catalog product (the existing background-removal setup creates them per product), and per-blank perspective mockup templates.
