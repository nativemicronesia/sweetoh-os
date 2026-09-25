import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { studioLayoutSchema } from "../lib/domains/catalog/studio-layout";
import { STUDIO_ASSETS, studioAsset, studioAssetUrl } from "../lib/studio/asset-library";
import { STUDIO_FONT_PROVENANCE } from "../lib/studio/font-provenance";
import { buildStudioEditorState, findStudioAssets, studioAssetSearchSchema, studioEditorCommandSchema, studioEditorProposalSchema } from "../lib/studio/editor-commands";
import { mockupTemplateSchema } from "../lib/studio/mockup/templates";
import { CONFIRMED_SHOP_METHODS, KNOWLEDGE_ONLY_METHODS } from "../lib/domains/production/methods";

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

test("new shape, image and typography controls stay serializable across save/reopen", () => {
  const layout = structuredClone(base) as typeof base & { surfaces: { layers: Record<string, unknown>[] }[] };
  layout.surfaces[0].layers.push(
    { id: "outlined", kind: "shape", shape: "hexagon", fill: "#ffffff", stroke: "#173e39", strokeWidth: 8, gradient: { from: "#ef476f", to: "#ffd166", direction: "diagonal" }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0, width: 100, height: 90 },
    { id: "image", kind: "image", assetId: "00000000-0000-4000-8000-000000000001", adjustments: { brightness: .2, contrast: -.1, saturation: .4, blur: .02 }, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
    { id: "type", kind: "text", text: "PLAY", color: "#173e39", fontSize: 40, font: "anton", bold: true, letterSpacing: 40, outline: "#ffffff", outlineWidth: 2, x: 10, y: 10, scaleX: 1, scaleY: 1, angle: 0 },
  );
  const parsed = studioLayoutSchema.parse(layout);
  assert.equal(parsed.surfaces[0].layers[0].kind, "shape");
  assert.equal(parsed.surfaces[0].layers[1].kind, "image");
  assert.equal(parsed.surfaces[0].layers[2].kind, "text");
  const invalid = structuredClone(layout) as { surfaces: { layers: { adjustments?: unknown }[] }[] };
  invalid.surfaces[0].layers[1].adjustments = { brightness: 4 };
  assert.equal(studioLayoutSchema.safeParse(invalid).success, false);
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
