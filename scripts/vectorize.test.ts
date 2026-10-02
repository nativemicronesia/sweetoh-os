import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { vectorizeImage } from "../lib/studio/vectorize";

const art = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#ffffff"/><circle cx="140" cy="150" r="90" fill="#e2566d"/><rect x="230" y="70" width="120" height="160" fill="#1f4f8a"/></svg>`);

test("raster artwork becomes flat-color vector paths and a crisp PNG", async () => {
  const photo = await sharp(art).png().toBuffer();
  const traced = await vectorizeImage(photo, 4);
  assert.match(traced.svg, /^<svg[^>]*viewBox=/);
  assert.ok(traced.paths >= 3 && traced.paths < 60, `paths: ${traced.paths}`);
  assert.doesNotMatch(traced.svg, /<script|<image|href=/i);
  const meta = await sharp(traced.png).metadata();
  assert.equal(meta.width, traced.width * 2);
  const { data, info } = await sharp(traced.png).resize(8, 6, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  const red = px(2, 3);
  assert.ok(red[0] > 180 && red[1] < 120, `circle stays red: ${red}`);
});

test("color count is clamped", async () => {
  const photo = await sharp(art).png().toBuffer();
  assert.ok((await vectorizeImage(photo, 999)).paths > 0);
  assert.ok((await vectorizeImage(photo, 0)).paths > 0);
});
