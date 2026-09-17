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
