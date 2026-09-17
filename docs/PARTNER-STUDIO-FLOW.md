# SweetOh Partner Studio creation flow

Create product opens a visual, searchable blank library. A partner can choose an
existing product or upload a new product photo. Supplier research is optional and
off by default; AI blank cleanup works with an uploaded photo without research.
The existing finished-product photo/listing lane remains available.

The partner Design Studio uses Fabric.js for selection, dragging, resize handles,
rotation, and editable text. Artwork is visible beside the product; uploads are
saved to the library and added without navigating away or resetting existing work.
Layers can be selected, duplicated, removed, aligned, and undone. Surface tabs
keep separate editable layouts; additional views can use uploaded photos or the
same product photo with another print area.

Preview renders each surface without editor guides or handles. Save design keeps
an editable composition in the partner library. Continue creates a private product
draft with every surface mockup, then uses the existing details, pricing, readiness,
and publish actions. Approved product mockups are excluded from the customer
artwork picker. Normal designing, previews, uploads, and saves call no AI provider.

## Existing architecture retained

- Partner authentication and venture-scoped domain services remain authoritative.
- Versioned, validated layer data is stored in the existing asset `composition_layout`
  JSON column; old single-artwork compositions still reopen.
- Reusable surface definitions live in the existing product `print_area` JSON
  column. There are no new tables, migrations, or changes to RLS.
- Signed image URLs are resolved on load; saved layouts contain asset IDs, not
  temporary signed URLs or arbitrary Fabric JSON.
- AI is invoked only by explicit research, clean-blank, or artwork-generation actions.

## Focused validation

`./node_modules/.bin/tsx --test scripts/verify-studio-layout.test.ts` checks layout
roundtrips, bounded transforms, asset IDs, print-area bounds, and unique surfaces.
Type checking and browser checks cover the changed creation path, including React
Strict Mode, multi-layer editing, uploads without data loss, multiple surfaces,
preview/export, save failures, reopening, and a 390px viewport. Live verification
uses private records and stops at publish readiness; it does not publish test
products or spend AI usage.
