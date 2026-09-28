import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/cc0-playing-cards");
const items = JSON.parse(await readFile(path.join(collection, "cards-assets.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const repoCommit = "3765067c32fcef42a30e87022332db729658e7cd";
const license = {
  id: "CC0-1.0",
  url: "https://creativecommons.org/publicdomain/zero/1.0/",
  evidenceUrl: `https://github.com/AustinGabriel/Public-Domain-and-CC0-Playing-Cards/blob/${repoCommit}/LICENSE`,
};

if (!Array.isArray(items) || items.length !== 56) throw new Error("CC0 playing card deck changed size unexpectedly");

const metadata = [];
const sourceManifest = [];
const seen = new Set();
for (const item of items) {
  if (seen.has(item.id)) throw new Error(`Duplicate playing card id ${item.id}`);
  seen.add(item.id);
  const originalFile = `svg-source/${item.id}.svg`;
  const original = await readFile(path.join(collection, originalFile));
  const sourceSvg = original.toString("utf8").trim();
  if (!/<svg[\s>]/.test(sourceSvg) || !/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(sourceSvg)) {
    throw new Error(`Refusing playing card ${item.id}: unexpected SVG root`);
  }
  // A standard public-DTD DOCTYPE (Illustrator/Inkscape export) is safe; an internal subset with
  // ENTITY/SYSTEM declarations is the actual XXE risk, so only that pattern is rejected here.
  if (/<!DOCTYPE[^>]*\[|<!ENTITY|\bSYSTEM\s+["']/i.test(sourceSvg) ||
      /<script\b|<foreignObject\b|<iframe\b|javascript:|@import|\son[a-z]+\s*=/i.test(sourceSvg) ||
      /(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(sourceSvg)) {
    throw new Error(`Refusing playing card ${item.id}: unsafe or external-resource SVG`);
  }
  if (!/viewBox="0 0 1500 2100"/.test(sourceSvg)) {
    throw new Error(`Refusing playing card ${item.id}: not the expected standard poker-card viewBox`);
  }
  const svg = sourceSvg
    .replace(/^﻿?\s*/, "")
    .replace(/^<\?xml[^>]*\?>\s*/, "")
    .replace(/^<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>\s*/, "")
    .trim();
  let dimensions;
  try {
    const preview = await sharp(Buffer.from(svg), { density: 96 }).resize(300, 420, { fit: "inside" }).png().toBuffer();
    dimensions = await sharp(preview).metadata();
  } catch (error) {
    throw new Error(`Refusing playing card ${item.id}: SVG cannot render`, { cause: error });
  }
  const id = `cc0-cards-${item.id}-v1`;
  sourceManifest.push({
    id, sourceItemId: item.id, title: item.title, sourceCategory: item.category, sourceTags: item.tags,
    sourceUrl: `https://github.com/AustinGabriel/Public-Domain-and-CC0-Playing-Cards/tree/${repoCommit}`,
    license: "CC0 1.0 Universal", licenseId: license.id, licenseUrl: license.url, sourceLicenseEvidenceUrl: license.evidenceUrl,
    attributionRequired: false, commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    originalFile, originalSha256: sha256(original), normalizedSvgSha256: sha256(Buffer.from(svg)),
    normalizedPreviewDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: item.category,
    tags: [...new Set([...item.tags, "sublimation", "print decoration", "POD design"])],
    license: "CC0 1.0 Universal — public domain dedication",
    source: "Public-Domain-and-CC0-Playing-Cards (AustinGabriel)",
    sourceUrl: `https://github.com/AustinGabriel/Public-Domain-and-CC0-Playing-Cards/tree/${repoCommit}`,
    evidenceUrl: license.evidenceUrl, licenseId: license.id, licenseUrl: license.url,
    attributionRequired: false, attributionText: null,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true, svg,
  });
}

await writeFile(path.join(collection, "cards-SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Public-Domain-and-CC0-Playing-Cards (github.com/AustinGabriel)", sourceLicenseEvidenceUrl: license.evidenceUrl,
  sourceItemRecords: "cards-assets.json", assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/cc0-playing-cards-assets.ts"),
  `/** Generated from a bundled CC0 complete 56-card poker deck (52 cards + 2 jokers + 2 backs). */\nimport type { StudioAsset } from "./asset-library";\n\nexport const CC0_PLAYING_CARDS_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} CC0 playing card assets.`);
