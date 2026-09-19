import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { removeUniformBackground, opaqueBox, skinShare } from "../lib/studio/cutout";
import { studioLayoutSchema } from "../lib/domains/catalog/studio-layout";

const svg = (body: string, bg = "#ffffff") =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${bg}"/>${body}</svg>`);

test("plain backdrop is removed locally and small pieces of artwork survive", async () => {
  const png = await sharp(svg('<circle cx="300" cy="240" r="150" fill="#e2566d"/><rect x="120" y="470" width="40" height="60" fill="#1f2a44"/><rect x="440" y="470" width="40" height="60" fill="#1f2a44"/>')).png().toBuffer();
  const cut = await removeUniformBackground(png);
  assert.equal(cut.ok, true);
  const { data, info } = await sharp(cut.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, "corner is transparent");
  const box = await opaqueBox(cut.png);
  assert.ok(box && box.width > 0.8, "the small marks at the bottom corners are kept");
  assert.ok(info.width < 600, "cropped to the subject");
});

test("products drop stray islands such as loose shadows", async () => {
  const png = await sharp(svg('<rect x="150" y="100" width="300" height="360" fill="#ffffff" stroke="#333" stroke-width="6"/><rect x="40" y="540" width="14" height="10" fill="#555"/>', "#c9cbbf")).png().toBuffer();
  const cut = await removeUniformBackground(png, { dropIslands: true });
  assert.equal(cut.ok, true);
  const box = await opaqueBox(cut.png);
  assert.ok(box && box.height > 0.85 && box.width > 0.85, "only the product remains");
});

test("busy backgrounds are left for the AI cutout", async () => {
  const stripes = Array.from({ length: 30 }, (_, i) => `<rect x="${i * 20}" y="0" width="10" height="600" fill="hsl(${i * 37},70%,50%)"/>`).join("");
  const cut = await removeUniformBackground(await sharp(svg(stripes)).png().toBuffer());
  assert.equal(cut.ok, false);
});

test("skin detection flags a person in a cutout", async () => {
  const person = await sharp(svg('<circle cx="300" cy="300" r="200" fill="#c68863"/>', "#ffffff")).png().toBuffer();
  const product = await sharp(svg('<rect x="100" y="100" width="400" height="400" fill="#f2f2f2"/>')).png().toBuffer();
  assert.ok((await skinShare(person)) > 0.25);
  assert.ok((await skinShare(product)) < 0.02);
});

test("layouts accept shapes, patterns and cropped/flipped artwork, and old layouts still load", () => {
  const base = { id: "front", name: "Front", assetId: null, area: { x: 0.3, y: 0.25, width: 0.4, height: 0.5 } };
  const id = "2b7f8f5e-4d4c-4f7a-9d55-2d6f6c4f5a11";
  const layout = {
    version: 1,
    surfaces: [
      {
        ...base,
        layers: [
          { id: "a", kind: "image", assetId: id, x: 1, y: 2, scaleX: 1, scaleY: 1, angle: 0, crop: { x: 0, y: 0, width: 10, height: 10 }, flipX: true, opacity: 0.5 },
          { id: "b", kind: "shape", shape: "star", fill: "#ff0000", width: 100, height: 100, x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 },
          { id: "c", kind: "pattern", assetId: id, tile: 0.2, gap: 0.1, brick: true, width: 300, height: 300, x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 },
          { id: "d", kind: "text", text: "Aloha", color: "#000000", fontSize: 40, x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 },
        ],
      },
    ],
  };
  assert.equal(studioLayoutSchema.safeParse(layout).success, true);
  const legacy = { version: 1, surfaces: [{ ...base, layers: [{ id: "x", kind: "image", assetId: id, x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 }] }] };
  assert.equal(studioLayoutSchema.safeParse(legacy).success, true);
});
