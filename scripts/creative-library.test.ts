import test from "node:test";
import assert from "node:assert/strict";
import { canUseCreativeLibraryAsset, creativeLibraryMetadataSchema, type CreativeLibraryAsset } from "../lib/domains/library/model";
import { normalizeCreativeLibraryAsset } from "../lib/domains/library/service";

const external = creativeLibraryMetadataSchema.parse({
  kind: "vector", category: "Nature", tags: ["leaf"], productionMethods: ["sublimation"],
  sourceKind: "licensed_external", sourceName: "Example Library", sourceUrl: "https://assets.example/leaf.svg",
  evidenceUrl: "https://assets.example/license", licenseId: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  commercialUse: true, modificationAllowed: true, redistributionAllowed: false, attributionRequired: true,
  attributionText: "Leaf by Example Library", rightsVerifiedAt: null, rightsVerifiedById: null,
});
const record: CreativeLibraryAsset = {
  assetId: "asset-1", ventureId: "venture-1", ownerId: "user-1", assetType: "sweetoh_design", status: "approved",
  authorityLevel: "licensed", name: "Leaf", notes: null, metadata: external,
};

test("external artwork stays blocked until a named reviewer verifies recorded source and license evidence", () => {
  assert.equal(canUseCreativeLibraryAsset(record, { ventureId: "venture-1", use: "studio_edit" }), false);
  const verified = { ...record, metadata: { ...external, rightsVerifiedAt: new Date().toISOString(), rightsVerifiedById: "11111111-1111-4111-8111-111111111111" } };
  assert.equal(canUseCreativeLibraryAsset(verified, { ventureId: "venture-1", use: "studio_edit" }), true);
  assert.equal(canUseCreativeLibraryAsset(verified, { ventureId: "venture-1", use: "commercial_product" }), true);
  assert.equal(canUseCreativeLibraryAsset(verified, { ventureId: "venture-1", use: "redistribute_source" }), false);
  assert.equal(canUseCreativeLibraryAsset({ ...record, metadataInvalid: true }, { ventureId: "venture-1", use: "studio_edit" }), false);
});

test("each licensed reuse permission is checked independently, including attribution", () => {
  const verified = { ...record, metadata: { ...external, rightsVerifiedAt: new Date().toISOString(), rightsVerifiedById: "11111111-1111-4111-8111-111111111111" } };
  assert.equal(canUseCreativeLibraryAsset({ ...verified, metadata: { ...verified.metadata!, commercialUse: false } }, { ventureId: "venture-1", use: "commercial_product" }), false);
  assert.equal(canUseCreativeLibraryAsset({ ...verified, metadata: { ...verified.metadata!, modificationAllowed: false } }, { ventureId: "venture-1", use: "studio_edit" }), false);
  assert.equal(canUseCreativeLibraryAsset({ ...verified, metadata: { ...verified.metadata!, redistributionAllowed: true } }, { ventureId: "venture-1", use: "redistribute_source" }), true);
  assert.equal(creativeLibraryMetadataSchema.safeParse({ ...verified.metadata, attributionText: null }).success, false);
});

test("production methods remain relevance metadata and include SweetOh's confirmed methods", () => {
  const metadata = creativeLibraryMetadataSchema.parse({
    ...external, productionMethods: ["sublimation", "engraving"],
  });
  assert.deepEqual(metadata.productionMethods, ["sublimation", "engraving"]);
});

test("external metadata requires source, license, evidence, and usable attribution text", () => {
  assert.equal(creativeLibraryMetadataSchema.safeParse({ ...external, sourceUrl: null }).success, false);
  assert.equal(creativeLibraryMetadataSchema.safeParse({ ...external, attributionText: null }).success, false);
});

test("approved legacy partner designs retain existing Studio and customer use but cannot be redistributed as source", () => {
  const legacy = { ...record, ventureId: "venture-1", authorityLevel: "canonical" as const, metadata: null };
  assert.equal(canUseCreativeLibraryAsset(legacy, { ventureId: "venture-1", use: "studio_edit" }), true);
  assert.equal(canUseCreativeLibraryAsset(legacy, { ventureId: "venture-1", use: "commercial_product" }), true);
  assert.equal(canUseCreativeLibraryAsset(legacy, { ventureId: "other-venture", use: "studio_edit" }), false);
  assert.equal(canUseCreativeLibraryAsset(legacy, { ventureId: "venture-1", use: "redistribute_source" }), false);
  assert.equal(canUseCreativeLibraryAsset({ ...legacy, authorityLevel: "licensed" }, { ventureId: "venture-1", use: "studio_edit" }), true);
  assert.equal(canUseCreativeLibraryAsset({ ...legacy, status: "draft", authorityLevel: "licensed" }, { ventureId: "venture-1", use: "studio_edit" }), false);
});

test("partner uploads retain draft Studio editing while customer use still requires approval", () => {
  const metadata = creativeLibraryMetadataSchema.parse({
    ...external, sourceKind: "partner_upload", sourceName: "Partner workspace upload",
    sourceUrl: null, evidenceUrl: null, licenseId: null, licenseUrl: null,
    commercialUse: false, modificationAllowed: false,
  });
  const draft = { ...record, authorityLevel: "canonical" as const, status: "draft" as const, metadata };
  assert.equal(canUseCreativeLibraryAsset(draft, { ventureId: "venture-1", use: "studio_edit" }), true);
  assert.equal(canUseCreativeLibraryAsset(draft, { ventureId: "venture-1", use: "commercial_product" }), false);
});

test("persisted metadata round-trips through the Studio mapper and tenant-mismatched evidence fails closed", () => {
  const at = new Date().toISOString();
  const persistedMetadata = {
    kind: external.kind, category: external.category, tags: external.tags,
    productionMethods: external.productionMethods, sourceKind: external.sourceKind,
    sourceName: external.sourceName, sourceUrl: external.sourceUrl, evidenceUrl: external.evidenceUrl,
    licenseId: external.licenseId, licenseUrl: external.licenseUrl,
    commercialUse: external.commercialUse, modificationAllowed: external.modificationAllowed,
    redistributionAllowed: external.redistributionAllowed, attributionRequired: external.attributionRequired,
    attributionText: external.attributionText, rightsVerifiedAt: at,
    rightsVerifiedById: "11111111-1111-4111-8111-111111111111",
  };
  const assetRow = {
    id: "asset-1", ventureId: "venture-1", uploadedById: "user-1", assetType: "sweetoh_design",
    status: "approved", mimeType: "image/svg+xml", authorityLevel: "licensed", name: "Leaf", notes: null,
  } as unknown as Parameters<typeof normalizeCreativeLibraryAsset>[0];
  const metadataRow = {
    assetId: "asset-1", ventureId: "venture-1", ...persistedMetadata,
    rightsVerifiedAt: new Date(at), createdAt: new Date(at), updatedAt: new Date(at),
  } as unknown as NonNullable<Parameters<typeof normalizeCreativeLibraryAsset>[1]>;

  const loaded = normalizeCreativeLibraryAsset(assetRow, metadataRow);
  assert.equal(loaded.metadataInvalid, false);
  assert.equal(loaded.metadata?.licenseId, external.licenseId);
  assert.equal(loaded.metadata?.rightsVerifiedById, persistedMetadata.rightsVerifiedById);
  assert.equal(canUseCreativeLibraryAsset(loaded, { ventureId: "venture-1", use: "studio_edit" }), true);

  const mismatched = normalizeCreativeLibraryAsset(assetRow, { ...metadataRow, ventureId: "venture-2" });
  assert.equal(mismatched.metadataInvalid, true);
  assert.equal(canUseCreativeLibraryAsset(mismatched, { ventureId: "venture-1", use: "studio_edit" }), false);
});
