import test from "node:test";
import assert from "node:assert/strict";
import {
  studioLayoutSchema,
  areaSchema,
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
