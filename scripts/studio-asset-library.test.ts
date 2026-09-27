import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { productPrintAreaFromStudio, studioLayoutSchema, studioMatchesProductPrintArea } from "../lib/domains/catalog/studio-layout";
import { studioProductArtworkIssue } from "../lib/domains/catalog/studio-product-artwork";
import type { CreativeLibraryAsset } from "../lib/domains/library/model";
import { prepareStudioTemplateCopy } from "../lib/domains/catalog/studio-template-copy";
import { STUDIO_ASSETS, studioAsset, studioAssetUrl } from "../lib/studio/asset-library";
import { STUDIO_FONT_PROVENANCE, resolveStudioFontKey } from "../lib/studio/font-provenance";
import { buildStudioEditorState, findStudioAssets, studioAssetSearchSchema, studioEditorCommandSchema, studioEditorProposalSchema } from "../lib/studio/editor-commands";
import { reorderLayers } from "../lib/studio/layer-order";
import { mockupTemplateSchema } from "../lib/studio/mockup/templates";
import { CONFIRMED_SHOP_METHODS, KNOWLEDGE_ONLY_METHODS } from "../lib/domains/production/methods";
import { drawingDashPattern, STUDIO_DRAW_BRUSHES } from "../lib/studio/drawing-brushes";
import { compactPressureSamples, pointerPressure, pressureSegment } from "../lib/studio/drawing-pressure";
import { STUDIO_DRAW_TEXTURES, studioBrushPresetSchema } from "../lib/studio/drawing-brushes";

test("seed graphics have stable unique identities and explicit provenance", () => {
  assert.ok(STUDIO_ASSETS.length >= 10);
  assert.equal(new Set(STUDIO_ASSETS.map((asset) => asset.id)).size, STUDIO_ASSETS.length);
  for (const asset of STUDIO_ASSETS) {
    assert.ok(asset.name && asset.category && asset.license && asset.source);
    assert.ok(asset.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.equal(studioAsset(asset.id), asset);
    assert.ok(studioAssetUrl(asset).startsWith("data:image/svg+xml"));
  }
});

test("curated Tabler assets keep upstream provenance and commercial-use evidence searchable", () => {
  const tabler = STUDIO_ASSETS.filter((asset) => asset.id.startsWith("tabler-"));
  assert.equal(tabler.length, 112);
  for (const asset of tabler) {
    assert.equal(asset.licenseId, "MIT");
    assert.match(asset.sourceUrl ?? "", /github\.com\/tabler\/tabler-icons\/blob\/[0-9a-f]{40}\/icons\/outline\//);
    assert.match(asset.evidenceUrl ?? "", /github\.com\/tabler\/tabler-icons\/blob\/[0-9a-f]{40}\/LICENSE/);
    assert.equal(asset.commercialUse, true);
    assert.equal(asset.modificationAllowed, true);
    assert.equal(asset.redistributionAllowed, true);
    assert.equal(asset.attributionRequired, true);
    assert.match(asset.attributionText ?? "", /Copyright \(c\) 2020-2026 Paweł Kuna/);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: asset.id }).success, true);
  }
  const result = findStudioAssets({ query: "butterfly", kind: "element", limit: 10 });
  assert.equal(result[0]?.id, "tabler-butterfly-v1");
  assert.equal(result[0]?.sourceKind, "approved_internal");
  assert.equal(result[0]?.licenseId, "MIT");
  assert.equal(result[0]?.commercialUse, true);
  assert.ok(findStudioAssets({ query: "ocean", kind: "element", limit: 50 }).some((asset) => asset.id === "tabler-beach-v1"));
  assert.ok(findStudioAssets({ query: "engraving", kind: "pattern", limit: 50 }).some((asset) => asset.id === "so-engraver-hatch-v1"));
  assert.ok(findStudioAssets({ query: "frame", kind: "element", limit: 50 }).some((asset) => asset.id === "so-double-oval-frame-v1"));
  assert.ok(findStudioAssets({ query: "Christmas", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-christmas-tree-v1"));
  assert.ok(findStudioAssets({ query: "Halloween", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-pumpkin-scary-v1"));
  assert.ok(findStudioAssets({ query: "Easter", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-egg-v1"));
  assert.ok(findStudioAssets({ query: "back to school", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-backpack-v1"));
  assert.ok(findStudioAssets({ query: "wedding", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-rings-v1"));
  assert.ok(findStudioAssets({ query: "faith", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-cross-v1"));
  assert.ok(findStudioAssets({ query: "sports", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-ball-basketball-v1"));
  assert.ok(findStudioAssets({ query: "dog mom", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-dog-v1"));
  assert.ok(findStudioAssets({ query: "occupation", kind: "any", limit: 50 }).some((asset) => asset.id === "tabler-stethoscope-v1"));
});

test("every bundled vector renders as printable pixels", async () => {
  for (const asset of STUDIO_ASSETS) {
    const result = await sharp(Buffer.from(asset.svg)).resize(600, 600).png().toBuffer();
    assert.ok(result.byteLength > 100, asset.id);
  }
});

const base = { version: 1, surfaces: [{ id: "front", name: "Front", assetId: null, area: { x: .2, y: .2, width: .6, height: .6 }, layers: [] }] };
test("old layouts still load and vetted graphics round trip", () => {
  assert.equal(studioLayoutSchema.parse(base).surfaces[0].layers.length, 0);
  const withGraphic: { version: number; surfaces: { id: string; name: string; assetId: null; area: typeof base.surfaces[0]["area"]; layers: Record<string, unknown>[] }[] } = structuredClone(base);
  withGraphic.surfaces[0].layers.push({ kind: "graphic", id: "art-1", assetKey: STUDIO_ASSETS[0].id, x: 200, y: 200, scaleX: 1, scaleY: 1, angle: 0 });
  assert.equal(studioLayoutSchema.parse(withGraphic).surfaces[0].layers[0].kind, "graphic");
  withGraphic.surfaces[0].layers[0].assetKey = "unknown-asset";
  assert.equal(studioLayoutSchema.safeParse(withGraphic).success, false);
});

test("logical group identity persists across layout validation and exposes real capability truth", () => {
  const groupId = "00000000-0000-4000-8000-000000000010";
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "a", kind: "shape", shape: "rect", fill: "#ffffff", x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0, width: 30, height: 30, groupId },
    { id: "b", kind: "text", text: "PLAY", color: "#173e39", fontSize: 32, x: 50, y: 10, scaleX: 1, scaleY: 1, angle: 0, groupId },
  ] }] });
  const snapshot = buildStudioEditorState(layout, "front", ["a", "b"], 1);
  assert.equal(snapshot.layers[0].geometry.groupId, groupId);
  assert.deepEqual(snapshot.selectedLayerIds, ["a", "b"]);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "group_selection", layerIds: ["a", "b"] }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "distribute_selection", layerIds: ["a", "b"], axis: "horizontal" }).success, false);
  assert.deepEqual(CONFIRMED_SHOP_METHODS, ["sublimation", "engraving"]);
  assert.ok(KNOWLEDGE_ONLY_METHODS.includes("embroidery"));
});

test("composition commands validate and multi-layer state survives save/reopen", () => {
  const ids = ["text-1", "asset-1"];
  for (const direction of ["forward", "backward", "front", "back"] as const) {
    assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_order", layerIds: ids, direction }).success, true);
  }
  for (const edge of ["left", "hcenter", "right", "top", "vcenter", "bottom"] as const) {
    assert.equal(studioEditorCommandSchema.safeParse({ type: "align_canvas", layerIds: ids, edge }).success, true);
    assert.equal(studioEditorCommandSchema.safeParse({ type: "align_selection", layerIds: ids, edge }).success, true);
  }
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_flags", layerIds: ids, hidden: true }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_selection_flags", layerIds: ids }).success, false);
  const groupId = "00000000-0000-4000-8000-000000000011";
  const source = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: ids[0], kind: "text", text: "PLAY", color: "#173e39", fontSize: 36, x: 40, y: 50, scaleX: 1, scaleY: 1, angle: 0, groupId },
    { id: ids[1], kind: "image", assetId: "00000000-0000-4000-8000-000000000001", x: 80, y: 70, scaleX: 1, scaleY: 1, angle: 0, groupId, locked: true },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.id), ids);
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.groupId), [groupId, groupId]);
  assert.equal(reopened.surfaces[0].layers[1].kind === "image" && reopened.surfaces[0].layers[1].locked, true);
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /case "set_selection_order": return setLayersOrder/);
  assert.match(editor, /case "align_canvas": return alignCanvas/);
  assert.match(editor, /function setLayersOrder[\s\S]*?checkpoint\(\)[\s\S]*?capture\(\)/);
  assert.match(editor, /function setLayersFlags[\s\S]*?checkpoint\(\)[\s\S]*?capture\(\)/);
});

test("multi-layer z-order moves selected objects as a stable block or one step", () => {
  const layers = ["a", "b", "c", "d", "e"];
  const selected = new Set(["b", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "front"), ["a", "c", "e", "b", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "back"), ["b", "d", "a", "c", "e"]);
  assert.deepEqual(reorderLayers(layers, selected, "forward"), ["a", "c", "b", "e", "d"]);
  assert.deepEqual(reorderLayers(layers, selected, "backward"), ["b", "a", "d", "c", "e"]);
});

test("text styles validate, survive save/reopen and unavailable saved fonts use Inter", () => {
  const style = { type: "set_text_style", font: "montserrat", fontSize: 42, color: "#c8102e", bold: true, italic: true, textAlign: "center", lineHeight: 1.35, letterSpacing: 36, textBoxWidth: 240, text: "Sweet Oh" } as const;
  assert.equal(studioEditorCommandSchema.safeParse(style).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ ...style, font: "unlicensed-font" }).success, false);
  assert.equal(resolveStudioFontKey("montserrat"), "montserrat");
  assert.equal(resolveStudioFontKey("font-removed-from-build"), "inter");
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "type-style", kind: "text", text: style.text, color: style.color, font: style.font, fontSize: style.fontSize, bold: style.bold, italic: style.italic, textAlign: style.textAlign, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textBoxWidth: style.textBoxWidth, x: 20, y: 30, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "legacy-font", kind: "text", text: "Old", color: "#101828", font: "retired-font", fontSize: 24, x: 20, y: 80, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  const snapshot = buildStudioEditorState(reopened, "front", ["type-style"], 2);
  assert.equal(snapshot.layers[0].geometry.textAlign, "center");
  assert.equal(snapshot.layers[0].geometry.textBoxWidth, 240);
  const text = reopened.surfaces[0].layers[0];
  assert.equal(text.kind, "text");
  if (text.kind === "text") assert.deepEqual({ id: text.id, font: text.font, size: text.fontSize, bold: text.bold, italic: text.italic, align: text.textAlign, lineHeight: text.lineHeight, spacing: text.letterSpacing, width: text.textBoxWidth, content: text.text }, { id: "type-style", font: "montserrat", size: 42, bold: true, italic: true, align: "center", lineHeight: 1.35, spacing: 36, width: 240, content: "Sweet Oh" });
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /case "set_text_style"[\s\S]*?changeSelected\([\s\S]*?record\)/);
  assert.match(editor, /function changeSelected\([\s\S]*?if \(record\) checkpoint\(\)[\s\S]*?capture\(\)/);
  assert.match(editor, /new Textbox\(layer\.text[\s\S]*?textBoxWidth/);
  assert.match(editor, /resolveStudioFontKey\(layer\.font\)/);
});

test("image crop, mask, and nondestructive adjustments remain in the production layout", () => {
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "temperature", value: -0.4 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_mask", mask: "rounded" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: 20, y: 10, width: 300, height: 240 }).success, true);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], printRegions: [{ id: "front-art", name: "Front art", bounds: { x: .2, y: .2, width: .5, height: .5 }, shape: "rectangle" }], layers: [
    { id: "creative-image", kind: "image", assetId: "00000000-0000-4000-8000-000000000001", printRegionId: "front-art", crop: { x: 20, y: 10, width: 300, height: 240 }, mask: "rounded", adjustments: { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 }, opacity: .7, shadow: { color: "#000000", opacity: .2, blur: 12, offsetX: 0, offsetY: 4 }, x: 70, y: 80, scaleX: .8, scaleY: .8, angle: 12, flipX: true },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  const image = reopened.surfaces[0].layers[0];
  assert.equal(image.kind, "image");
  if (image.kind === "image") {
    assert.equal(image.assetId, "00000000-0000-4000-8000-000000000001");
    assert.equal(image.printRegionId, "front-art");
    assert.deepEqual(image.crop, { x: 20, y: 10, width: 300, height: 240 });
    assert.deepEqual(image.adjustments, { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 });
    assert.equal(image.mask, "rounded");
    assert.equal(image.opacity, .7);
    assert.equal(image.angle, 12);
    assert.equal(image.flipX, true);
  }
  const snapshot = buildStudioEditorState(reopened, "front", ["creative-image"], 3);
  assert.deepEqual(snapshot.layers[0].geometry.adjustments, { brightness: .15, contrast: -.1, saturation: .2, temperature: -.4, blur: .02 });
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editor, /function imageFiltersFor[\s\S]*?filters\.BlendColor/);
  assert.match(editor, /function setImageAdjustment[\s\S]*?checkpoint\(\)[\s\S]*?applyFilters\(\)/);
  assert.match(editor, /case "set_image_adjustment": return setImageAdjustment\(action\.field, action\.value, record\)/);
  assert.match(editor, /onApply=\{\(px\) => void executeEditorCommand\(\{ type: "crop_image", \.\.\.px \}\)\}/);
  assert.match(editor, /function capture\(\)[\s\S]*?\.\.\.base,[\s\S]*?scheduleMockups\(\)/);
  const cropDialog = readFileSync("app/(partner)/partner/canvas/crop-dialog.tsx", "utf8");
  assert.match(cropDialog, /initialCroppedAreaPixels=\{initial\}/);
});

test("saved Studio designs instantiate independent rights-safe copies and preserve production layout", () => {
  const allowedId = "00000000-0000-4000-8000-000000000001";
  const revokedId = "00000000-0000-4000-8000-000000000002";
  const groupId = "00000000-0000-4000-8000-000000000010";
  const source = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0],
    assetId: allowedId,
    imageRole: "production_blank",
    printRegions: [{ id: "safe-print", name: "Safe print", bounds: { x: .15, y: .2, width: .7, height: .6 }, shape: "rectangle", dimensions: { width: 12, height: 10, unit: "in" } }],
    layers: [
      { id: "copy-text", kind: "text", text: "SweetOh", color: "#173e39", font: "retired-font", fontSize: 34, bold: true, textAlign: "center", x: 32, y: 28, scaleX: 1, scaleY: 1, angle: 0, groupId },
      { id: "approved-image", kind: "image", assetId: allowedId, x: 50, y: 70, scaleX: 1, scaleY: 1, angle: 0, crop: { x: 2, y: 3, width: 40, height: 50 }, adjustments: { brightness: .2, temperature: -.1 } },
      { id: "revoked-image", kind: "image", assetId: revokedId, x: 80, y: 90, scaleX: .7, scaleY: .7, angle: 12 },
    ],
  }] });
  const prepared = prepareStudioTemplateCopy(source, new Set([allowedId]));
  assert.equal(prepared.removedAssetCount, 1);
  assert.equal(prepared.fontFallbackCount, 1);
  const persistedCopy = studioLayoutSchema.parse(JSON.parse(JSON.stringify(prepared.layout)));
  assert.deepEqual(persistedCopy.surfaces[0].layers.map((layer) => layer.id), ["copy-text", "approved-image"]);
  assert.equal(persistedCopy.surfaces[0].imageRole, "production_blank");
  assert.equal(persistedCopy.surfaces[0].printRegions?.[0].id, "safe-print");
  const text = persistedCopy.surfaces[0].layers[0];
  assert.equal(text.kind === "text" && text.font, "inter");
  assert.equal(text.kind === "text" && text.groupId, groupId);
  const image = persistedCopy.surfaces[0].layers[1];
  assert.equal(image.kind === "image" && image.assetId, allowedId);
  assert.deepEqual(image.kind === "image" && image.crop, { x: 2, y: 3, width: 40, height: 50 });
  assert.deepEqual(image.kind === "image" && image.adjustments, { brightness: .2, temperature: -.1 });
  if (persistedCopy.surfaces[0].layers[0].kind === "text") persistedCopy.surfaces[0].layers[0].text = "Independent copy";
  assert.equal(source.surfaces[0].layers[0].kind === "text" && source.surfaces[0].layers[0].text, "SweetOh");

  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  const page = readFileSync("app/(partner)/partner/canvas/page.tsx", "utf8");
  const action = readFileSync("app/(partner)/partner/actions/library.ts", "utf8");
  assert.match(page, /query\.template \?\? query\.composition/);
  assert.match(editor, /\?template=\$\{d\.id\}/);
  assert.match(editor, /draftScope/);
  assert.match(action, /getCreativeLibraryAsset\(\{ ventureId: session\.ventureId, assetId \}\)/);
  assert.match(action, /canInsertCreativeLibraryAsset\(creativeAsset, session\.ventureId\)/);
  assert.match(action, /resolveStudioFontKey\(layer\.font\)/);
});

test("product draft artwork links to the editable composition and persists exact production geometry separately", () => {
  const sourceId = "00000000-0000-4000-8000-000000000001";
  const draftId = "00000000-0000-4000-8000-000000000002";
  const studio = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0], id: "front", position: "front", assetId: sourceId, imageRole: "production_blank",
    area: { x: .18, y: .11, width: .62, height: .72 },
    printRegions: [{ id: "front-print", name: "Front print", bounds: { x: .2, y: .16, width: .5, height: .6 }, shape: "rectangle", dimensions: { width: 10, height: 12, unit: "in" } }],
    layers: [{ id: "source-text", kind: "text", text: "Original artwork", color: "#173e39", font: "montserrat", fontSize: 32, x: 90, y: 80, scaleX: 1, scaleY: 1, angle: 0 }],
  }] });
  const productArea = productPrintAreaFromStudio(studio);
  assert.equal(studioMatchesProductPrintArea(studio, productArea), true);
  assert.equal(studioMatchesProductPrintArea(studio, { ...productArea, surfaces: productArea.surfaces.map((surface) => ({ ...surface, area: { ...surface.area, x: .01 } })) }), false);
  const serializedDesign = JSON.parse(JSON.stringify({ blankProductId: draftId, studio }));
  const reopenedDesign = studioLayoutSchema.parse(serializedDesign.studio);
  assert.equal(serializedDesign.blankProductId, draftId);
  assert.equal(reopenedDesign.surfaces[0].layers[0].kind === "text" && reopenedDesign.surfaces[0].layers[0].text, "Original artwork");
  assert.deepEqual(productArea.surfaces[0].area, studio.surfaces[0].area);
  assert.deepEqual(productArea.surfaces[0].printRegions, studio.surfaces[0].printRegions);
  assert.equal("layers" in productArea.surfaces[0], false);
  assert.equal(studio.surfaces[0].layers.length, 1, "linking a product does not flatten or mutate the source composition");

  const action = readFileSync("app/(partner)/partner/actions/library.ts", "utf8");
  const draftActions = readFileSync("app/(partner)/partner/actions/drafts.ts", "utf8");
  const canvasPage = readFileSync("app/(partner)/partner/canvas/page.tsx", "utf8");
  const review = readFileSync("app/(partner)/partner/review/[id]/page.tsx", "utf8");
  const editor = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  const readiness = readFileSync("lib/domains/catalog/service.ts", "utf8");
  assert.match(action, /getActorProductDraft\(\{ ventureId: session\.ventureId, actorUserId: session\.appUser\.id, productId:/);
  assert.match(action, /isDeepStrictEqual\(source\.compositionLayout\.studio, studio\)/);
  assert.match(action, /blankProductId: applyTarget\?\.product\.id \?\? blankProductId/);
  assert.match(action, /sourceAssetId: composition\.id/);
  assert.match(action, /productPrintAreaFromStudio\(studio\)/);
  assert.match(action, /markProductDraftReviewed\(\{ ventureId: session\.ventureId, productId: target\.id/);
  assert.match(action, /redirect\(`\/partner\/review\/\$\{target\.id\}\?success=/);
  assert.match(draftActions, /updatePartnerDraftAction[\s\S]*?reviewDetailPath\(productId, \{[\s\S]*?success:/);
  assert.match(draftActions, /markPartnerDraftReadyAction[\s\S]*?reviewDetailPath\(productId, \{/);
  assert.match(action, /studioMatchesProductPrintArea\(studio, applyTarget\.product\.printArea\)/);
  assert.match(canvasPage, /draft\.id === query\.targetDraft/);
  assert.match(canvasPage, /editorBlanks\.length === 0/);
  assert.match(canvasPage, /initialApplyTargetId=\{compatibleProductDrafts\.some\(\(draft\) => draft\.id === query\.targetDraft\)/);
  assert.match(action, /return \{ error: getActionErrorMessage\(error\) \}/);
  assert.match(editor, /applyToProductDraftId/);
  assert.match(review, /compositionLayout\?\.studio/);
  assert.match(readiness, /isSweetohPathValid[\s\S]*?isApprovedAssetStatus\(sourceAsset\.status\)/);
});

test("Studio product readiness rechecks current design rights, verified blanks, and exact geometry", () => {
  const blankId = "00000000-0000-4000-8000-000000000001";
  const layerId = "00000000-0000-4000-8000-000000000003";
  const sourceId = "00000000-0000-4000-8000-000000000004";
  const studio = studioLayoutSchema.parse({ ...base, surfaces: [{
    ...base.surfaces[0], id: "front", assetId: blankId, imageRole: "production_blank",
    layers: [{ id: "product-art", kind: "image", assetId: layerId, x: 30, y: 40, scaleX: 1, scaleY: 1, angle: 0 }],
  }] });
  const metadata = {
    kind: "illustration" as const, category: "Artwork", tags: [], productionMethods: [], sourceKind: "partner_upload" as const,
    sourceName: "Partner upload", sourceUrl: null, evidenceUrl: null, licenseId: null, licenseUrl: null,
    commercialUse: false, modificationAllowed: false, redistributionAllowed: false,
    attributionRequired: false, attributionText: null, rightsVerifiedAt: null, rightsVerifiedById: null,
  };
  const creative = (assetId: string): CreativeLibraryAsset => ({
    assetId, ventureId: "venture", ownerId: "owner", assetType: "sweetoh_design", status: "approved",
    authorityLevel: "canonical", name: "Artwork", notes: null, mimeType: "image/png", metadata,
  });
  const design = creative(sourceId);
  const layer = creative(layerId);
  const productSurface = productPrintAreaFromStudio(studio);
  const production = new Map([[blankId, { id: blankId, assetType: "product_asset", status: "approved", notes: "Background removed; reusable blank view." }]]);
  assert.equal(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: production, layerAssets: new Map([[layerId, layer]]) }), null);
  const revokedLayer = { ...layer, metadata: { ...metadata, sourceKind: "licensed_external" as const, sourceName: "External", sourceUrl: "https://example.com/art", evidenceUrl: "https://example.com/license", licenseId: "revoked", rightsVerifiedAt: null, rightsVerifiedById: null } };
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: production, layerAssets: new Map([[layerId, revokedLayer]]) }) ?? "", /commercial product use/);
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: productSurface, design, productionAssets: new Map([[blankId, { ...production.get(blankId)!, status: "draft" }]]), layerAssets: new Map([[layerId, layer]]) }) ?? "", /production blank/);
  const wrongGeometry = { ...productSurface, surfaces: productSurface.surfaces.map((surface) => ({ ...surface, area: { ...surface.area, x: .01 } })) };
  assert.match(studioProductArtworkIssue({ ventureId: "venture", studio, printArea: wrongGeometry, design, productionAssets: production, layerAssets: new Map([[layerId, layer]]) }) ?? "", /print area/);

  const service = readFileSync("lib/domains/catalog/service.ts", "utf8");
  const review = readFileSync("app/(partner)/partner/review/[id]/page.tsx", "utf8");
  assert.match(service, /evaluateProductPublishReadiness[\s\S]*?validateProductStudioArtwork\(existing\)/);
  assert.match(service, /publishProduct[\s\S]*?validateProductStudioArtwork\(existing\)[\s\S]*?throw new ValidationError\(studioArtwork\.issue\)/);
  assert.match(review, /Associated Studio design/);
  assert.match(review, /verified production blank/);
  assert.match(review, /Reopen the associated Studio design to correct it/);
  assert.match(review, /composition=\$\{product\.sourceAssetId\}&targetDraft=\$\{product\.id\}/);
  assert.match(review, /Product workspace/);
  assert.match(review, /Customer listing/);
  assert.match(review, /Production surface &amp; placement/);
  assert.match(review, /id="listing-settings"/);
  assert.match(review, /id="production-overview"/);
  assert.match(review, /id="readiness-details"/);
  assert.match(review, /publishNow/);
  const readinessTransition = service.slice(service.indexOf("export async function markProductDraftReviewed"));
  assert.match(readinessTransition, /const readiness = await evaluateProductPublishReadiness\(input\)/);
  assert.match(readinessTransition, /readiness\.canPublish\s*\?\s*"approved"\s*:\s*"needs_work"/);
  const unpublish = service.slice(service.indexOf("export async function unpublishProduct"), service.indexOf("export async function", service.indexOf("export async function unpublishProduct") + 20));
  assert.match(unpublish, /active: false,\s*draftStatus: nextDraftStatus/);
  assert.doesNotMatch(unpublish, /sourceAssetId\s*:/);
});

test("new shape, image and typography controls stay serializable across save/reopen", () => {
  const layout = structuredClone(base) as typeof base & { surfaces: { layers: Record<string, unknown>[] }[] };
  layout.surfaces[0].layers.push(
    { id: "outlined", kind: "shape", shape: "hexagon", fill: "#ffffff", stroke: "#173e39", strokeWidth: 8, gradient: { from: "#ef476f", to: "#ffd166", direction: "diagonal" }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0, width: 100, height: 90 },
    { id: "image", kind: "image", assetId: "00000000-0000-4000-8000-000000000001", mask: "circle", shadow: { color: "#000000", opacity: .25, blur: 20, offsetX: 0, offsetY: 8 }, adjustments: { brightness: .2, contrast: -.1, saturation: .4, blur: .02 }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "type", kind: "text", text: "PLAY", color: "#173e39", fontSize: 40, font: "anton", bold: true, letterSpacing: 40, outline: "#ffffff", outlineWidth: 2, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 8, opacity: .45, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
  );
  const parsed = studioLayoutSchema.parse(layout);
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(parsed)));
  assert.equal(parsed.surfaces[0].layers[0].kind, "shape");
  assert.equal(parsed.surfaces[0].layers[1].kind, "image");
  assert.equal(parsed.surfaces[0].layers[2].kind, "text");
  assert.equal(parsed.surfaces[0].layers[1].kind === "image" && parsed.surfaces[0].layers[1].mask, "circle");
  assert.equal(reopened.surfaces[0].layers[3].kind, "drawing");
  assert.equal(reopened.surfaces[0].layers[3].opacity, .45);
  const stroke = reopened.surfaces[0].layers[3];
  assert.equal(stroke.kind, "drawing");
  assert.deepEqual(stroke.kind === "drawing" && stroke.brush, undefined); // prior freehand documents retain their pencil appearance
  const unsafePath = structuredClone(layout) as { surfaces: { layers: { pathData?: string }[] }[] };
  unsafePath.surfaces[0].layers[3].pathData = "<svg onload=alert(1)>";
  assert.equal(studioLayoutSchema.safeParse(unsafePath).success, false);
  const invalid = structuredClone(layout) as { surfaces: { layers: { adjustments?: unknown }[] }[] };
  invalid.surfaces[0].layers[1].adjustments = { brightness: 4 };
  assert.equal(studioLayoutSchema.safeParse(invalid).success, false);
});

test("drawing brush identity and opacity survive save/reopen with stable built-in behavior", () => {
  assert.deepEqual(STUDIO_DRAW_BRUSHES.map(({ id }) => id), ["pencil", "marker", "dashed"]);
  assert.equal(drawingDashPattern("pencil", 8), undefined);
  assert.equal(drawingDashPattern("marker", 8), undefined);
  assert.deepEqual(drawingDashPattern("dashed", 8), [13.6, 9.2]);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "marker-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 16, brush: "marker", opacity: 0.42, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "dotted-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 6, brush: "dashed", x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers.map((layer) => layer.kind === "drawing" ? layer.brush : undefined), ["marker", "dashed"]);
  assert.equal(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].opacity, 0.42);
  assert.equal(studioLayoutSchema.safeParse({ ...layout, surfaces: [{ ...layout.surfaces[0], layers: [{ ...layout.surfaces[0].layers[0], kind: "drawing", brush: "airbrush" }] }] }).success, false);
});

test("stylus pressure changes persisted brush segments with mouse/touch fallback and bounded samples", () => {
  assert.equal(pointerPressure({ pointerType: "pen", pressure: 0.2 }), 0.2);
  assert.equal(pointerPressure({ pointerType: "mouse", pressure: 0.9 }), 0.5);
  assert.equal(pointerPressure({ pointerType: "touch", pressure: 0.8 }), 0.5);
  const light = pressureSegment({ x: 0, y: 0, pressure: 0.2 }, { x: 8, y: 0, pressure: 0.2 }, 10, "pencil");
  const firm = pressureSegment({ x: 0, y: 0, pressure: 0.9 }, { x: 8, y: 0, pressure: 0.9 }, 10, "pencil");
  assert.ok(firm.width > light.width);
  assert.ok(pressureSegment({ x: 0, y: 0, pressure: 0.9 }, { x: 8, y: 0, pressure: 0.9 }, 10, "marker").opacity > pressureSegment({ x: 0, y: 0, pressure: 0.2 }, { x: 8, y: 0, pressure: 0.2 }, 10, "marker").opacity);
  assert.equal(compactPressureSamples(Array.from({ length: 500 }, (_, x) => ({ x, y: x / 2, pressure: x / 500 }))).length, 240);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "pressed", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 10, brush: "pencil", pressurePoints: [{ x: 0, y: 1, pressure: .2 }, { x: 14, y: 8, pressure: .9 }], x: 40, y: 60, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].pressurePoints, [{ x: 0, y: 1, pressure: .2 }, { x: 14, y: 8, pressure: .9 }]);
});

test("reusable texture brush presets retain provenance and artwork snapshots across reopen", () => {
  assert.ok(STUDIO_DRAW_TEXTURES.length >= 2);
  for (const texture of STUDIO_DRAW_TEXTURES) assert.ok(texture.source && texture.license);
  const preset = studioBrushPresetSchema.parse({ id: "local-1", name: "Soft weave", baseBrush: "marker", textureId: "sweetoh-woven", textureScale: 1.4, pressureMode: "size-opacity" });
  assert.equal(studioBrushPresetSchema.safeParse({ ...preset, textureId: "remote-image-url" }).success, false);
  assert.ok(pressureSegment({ x: 0, y: 0, pressure: .9 }, { x: 8, y: 0, pressure: .9 }, 10, "marker", preset).width > 10);
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [
    { id: "textured-stroke", kind: "drawing", pathData: "M 0 0 Q 10 20 30 30", stroke: "#173e39", strokeWidth: 10, brush: "marker", brushPreset: preset, pressurePoints: [{ x: 1, y: 2, pressure: .2 }, { x: 12, y: 18, pressure: .9 }], x: 40, y: 60, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].brushPreset, preset);
  assert.deepEqual(reopened.surfaces[0].layers[0].kind === "drawing" && reopened.surfaces[0].layers[0].pressurePoints?.map(({ pressure }) => pressure), [.2, .9]);
});

test("editor command boundary rejects unvetted resources and malformed actions", () => {
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: STUDIO_ASSETS[0].id }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_graphic", assetKey: "remote.svg" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_text", text: "" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_background", color: "#173e39" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_background", color: "url(remote)" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "delete", productId: "other" }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "brightness", value: 0.3 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "blur", value: 2 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_adjustment", field: "blur", value: -.1 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "move", dx: 12, dy: -8 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "resize", width: 120, height: 60, keepRatio: true }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_shape_gradient", from: "#ef476f", to: "#ffd166" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_image_mask", mask: "circle" }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_shadow", enabled: true, blur: 22 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: 0, y: 0, width: 250, height: 250 }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "crop_image", x: -1, y: 0, width: 250, height: 250 }).success, false);
});

test("mockup templates require versioned identity and documented photo rights", () => {
  const template = { id: "sample-v1", version: 1, blankId: "blank-1", position: "front", photo: { reference: "photo-id", rights: "documented_permission", attribution: "Original SweetOh photo" }, quad: [{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}] };
  assert.equal(mockupTemplateSchema.safeParse(template).success, true);
  assert.equal(mockupTemplateSchema.safeParse({ ...template, photo: { ...template.photo, rights: "unknown" } }).success, false);
  assert.equal(mockupTemplateSchema.safeParse({ ...template, quad: [{x:-1,y:0}, ...template.quad.slice(1)] }).success, false);
});

test("AI-facing canvas state is a validated read-only serializable snapshot", () => {
  const layout = studioLayoutSchema.parse({ ...base, surfaces: [{ ...base.surfaces[0], layers: [{ id: "t1", kind: "text", text: "Hello", color: "#173e39", fontSize: 48, x: 22, y: 30, scaleX: 1, scaleY: 1, angle: 0 }] }] });
  const state = buildStudioEditorState(layout, "front", ["t1"], 7);
  assert.equal(state.revision, 7);
  assert.equal(state.layers[0].name, "Hello");
  assert.deepEqual(state.selectedLayerIds, ["t1"]);
  assert.doesNotThrow(() => JSON.stringify(state));
  assert.throws(() => buildStudioEditorState(layout, "missing", [], 0));
});

test("assistant asset search returns only vetted, provenance-labelled Studio resources", () => {
  const results = findStudioAssets({ query: "ocean", kind: "any", limit: 10 });
  assert.ok(results.some((asset) => asset.id === "so-wave-v1"));
  assert.ok(results.every((asset) => asset.source && asset.license));
  assert.equal(studioAssetSearchSchema.safeParse({ query: "x", limit: 500 }).success, false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "set_text_style", font: "made-up-font" }).success, false);
  assert.equal(studioEditorProposalSchema.safeParse({ summary: "Darken the selected image", actions: [{ targetLayerIds: ["img"], command: { type: "set_image_adjustment", field: "brightness", value: -.25 } }] }).success, true);
  assert.equal(studioEditorProposalSchema.safeParse({ summary: "Raw mutation", actions: [{ command: { type: "set_raw_canvas", value: {} } }] }).success, false);
});

test("font notices are bundled for every font in the Studio", () => {
  for (const font of Object.values(STUDIO_FONT_PROVENANCE)) {
    assert.ok(font.source.startsWith("https://github.com/google/fonts/"));
    assert.match(readFileSync(font.notice, "utf8"), font.license.startsWith("Apache") ? /Apache License/i : /SIL OPEN FONT LICENSE/i);
  }
});
