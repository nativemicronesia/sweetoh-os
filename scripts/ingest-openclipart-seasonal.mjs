import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const base = path.join(root, "docs/licenses/third-party/openclipart");
const records = JSON.parse(await readFile(path.join(base, "seasonal-frame-assets.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const metadata = [];
const assets = [];
const seen = new Set();
for (const item of records) {
  if (!Number.isInteger(item.id) || seen.has(item.id) ||
      item.sourceUrl !== `https://openclipart.org/detail/${item.id}/${item.id === 86779 ? "halloween-frame" : item.id === 194064 ? "football-border" : "floral-frame"}` ||
      !item.artist || !item.uploadedAt || !item.sourceTags?.length || !item.studioTags?.length) {
    throw new Error(`Invalid Openclipart item evidence ${item.id}`);
  }
  seen.add(item.id);
  const originalFile = `source/${item.id}.svg`;
  const original = await readFile(path.join(base, originalFile));
  const sourceSvg = original.toString("utf8");
  if (!/^\s*<\?xml|^\s*<svg/i.test(sourceSvg) ||
      /<script\b|<foreignObject\b|<iframe\b|<image\b|<!ENTITY|javascript:|@import|\son[a-z]+\s*=/i.test(sourceSvg) ||
      /(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(sourceSvg)) {
    throw new Error(`Refusing unsafe or externally dependent Openclipart SVG #${item.id}`);
  }
  const svg = sourceSvg.replace(/^\uFEFF?\s*/, "")
    .replace(/^<\?xml[^>]*\?>\s*/, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/^(?:<!--[\s\S]*?-->\s*)*/, "")
    .replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, "")
    .trim();
  let dimensions;
  try {
    const preview = await sharp(Buffer.from(svg), { density: 96 }).resize(500, 500, { fit: "inside" }).png().toBuffer();
    dimensions = await sharp(preview).metadata();
  } catch (error) {
    throw new Error(`Openclipart SVG #${item.id} does not render`, { cause: error });
  }
  const id = `openclipart-${item.id}-v1`;
  const rights = {
    license: "CC0 1.0 — public domain dedication",
    licenseId: "CC0-1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attributionRequired: false,
    attributionText: null,
    commercialUse: true,
    modificationAllowed: true,
    redistributionAllowed: true,
  };
  const source = `Openclipart upload #${item.id} — ${item.sourceTitle}; artist ${item.artist}; uploaded ${item.uploadedAt.slice(0, 10)}. CC0 per Openclipart FAQ.`;
  assets.push({ id, sourceItemId: item.id, sourceTitle: item.sourceTitle, artist: item.artist, uploadedAt: item.uploadedAt,
    description: item.description, sourceTags: item.sourceTags, sourceUrl: item.sourceUrl,
    rightsEvidenceUrl: "https://openclipart.org/share", license: rights.license, licenseId: rights.licenseId,
    licenseUrl: rights.licenseUrl, commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    attributionRequired: false, originalFile, originalSha256: sha256(original), normalizedSvgSha256: sha256(Buffer.from(svg)),
    normalizedDimensions: { width: dimensions.width, height: dimensions.height } });
  metadata.push({ id, name: item.name, kind: "element", category: item.studioCategory,
    tags: [...new Set([...item.sourceTags, ...item.studioTags])], ...rights,
    source, sourceUrl: item.sourceUrl, evidenceUrl: "https://openclipart.org/share", svg });
}
await writeFile(path.join(base, "seasonal-frame-SOURCE-MANIFEST.json"), `${JSON.stringify({ schemaVersion: 1,
  source: "Openclipart seasonal and sport frames", sourceLicenseEvidenceUrl: "https://openclipart.org/share",
  licenseCodeFile: "CC0-1.0-LEGALCODE.txt", sourceItemRecords: "seasonal-frame-assets.json", assets }, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/openclipart-seasonal-assets.ts"), `/** Generated from the bundled rights-checked Openclipart frame SVG originals. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const OPENCLIPART_SEASONAL_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Openclipart frames.`);
