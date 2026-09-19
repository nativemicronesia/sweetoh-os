# Product-led Studio — verification notes

The partner owns the production setup. Product setup supports named surfaces and multiple named print regions on each photo: rectangles, ellipses, and custom polygons with editable points. Regions can be moved, resized, deleted, expanded to the full canvas, and given optional inch or centimeter dimensions. Setup changes are staged until Save; Cancel discards them. Removing every region leaves the surface unprintable until the partner adds one.

The configuration is stored in the real product's existing `print_area` JSONB field. New designs inherit it; reopening an existing saved composition preserves that composition's layout. Generated product drafts retain the configuration too. No database migration is required. Legacy rectangular layouts remain readable: absent `printRegions` means a legacy rectangle, while `printRegions: []` means no regions. Partner-defined dimensions take precedence over catalog dimensions.

Artwork, text, shapes, and patterns can target a named print region or all regions. Preview images and transparent print exports use the same shape masks. Downloads are separate for each area; physical dimensions determine output pixels at 300 DPI, capped at 6,000 px per side. Undecorated surfaces remain in preview output so multi-surface saves remain complete. Pattern asset references are resolved and checked for ownership when saving and reopening.

The workspace opens with more canvas space and tools available on demand. It includes file drag-and-drop, visible starter actions, active-area selection, layer visibility and locking, redo with restored selection, more reliable pattern controls, and accessible phone-sized controls. Own-product creation offers a manual photo path; AI suggestions are optional. Changing the product type no longer overwrites the partner's chosen print dimensions.

Verified locally with Playwright against the real authenticated partner workflow and clearly labeled test data:

- Upload product photos without AI, name the product, and create its blank.
- Add an elliptical chest area, a custom polygon, and full-surface coverage on a second photo; rename and delete areas; manipulate polygon points.
- Save setup, reload, and verify a fresh design inherits the regions and dimensions.
- Upload artwork, create a repeat pattern, add/edit text, duplicate, undo/redo, and hide/lock layers.
- Preview, export a 3 × 3 inch area as a 900 × 900 transparent PNG, save to the library, reopen the editable pattern/text layout, and create a pricing draft.
- Switch decorated and undecorated surfaces, switch active regions, discard setup edits, and use text editing, previews, and setup fields at 390 × 844.
- Verify the generated product's stored region geometry and dimensions directly, then archive the test products and assets.

TypeScript and all 30 regression tests pass. The optimized webpack production build passes. No deployment or test-product publication was performed. AI generation was not invoked during verification.

Browser artifacts are in `/private/tmp/sweetoh-inspection/`: `studio-baseline.png`, `studio-design-after.png`, `studio-setup-after.png`, `studio-preview-after.png`, `studio-mobile-after.png`, `studio-mobile-setup.png`, and `studio-print.png`. The browser harness is `studio-audit.cjs` in that directory.
