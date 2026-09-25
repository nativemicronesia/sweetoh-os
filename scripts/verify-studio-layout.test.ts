import test from "node:test";
import assert from "node:assert/strict";
import {
  studioLayoutSchema,
  areaSchema,
  inferSurfaceImageRole,
  productionSurfacePhoto,
} from "../lib/domains/catalog/studio-layout";
const layer = {
  id: "art",
  kind: "image",
  assetId: "11111111-1111-4111-8111-111111111111",
  x: 120,
  y: 160,
  scaleX: 0.4,
  scaleY: 0.4,
  angle: 45,
};
const area = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
const document = {
  version: 1,
  surfaces: [
    { id: "front", name: "Front", assetId: null, area, layers: [layer] },
    {
      id: "back",
      name: "Back",
      assetId: null,
      area,
      layers: [{ ...layer, id: "copy", x: 300 }],
    },
  ],
};
test("multi-surface layout roundtrips editable artwork placements", () =>
  assert.deepEqual(
    studioLayoutSchema.parse(JSON.parse(JSON.stringify(document))),
    document,
  ));
test("rejects nonfinite transforms, unsafe asset references, and too many layers", () => {
  for (const bad of [
    { ...layer, x: Infinity },
    { ...layer, assetId: "https://untrusted.example/image.png" },
    { ...layer, scaleX: -1 },
  ])
    assert.equal(
      studioLayoutSchema.safeParse({
        ...document,
        surfaces: [{ ...document.surfaces[0], layers: [bad] }],
      }).success,
      false,
    );
  assert.equal(
    studioLayoutSchema.safeParse({
      ...document,
      surfaces: [{ ...document.surfaces[0], layers: Array(51).fill(layer) }],
    }).success,
    false,
  );
});
test("print areas must remain inside the product canvas", () => {
  assert.equal(areaSchema.safeParse({ ...area, x: 0.8 }).success, false);
  assert.equal(areaSchema.safeParse({ ...area, width: 0 }).success, false);
  assert.equal(areaSchema.safeParse(area).success, true);
});
test("only verified production blank assets are used as Studio product backgrounds", () => {
  const assetId = "11111111-1111-4111-8111-111111111111";
  const signed = { [assetId]: "https://assets.example/blank.png" };
  const cleanRole = inferSurfaceImageRole({ assetId, imageRole: undefined, assetNotes: "Background removed; reusable blank view." });
  assert.equal(cleanRole, "production_blank");
  assert.equal(productionSurfacePhoto({ assetId, imageRole: cleanRole }, signed), signed[assetId]);

  const catalogUrl = "https://images.printify.com/product/example.png";
  const catalogRole = inferSurfaceImageRole({ assetId: null, imageUrl: catalogUrl, catalogImages: [catalogUrl] });
  assert.equal(catalogRole, "catalog_reference");
  assert.equal(productionSurfacePhoto({ assetId: null, imageRole: catalogRole }, signed), null);

  const generatedRole = inferSurfaceImageRole({ assetId, assetNotes: "AI-generated visual preview. Verify appearance before production." });
  assert.equal(generatedRole, "customer_mockup");
  assert.equal(productionSurfacePhoto({ assetId, imageRole: generatedRole }, signed), null);
  const unknownRole = inferSurfaceImageRole({ assetId, assetNotes: "Original partner product photo." });
  assert.equal(unknownRole, "unverified");
  assert.equal(productionSurfacePhoto({ assetId, imageRole: unknownRole }, signed), null);
  assert.equal(productionSurfacePhoto({ assetId }, signed), null, "untagged legacy photos stay off the canvas until server provenance resolves them");
});
test("surface ids cannot collide on reopen", () =>
  assert.equal(
    studioLayoutSchema.safeParse({
      ...document,
      surfaces: [document.surfaces[0], document.surfaces[0]],
    }).success,
    false,
  ));

test("partner-defined print regions survive save and reopen without template restrictions", () => {
  const regions = [
    { id: "badge", name: "Chest badge", shape: "ellipse", bounds: { x: .45, y: .3, width: .1, height: .1 }, dimensions: { width: 3, height: 3, unit: "in" } },
    { id: "wrap", name: "Full surface", shape: "rectangle", bounds: { x: 0, y: 0, width: 1, height: 1 }, dimensions: { width: 80, height: 140, unit: "cm" } },
    { id: "custom", name: "Custom panel", shape: "polygon", bounds: area, points: [{ x: 0, y: 0 }, { x: 1, y: .2 }, { x: .7, y: 1 }, { x: .2, y: .8 }] },
  ];
  const input = { ...document, surfaces: [{ ...document.surfaces[0], printRegions: regions, layers: [{ ...layer, hidden: true, locked: true }] }] };
  assert.deepEqual(studioLayoutSchema.parse(JSON.parse(JSON.stringify(input))), input);
});

test("production-image roles roundtrip with the saved print-area geometry", () => {
  const surface = {
    ...document.surfaces[0],
    assetId: "11111111-1111-4111-8111-111111111111",
    referenceAssetId: "22222222-2222-4222-8222-222222222222",
    imageRole: "production_blank",
    area,
    printRegions: [{ id: "front-print", name: "Front print", shape: "rectangle", bounds: area, dimensions: { width: 12, height: 14, unit: "in" } }],
  };
  const layout = { version: 1 as const, surfaces: [surface] };
  assert.deepEqual(studioLayoutSchema.parse(JSON.parse(JSON.stringify(layout))), layout);
});

test("reference photos remain separate from the verified canvas blank", () => {
  const productionId = "11111111-1111-4111-8111-111111111111";
  const referenceId = "22222222-2222-4222-8222-222222222222";
  const surface = studioLayoutSchema.parse({
    ...document,
    surfaces: [{ ...document.surfaces[0], assetId: productionId, referenceAssetId: referenceId, imageRole: "production_blank" }],
  }).surfaces[0];
  assert.equal(productionSurfacePhoto(surface, {
    [productionId]: "https://assets.example/clean-blank.png",
    [referenceId]: "https://assets.example/lifestyle-reference.png",
  }), "https://assets.example/clean-blank.png");
});

test("deleting all print areas is distinct from a legacy product's default area", async () => {
  const { regionsFor } = await import("../lib/domains/catalog/studio-layout");
  const legacy = studioLayoutSchema.parse(document).surfaces[0];
  assert.equal(regionsFor(legacy).length, 1);
  assert.deepEqual(regionsFor({ ...legacy, printRegions: [] }), []);
  assert.deepEqual(studioLayoutSchema.parse({ ...document, surfaces: [{ ...legacy, printRegions: [] }] }).surfaces[0].printRegions, []);
});

test("invalid production geometry and duplicate region identifiers cannot be persisted", () => {
  const region = { id: "area", name: "Area", shape: "rectangle", bounds: area };
  for (const regions of [
    [region, region],
    [{ ...region, name: " " }],
    [{ ...region, shape: "polygon" }],
    [{ ...region, shape: "polygon", points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }] }],
    [{ ...region, dimensions: { width: 0, height: 3, unit: "in" } }],
    [{ ...region, bounds: { ...area, x: .9 } }],
  ]) assert.equal(studioLayoutSchema.safeParse({ ...document, surfaces: [{ ...document.surfaces[0], printRegions: regions }] }).success, false);
});
