# SweetOh creative and production knowledge boundary

SweetOh AI is the shared specialized intelligence. Green Tree Skink is the lead operator; Western Skinks and Western Fence Lizards are future subordinate agents that may use the intelligence within scoped roles. Autonomous agent workflows are not active. Canvas edits must remain typed, reviewable editor commands so users see the change, can undo it, and retain normal save and print-area validation.

## Knowledge model

Creative guidance should cover design fundamentals (composition, contrast, hierarchy, color, typography, illustration, repeat patterns, accessibility and file preparation) and broadly explain decoration methods. Store method guidance separately from SweetOh's current production capability. A general explanation is not a quote, an available option, or a promise that SweetOh can produce it.

| Method | General knowledge scope | SweetOh availability in this repository |
| --- | --- | --- |
| Sublimation | Substrate and transfer constraints; suitable raster/vector artwork | Confirmed SweetOh shop method |
| Engraving | Material, line-weight and depth constraints | Confirmed SweetOh shop method |
| DTF | Transparent artwork, fine detail and transfer constraints | Knowledge only; not a confirmed shop method |
| DTG | Garment, opacity, underbase and raster constraints | Knowledge only; not a confirmed shop method |
| Screen printing | Spot-color separations, trapping and minimum detail | Knowledge only; not a confirmed shop method |
| Embroidery | Stitch density, underlay, pull compensation and digitization | Knowledge only; not a confirmed shop method |
| HTV / cut vinyl | Weeding, mirrored cut files and minimum stroke constraints | Knowledge only; not a confirmed shop method |

SweetOh currently confirms sublimation and engraving as shop production methods. Other methods remain educational knowledge only. The repository still lacks an authoritative registry of machines, substrates, printable product/region combinations, method-specific acceptance rules and capacity; the method names alone do not validate a particular order or artwork.

## Safe future structure

Keep method reference material versioned and source-attributed. Make capability a separate record keyed to an actual shop or approved production partner, method, supported material/product, printable area, color/file constraints, availability and effective dates. Quotes and accepted production orders must snapshot the enabled capability version and validated artwork requirements. Do not infer availability from a knowledge article or an AI response.

## Shipped in the current Studio phase

- Persisted logical group IDs; multi-select from the layer list; multi-object duplicate, delete, opacity/style changes, grouping, ungrouping, alignment to the selection bounds, and even distribution.
- Native freehand strokes saved as constrained SVG path commands (no raw SVG markup), with Pencil, translucent Marker and dashed-line brushes. Brush identity and opacity persist with each stroke; creators can change brush, color, width and opacity after selection. Finger, stylus and mouse share the same path, print-area clipping, eraser and document history workflow. The stroke eraser hits only painted pixels of drawing layers and groups each drag into one undo checkpoint.
- A typed editor command boundary and authenticated `/api/studio/editor-proposals` adapter. The model receives only a validated serializable canvas snapshot and a provenance-labelled search slice from SweetOh's asset registry. It returns schema-checked commands that can reference only known layers, vetted fonts/assets and defined print regions.
- AI proposals are reviewable in Studio and do not alter the canvas before acceptance. Accepted actions use existing editor functions and one undo checkpoint; failures restore the prior document. Creator requests are metered through the existing credit system.
- Confirmed shop-method knowledge is represented separately from broad method education: sublimation and engraving are confirmed; DTF, DTG, screen printing, embroidery and HTV/vinyl are knowledge only. No method-specific production guarantees are inferred from that list.

## Still planned / unproven

- Pressure-sensitive input, custom/texture brushes, brush libraries, blending, Bezier path editing and additional text effects are not part of this phase.
- There are no rights-cleared garment mockup photos paired with validated per-product print geometry yet. Flat rendering remains the honest fallback; the template schema is groundwork, not an operational 3D mockup feature.
- AI has no live-provider workflow tests. The current API and command schemas prove the boundary, while model quality, selected-layer targeting, stale-response handling and undo/rollback need hands-on browser testing across creator and partner sessions.
- The print-region preparation command fits artwork to saved geometry; method-specific profiles, physical print dimensions, color checks and order acceptance rules still need authoritative production data.

Focused Studio tests, TypeScript and the production build pass for this phase. The authenticated route and typed proposal boundary are implemented, but the live provider → signed-in Studio → accepted edit → persisted reopen/undo loop has not been exercised because no authorized signed-in test session was available. Repository-wide ESLint still reports unrelated existing errors outside the changed Studio files; changed-file lint is reported separately in the phase handoff.
