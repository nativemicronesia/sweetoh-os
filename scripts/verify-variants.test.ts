import test from "node:test";
import assert from "node:assert/strict";
import {
  assertVariantSelection,
  colorHex,
  defaultPrintAreaFor,
  defaultUpcharges,
  sortColors,
  sortSizes,
  unitPriceCents,
  type VariantOptions,
} from "../lib/domains/catalog/variants";

const tee: VariantOptions = {
  colors: [
    { name: "Black", hex: "#1b1b1b" },
    { name: "Navy", hex: "#1f2a44" },
  ],
  sizes: ["S", "M", "2XL"],
  sizeUpchargeCents: { "2XL": 300 },
};

test("sizes sort the way shoppers expect, not alphabetically", () => {
  assert.deepEqual(sortSizes(["XL", "2XL", "S", "M", "L", "XS"]), ["XS", "S", "M", "L", "XL", "2XL"]);
  assert.deepEqual(sortSizes(["12M", "NB (0-3M)", "6M"]), ["NB (0-3M)", "6M", "12M"]);
});

test("extended sizes get upcharges; others don't", () => {
  assert.deepEqual(defaultUpcharges(["S", "XL", "2XL", "3XL"]), { "2XL": 200, "3XL": 400 });
});

test("unit price adds the size upcharge to the base price", () => {
  assert.equal(unitPriceCents(2500, tee, "2XL"), 2800);
  assert.equal(unitPriceCents(2500, tee, "M"), 2500);
  assert.equal(unitPriceCents(2500, null, null), 2500);
});

test("checkout rejects colors or sizes the product isn't sold in", () => {
  assert.doesNotThrow(() => assertVariantSelection(tee, "Navy", "2XL"));
  assert.throws(() => assertVariantSelection(tee, "Red", "M"), /color/);
  assert.throws(() => assertVariantSelection(tee, "Navy", "5XL"), /size/);
  assert.throws(() => assertVariantSelection(tee, "Navy", null), /size/);
  assert.throws(() => assertVariantSelection(null, "Navy", null), /no color or size/);
  assert.doesNotThrow(() => assertVariantSelection(null, null, null));
});

test("garment color names resolve to believable swatches", () => {
  assert.equal(colorHex("White"), "#ffffff");
  assert.equal(colorHex("CVC Midnight Navy"), colorHex("Midnight Navy"));
  assert.notEqual(colorHex("Heather Maroon"), colorHex("Heather"), "heathers keep their base hue");
  assert.match(colorHex("Some Unknown Shade"), /^#[0-9a-f]{6}$/);
});

test("swatches run white to black, then by hue", () => {
  const names = sortColors([
    { name: "Red", hex: colorHex("Red") },
    { name: "Black", hex: colorHex("Black") },
    { name: "White", hex: colorHex("White") },
    { name: "Royal", hex: colorHex("Royal") },
  ]).map((c) => c.name);
  assert.deepEqual(names, ["White", "Black", "Red", "Royal"]);
});

test("default print area keeps the product's real print proportions", () => {
  const a = defaultPrintAreaFor([{ position: "front", width: 3951, height: 4919 }]);
  assert.ok(Math.abs(a.height / a.width - 4919 / 3951) < 1e-9);
  assert.ok(a.x >= 0 && a.x + a.width <= 1 && a.y + a.height <= 1);
});
