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

## Creative scope beyond predefined POD categories

Studio's knowledge model is not limited to POD, library elements or a fixed
set of design categories. It should reflect the full range of what people
genuinely create and express, documented as general creative knowledge with
the same production/knowledge split used above — a knowledge article is
never a capability claim.

**Tattoo design (general craft, knowledge only, not a production method).**
SweetOh does not tattoo; this is documented the same way DTF or embroidery
are — general knowledge, no shop capability implied. Verified, citable
design fundamentals worth carrying: American Traditional flash composition
(bold clean outlines, a limited primary-color palette, black shading for
depth, balanced multi-design sheet layout, hand-lettering); linework-only
style (precision, clean outlines, minimal/no shading, deliberate negative
space); and the practical difference between hand-poke/stick-and-poke
(single needle, manual, organic line quality — the older method) and
machine tattooing (motor-driven, supports fine detail, shading and color
work). Sources: [Lighthouse
Tattoo](https://www.lighthousetattoo.com.au/traditional-flash-sheet/),
[Tattooing101](https://tattooing101.com/learn/techniques/design/flash-art/),
[Big Cat Tattoo](https://www.bigcattattoo.com/blog/what-is-tattoo-flash),
[Stylecaster](https://stylecaster.com/beauty/skin-care/718688/hand-poke-versus-machine-tattoos/).

**Parked — Micronesian/Pacific tatau and other lineage-restricted cultural
material: do not ingest as generic reusable reference or Creative Library
stock; this needs an explicit owner decision, not an autonomous one.**
Independent research (Lars Krutak's ethnographic synthesis of Marshallese,
Yapese and Pohnpeian tattoo traditions) documents these as historically
rank-, gender- and lineage-restricted — chief-only and courtesan-only marks,
tattooists and recipients determined by status, some patterns applied only
by specific specialists. This is not a copyright-licensing question a CC0
or public-domain tag can resolve; it is a living cultural-ownership
question. The same pattern shows up institutionally: Auckland War Memorial
Museum explicitly closes its Pacific collections and taonga Māori as an
exception to its own open-access-by-default policy, and Te Papa Tongarewa
licenses Pacific/taonga items per-object rather than in bulk, precisely
because cultural status can override a technical rights clearance. SweetOh's
pipeline should not be more permissive than the source cultures' own
stewards. The same caution applies to tapa/siapo (Pacific bark cloth)
patterns and other taonga-adjacent decorative material even where a
technically public-domain reproduction exists via a third-party archive.
If the owner later wants to pursue this, the right shape is almost
certainly historical/educational description sourced to named ethnographers
— not motif imagery treated as reusable stock.

## Safe future structure

Keep method reference material versioned and source-attributed. Make capability a separate record keyed to an actual shop or approved production partner, method, supported material/product, printable area, color/file constraints, availability and effective dates. Quotes and accepted production orders must snapshot the enabled capability version and validated artwork requirements. Do not infer availability from a knowledge article or an AI response.

## Shipped in the current Studio phase

- Persisted logical group IDs; multi-select from the layer list; multi-object duplicate, delete, opacity/style changes, grouping, ungrouping, alignment to the selection bounds, and even distribution.
- Native freehand strokes saved as constrained path data (no raw SVG markup), with Pencil, translucent Marker and dashed-line brushes. Stylus pressure changes segment width, and Marker pressure also changes opacity; local pressure samples persist with each drawing layer for reproducible reopening. Mouse and ordinary touch use a steady fallback. Creators can change brush, color, width and opacity after selection; the existing print-area clipping, eraser and document history workflows apply to pressure drawings too. The stroke eraser hits only painted pixels of drawing layers and groups each drag into one undo checkpoint. Physical Apple Pencil/stylus hardware was not available for this phase.
- Creators can save reusable textured brush presets from SweetOh-original procedural grain and woven tiles, choosing their base brush, texture scale and pressure response. Artwork stores an immutable preset recipe snapshot and pressure samples; reusable presets are local to the current browser. Texture source/license metadata is held with the Studio resource registry. No third-party brush assets are bundled.
- A typed editor command boundary and authenticated `/api/studio/editor-proposals` adapter. The model receives only a validated serializable canvas snapshot and a provenance-labelled search slice from SweetOh's asset registry. It returns schema-checked commands that can reference only known layers, vetted fonts/assets and defined print regions.
- AI proposals are reviewable in Studio and do not alter the canvas before acceptance. Accepted actions use existing editor functions and one undo checkpoint; failures restore the prior document. Creator requests are metered through the existing credit system.
- Confirmed shop-method knowledge is represented separately from broad method education: sublimation and engraving are confirmed; DTF, DTG, screen printing, embroidery and HTV/vinyl are knowledge only. No method-specific production guarantees are inferred from that list.

## Still planned / unproven

- Imported custom brushes, downloadable brush packs, blending, Bezier path editing and additional text effects are not part of this phase.
- There are no rights-cleared garment mockup photos paired with validated per-product print geometry yet. Flat rendering remains the honest fallback; the template schema is groundwork, not an operational 3D mockup feature.
- AI has no live-provider workflow tests. The current API and command schemas prove the boundary, while model quality, selected-layer targeting, stale-response handling and undo/rollback need hands-on browser testing across creator and partner sessions.
- The print-region preparation command fits artwork to saved geometry; method-specific profiles, physical print dimensions, color checks and order acceptance rules still need authoritative production data.

Focused Studio tests, TypeScript and the production build pass for this phase. The authenticated route and typed proposal boundary are implemented, but the live provider → signed-in Studio → accepted edit → persisted reopen/undo loop has not been exercised because no authorized signed-in test session was available. Repository-wide ESLint still reports unrelated existing errors outside the changed Studio files; changed-file lint is reported separately in the phase handoff.
