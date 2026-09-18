import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogCategory,
  downloadCatalogImage,
  getPrintifyBlueprint,
  plainCatalogDescription,
} from "../lib/integrations/printify/catalog";

test("catalog categories distinguish kids, apparel, drinkware, home and accessories", () => {
  for (const [title, expected] of [
    ["Infant Fine Jersey Bodysuit", "kids"],
    ["Unisex Heavy Cotton Tee", "apparel"],
    ["Ceramic Mug", "drinkware"],
    ["Canvas Tote Bag", "accessories"],
    ["Canvas Gallery Wrap", "home"],
  ])
    assert.equal(catalogCategory(title), expected);
});
test("catalog descriptions remain plain text rather than executing remote HTML", () => {
  assert.equal(
    plainCatalogDescription(
      "<p>Cotton &amp; comfort</p><img src=x onerror=alert(1)>",
    ),
    "Cotton & comfort",
  );
});
test("image imports reject arbitrary hosts and redirects before downloading", async () => {
  for (const url of [
    "http://images.printify.com/image",
    "https://localhost/image",
    "https://images.printify.com.evil.test/image",
    "https://user:pass@images.printify.com/image",
  ])
    await assert.rejects(
      downloadCatalogImage(url),
      /Unsupported catalog image/,
    );
});
test("blueprint lookup rejects invalid catalog IDs", async () => {
  for (const id of [0, -1, NaN, 1.5, Infinity])
    await assert.rejects(getPrintifyBlueprint(id), /valid catalog product/);
});
