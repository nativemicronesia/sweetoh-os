import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/feather-icons");
const items = JSON.parse(await readFile(path.join(collection, "feather-assets.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const repoCommit = "3dc050d97405062eba78aa57115c0a15c63abdaa";
const license = {
  id: "MIT",
  url: "https://opensource.org/license/mit/",
  evidenceUrl: `https://github.com/feathericons/feather/blob/${repoCommit}/LICENSE`,
  attributionText: "Feather Icons, Copyright (c) 2013-2023 Cole Bemis. MIT License. The copyright and permission notice must accompany copies or substantial portions.",
};

if (!Array.isArray(items) || items.length !== 49) throw new Error("Feather curated set changed size unexpectedly");

const metadata = [];
const sourceManifest = [];
const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) throw new Error(`Duplicate Feather item id ${item.id}`);
  seen.add(item.id);
  const originalFile = `feather-source/${item.id}.svg`;
  const original = await readFile(path.join(collection, originalFile));
  const sourceSvg = original.toString("utf8").trim();
  if (!/^<svg\s/.test(sourceSvg) || !/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(sourceSvg)) {
    throw new Error(`Refusing Feather item ${item.id}: unexpected SVG root`);
  }
  if (/<script\b|<foreignObject\b|<iframe\b|<image\b|<!DOCTYPE|javascript:|@import|\son[a-z]+\s*=/i.test(sourceSvg) ||
      /(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(sourceSvg)) {
    throw new Error(`Refusing Feather item ${item.id}: unsafe or external-resource SVG`);
  }
  if (!/viewBox="0 0 24 24"/.test(sourceSvg) || !/stroke="currentColor"/.test(sourceSvg)) {
    throw new Error(`Refusing Feather item ${item.id}: not the expected 24x24 currentColor stroke icon shape`);
  }
  const svg = sourceSvg.replace('width="24" height="24"', 'width="200" height="200"');
  let dimensions;
  try {
    const preview = await sharp(Buffer.from(svg.replace('stroke="currentColor"', 'stroke="#173e39"')), { density: 96 })
      .resize(300, 300, { fit: "inside" }).png().toBuffer();
    dimensions = await sharp(preview).metadata();
  } catch (error) {
    throw new Error(`Refusing Feather item ${item.id}: normalized SVG cannot render`, { cause: error });
  }
  const id = `feather-${item.id}-v1`;
  sourceManifest.push({
    id, sourceItemId: item.id, title: item.title, sourceCategory: item.category, sourceTags: item.tags,
    sourceUrl: `https://github.com/feathericons/feather/blob/${repoCommit}/icons/${item.id}.svg`,
    license: "MIT License", licenseId: license.id, licenseUrl: license.url, sourceLicenseEvidenceUrl: license.evidenceUrl,
    attributionRequired: true, commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    originalFile, originalSha256: sha256(original), normalizedSvgSha256: sha256(Buffer.from(svg)),
    normalizedPreviewDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: item.category,
    tags: [...new Set([...item.tags, "engraving", "sublimation", "line art", "POD design"])],
    license: "MIT License — copyright and permission notice included in the SweetOh repository",
    source: "Feather Icons — Cole Bemis and contributors",
    sourceUrl: `https://github.com/feathericons/feather/blob/${repoCommit}/icons/${item.id}.svg`,
    evidenceUrl: license.evidenceUrl, licenseId: license.id, licenseUrl: license.url,
    attributionRequired: true, attributionText: license.attributionText,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true, svg,
  });
}

await writeFile(path.join(collection, "feather-SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Feather Icons (feathericons/feather)", sourceLicenseEvidenceUrl: license.evidenceUrl,
  sourceItemRecords: "feather-assets.json", assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/feather-icons-assets.ts"),
  `/** Generated from bundled MIT-licensed Feather Icons originals. Stroke color is left as currentColor so Studio's layer color controls apply. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const FEATHER_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Feather MIT line-icon assets.`);
