import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/font-awesome-free");
const items = JSON.parse(await readFile(path.join(collection, "fa-assets.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const repoCommit = "840c215f894f429b26b8c1402a65da835dc5a450";
const license = {
  id: "CC-BY-4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
  evidenceUrl: `https://github.com/FortAwesome/Font-Awesome/blob/${repoCommit}/LICENSE.txt`,
  attributionText: "Icon by Font Awesome Free (fontawesome.com), Copyright Fonticons, Inc. CC BY 4.0.",
};

if (!Array.isArray(items) || items.length !== 54) throw new Error("Font Awesome curated set changed size unexpectedly");

const metadata = [];
const sourceManifest = [];
const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) throw new Error(`Duplicate Font Awesome item id ${item.id}`);
  seen.add(item.id);
  const originalFile = `fa-source/${item.id}.svg`;
  const original = await readFile(path.join(collection, originalFile));
  const sourceSvg = original.toString("utf8").trim();
  if (!/^<svg\s/.test(sourceSvg) || !/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(sourceSvg)) {
    throw new Error(`Refusing Font Awesome item ${item.id}: unexpected SVG root`);
  }
  if (/<script\b|<foreignObject\b|<iframe\b|<image\b|<!DOCTYPE|javascript:|@import|\son[a-z]+\s*=/i.test(sourceSvg) ||
      /(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(sourceSvg)) {
    throw new Error(`Refusing Font Awesome item ${item.id}: unsafe or external-resource SVG`);
  }
  const viewBoxMatch = sourceSvg.match(/viewBox="0 0 (\d+) 512"/);
  if (!viewBoxMatch) throw new Error(`Refusing Font Awesome item ${item.id}: not the expected 512-tall solid icon viewBox`);
  const vbWidth = Number(viewBoxMatch[1]);
  const outWidth = Math.round((200 * vbWidth) / 512);
  const svg = sourceSvg
    .replace(/<!--[\s\S]*?-->/, "")
    .replace(/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ 512">/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbWidth} 512" width="${outWidth}" height="200" fill="currentColor">`)
    .trim();
  let dimensions;
  try {
    const preview = await sharp(Buffer.from(svg.replace('fill="currentColor"', 'fill="#173e39"')), { density: 96 })
      .resize(300, 300, { fit: "inside" }).png().toBuffer();
    dimensions = await sharp(preview).metadata();
  } catch (error) {
    throw new Error(`Refusing Font Awesome item ${item.id}: normalized SVG cannot render`, { cause: error });
  }
  const id = `fa-${item.id}-v1`;
  sourceManifest.push({
    id, sourceItemId: item.id, title: item.title, sourceCategory: item.category, sourceTags: item.tags,
    sourceUrl: `https://github.com/FortAwesome/Font-Awesome/blob/${repoCommit}/svgs/solid/${item.id}.svg`,
    license: "CC BY 4.0", licenseId: license.id, licenseUrl: license.url, sourceLicenseEvidenceUrl: license.evidenceUrl,
    attributionRequired: true, commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    originalFile, originalSha256: sha256(original), normalizedSvgSha256: sha256(Buffer.from(svg)),
    normalizedPreviewDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: item.category,
    tags: [...new Set([...item.tags, "sublimation", "vinyl cut", "screen printing", "POD design"])],
    license: "CC BY 4.0 — copyright and permission notice included in the SweetOh repository",
    source: "Font Awesome Free — Fonticons, Inc.",
    sourceUrl: `https://github.com/FortAwesome/Font-Awesome/blob/${repoCommit}/svgs/solid/${item.id}.svg`,
    evidenceUrl: license.evidenceUrl, licenseId: license.id, licenseUrl: license.url,
    attributionRequired: true, attributionText: license.attributionText,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true, svg,
  });
}

await writeFile(path.join(collection, "fa-SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Font Awesome Free (FortAwesome/Font-Awesome, solid style)", sourceLicenseEvidenceUrl: license.evidenceUrl,
  sourceItemRecords: "fa-assets.json", assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/font-awesome-free-assets.ts"),
  `/** Generated from bundled CC BY 4.0 Font Awesome Free solid-style icon originals. Fill is left as currentColor so Studio's layer color controls apply. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const FONT_AWESOME_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Font Awesome CC BY 4.0 solid-icon assets.`);
