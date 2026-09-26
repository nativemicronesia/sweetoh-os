import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { canInsertCreativeLibraryAsset, creativeLibraryMetadataSchema, type CreativeLibraryAsset } from "../lib/domains/library/model";
import { studioLayoutSchema } from "../lib/domains/catalog/studio-layout";
import { filterStudioCreativeAssets, type StudioCreativeAssetOption } from "../lib/studio/creative-library-browser";
import { studioEditorCommandSchema } from "../lib/studio/editor-commands";

const id = "00000000-0000-4000-8000-000000000021";
const externalMetadata = creativeLibraryMetadataSchema.parse({
  kind: "vector", category: "Ocean", tags: ["wave", "island"], productionMethods: ["sublimation"],
  sourceKind: "licensed_external", sourceName: "Verified artist", sourceUrl: "https://example.test/wave.svg",
  evidenceUrl: "https://example.test/license-proof", licenseId: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  commercialUse: true, modificationAllowed: true, redistributionAllowed: false,
  attributionRequired: true, attributionText: "Wave by verified artist", rightsVerifiedAt: null, rightsVerifiedById: null,
});
const externalAsset: CreativeLibraryAsset = {
  assetId: id, ventureId: "venture-1", ownerId: "user-1", assetType: "sweetoh_design", status: "approved",
  mimeType: "image/svg+xml", authorityLevel: "licensed", name: "Ocean wave", notes: null, metadata: externalMetadata,
};

test("library filtering supports kind, category, tag and production relevance", () => {
  const entries: StudioCreativeAssetOption[] = [
    { id, name: "Ocean wave", previewUrl: "/signed.svg", kind: "vector", category: "Ocean", tags: ["wave", "island"], productionMethods: ["sublimation"], sourceName: "Verified artist", licenseId: "CC-BY-4.0" },
    { id: "other", name: "Island bloom", previewUrl: "/signed.png", kind: "illustration", category: "Floral", tags: ["flower"], productionMethods: ["engraving"], sourceName: "SweetOh", licenseId: "Original" },
  ];
  assert.deepEqual(filterStudioCreativeAssets(entries, { query: "wave", kind: "vector", category: "Ocean", tag: "island", productionMethod: "sublimation" }).map((item) => item.id), [id]);
  assert.deepEqual(filterStudioCreativeAssets(entries, { productionMethod: "engraving" }).map((item) => item.id), ["other"]);
});

test("verified rights gate precedes insertion, and the image command persists through layout reopen", () => {
  assert.equal(canInsertCreativeLibraryAsset(externalAsset, "venture-1"), false);
  const approved = { ...externalAsset, metadata: { ...externalMetadata, rightsVerifiedAt: new Date().toISOString(), rightsVerifiedById: "11111111-1111-4111-8111-111111111111" } };
  assert.equal(canInsertCreativeLibraryAsset(approved, "venture-1"), true);
  assert.equal(canInsertCreativeLibraryAsset(approved, "another-venture"), false);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_library_asset", assetId: id }).success, true);
  assert.equal(studioEditorCommandSchema.safeParse({ type: "add_library_asset", assetId: "not-an-id" }).success, false);

  const layout = studioLayoutSchema.parse({ version: 1, surfaces: [{ id: "front", name: "Front", assetId: null, area: { x: .2, y: .2, width: .6, height: .6 }, layers: [
    { id: "inserted-layer", kind: "image", assetId: id, x: 200, y: 180, scaleX: 1, scaleY: 1, angle: 0 },
  ] }] });
  const reopened = studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout)));
  assert.equal(reopened.surfaces[0].layers[0].kind, "image");
  assert.equal(reopened.surfaces[0].layers[0].kind === "image" && reopened.surfaces[0].layers[0].assetId, id);

  const editorSource = readFileSync("app/(partner)/partner/canvas/product-editor.tsx", "utf8");
  assert.match(editorSource, /case "add_library_asset": return addCreativeLibraryAsset\(action\.assetId\)/);
  assert.match(editorSource, /urls\.current\[resolved\.assetId\] = resolved\.previewUrl;\s+await addArtwork\(resolved\.assetId\)/);
  assert.match(editorSource, /async function addArtwork\(id: string\)[\s\S]*?checkpoint\(\);[\s\S]*?capture\(\);/);
});
