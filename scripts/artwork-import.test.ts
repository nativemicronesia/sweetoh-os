import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { importArtwork, sanitizeSvg, validateArtworkImport } from "../lib/studio/artwork-import";

const circleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><circle cx="200" cy="150" r="100" fill="#e2566d"/></svg>`;

test("SVG is drawn at print resolution on a transparent background", async () => {
  const out = await importArtwork(Buffer.from(circleSvg), "image/svg+xml", { targetWidthPx: 3000 });
  assert.equal(out.mimeType, "image/png");
  assert.ok(out.report.width >= 2900 && out.report.width <= 6000, `width ${out.report.width}`);
  assert.ok(out.report.hasTransparency);
  const { data, info } = await sharp(out.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, "corner is transparent");
  const mid = ((info.height >> 1) * info.width + (info.width >> 1)) * 4;
  assert.ok(data[mid] > 180 && data[mid + 3] === 255, "circle is red and opaque");
  assert.ok(out.report.issues.some((i) => i.code === "svg-drawn"));
});

test("unsafe SVG is refused, never quietly cleaned", () => {
  const bad: Record<string, string> = {
    script: `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
    handler: `<svg xmlns="http://www.w3.org/2000/svg"><rect onload="x()" width="5" height="5"/></svg>`,
    foreign: `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>`,
    external: `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>`,
    cssurl: `<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(http://evil.example/a)"/></svg>`,
    entity: `<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>`,
    jslink: `<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect/></a></svg>`,
  };
  for (const [name, svg] of Object.entries(bad)) assert.throws(() => sanitizeSvg(svg), /can't be imported/, name);
  assert.throws(() => sanitizeSvg("<html></html>"), /SVG/);
  assert.doesNotThrow(() => sanitizeSvg(circleSvg));
  assert.doesNotThrow(() => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="5" height="5"/></svg>`));
});

test("a big raster is reduced to a printable size and said so", async () => {
  const wide = await sharp({ create: { width: 7200, height: 400, channels: 4, background: { r: 20, g: 120, b: 90, alpha: 0.6 } } }).png().toBuffer();
  const out = await importArtwork(wide, "image/png");
  assert.equal(out.report.width, 6000);
  assert.ok(out.report.reduced);
  assert.ok(out.report.issues.some((i) => i.code === "reduced"));
});

test("transparent PNG artwork keeps its transparency", async () => {
  const png = await sharp(Buffer.from(circleSvg)).resize(1600).png().toBuffer();
  const out = await importArtwork(png, "image/png");
  assert.ok(out.report.hasTransparency);
  assert.equal(out.mimeType, "image/png");
  assert.ok(!out.report.issues.some((i) => i.level === "warn"));
});

test("a flat photo-style image on a solid background is flagged, and small images warn", async () => {
  const flat = await sharp(Buffer.from(circleSvg.replace("<circle", '<rect width="400" height="300" fill="#ffffff"/><circle'))).png().toBuffer();
  const out = await importArtwork(flat, "image/png");
  assert.ok(out.report.solidBackground);
  assert.ok(out.report.issues.some((i) => i.code === "solid-background"));
  assert.ok(out.report.issues.some((i) => i.code === "low-resolution"));
});

test("opaque JPEGs stay JPEGs", async () => {
  const jpg = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: { r: 200, g: 120, b: 60 } } }).jpeg().toBuffer();
  const out = await importArtwork(jpg, "image/jpeg");
  assert.equal(out.mimeType, "image/jpeg");
  assert.equal(out.extension, "jpg");
});

test("unsupported and oversized files get plain guidance", async () => {
  assert.throws(() => validateArtworkImport({ mimeType: "application/pdf", sizeBytes: 100 }), /Canva or Kittl/);
  assert.throws(() => validateArtworkImport({ mimeType: "image/png", sizeBytes: 61 * 1024 * 1024 }), /60 MB/);
  assert.throws(() => validateArtworkImport({ mimeType: "image/png", sizeBytes: 0 }), /empty/);
  await assert.rejects(() => importArtwork(Buffer.from("not an image"), "image/png"), /couldn't read/);
});
