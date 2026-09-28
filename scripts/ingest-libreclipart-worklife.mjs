import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/libreclipart");
const records = JSON.parse(await readFile(path.join(collection, "worklife-assets.json"), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const metadata = [];
const sourceManifest = [];
const seen = new Set();
const categoryMap = {
  health: "People & Work", business: "People & Work", music: "Music & Performance",
  technology: "Technology & Ideas", transportation: "Travel & Places", sports: "Sports & Hobbies",
};
const intentTags = {
  health: ["healthcare", "wellness", "medical illustration", "health worker", "caregiver gift", "healthcare appreciation", "occupation"],
  business: ["business illustration", "entrepreneur", "small business", "work life", "office", "career", "occupation"],
  music: ["music illustration", "musician", "performing arts", "concert", "music lover gift", "hobby"],
  technology: ["technology illustration", "digital work", "creative profession", "science", "STEM", "occupation"],
  transportation: ["transport illustration", "vehicle", "travel", "commute", "occupation", "adventure"],
  sports: ["sports illustration", "athletics", "fitness", "hobby", "sport lover gift"],
};
const sourceTagNoise = new Set(["policewoman", "phyisician", "girl", "guy", "boy"]);

if (!Array.isArray(records) || records.length === 0) throw new Error("Missing Libreclipart work and life source records");
for (const item of records) {
  if (!Number.isInteger(item.id) || seen.has(item.id)) throw new Error(`Invalid or duplicate Libreclipart item ${item.id}`);
  seen.add(item.id);
  if (!categoryMap[item.category] || item.license?.id !== "CC0-1.0" ||
      !["Creative Commons Zero (CC0)", "Creative Commons Zero"].includes(item.license.sourcePageLabel) ||
      item.license.sourceEvidenceUrl !== "https://libreclipart.org/en/licenses" ||
      item.license.assetEvidenceUrl !== item.sourceUrl || item.license.commercialUse !== true ||
      item.license.modificationAllowed !== true || item.license.redistributionAllowed !== true ||
      item.license.attributionRequired !== false) {
    throw new Error(`Refusing Libreclipart item ${item.id}: its bundled item-page record does not verify CC0 and intended Studio rights`);
  }
  if (item.downloadUrl !== `https://libreclipart.org/en/download/${item.id}/svg/0` ||
      !item.sourceUrl.startsWith("https://libreclipart.org/en/vectors/") || !item.sourceUrl.endsWith(`/${item.id}`)) {
    throw new Error(`Refusing Libreclipart item ${item.id}: source URLs do not match the recorded item`);
  }
  const originalFile = `worklife-source/${item.id}.svg`;
  const original = await readFile(path.join(collection, originalFile));
  const sourceSvg = original.toString("utf8");
  const rightsClaim = sourceSvg.match(/<dc:rights>([\s\S]*?)<\/dc:rights>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? null;
  const creatorMetadata = sourceSvg.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() || null;
  if (!rightsClaim || !/\bpublic domain\b|\bCC\s?0\b/i.test(rightsClaim) || /Free OSI License/i.test(rightsClaim)) {
    throw new Error(`Refusing Libreclipart item ${item.id}: its original SVG contains an absent or conflicting rights claim`);
  }
  const svg = sourceSvg.replace(/^\uFEFF?\s*/, "").replace(/^<\?xml[^>]*\?>\s*/, "")
    .replace(/^(?:<!--[\s\S]*?-->\s*)*/, "").replace(/<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi, "").trim();
  if (!/^<svg(?:\s|>)/.test(svg) || /<script\b|<foreignObject\b|<iframe\b|<image\b|<!DOCTYPE|javascript:|@import|\son[a-z]+\s*=/i.test(svg) ||
      /(?:href|src)\s*=\s*["']https?:|url\(\s*["']?https?:/i.test(svg)) {
    throw new Error(`Refusing Libreclipart item ${item.id}: its SVG is unsafe or depends on external resources`);
  }
  let dimensions;
  try {
    const preview = await sharp(Buffer.from(svg), { density: 96 }).resize(300, 300, { fit: "inside" }).png().toBuffer();
    dimensions = await sharp(preview).metadata();
  } catch (error) {
    throw new Error(`Refusing Libreclipart item ${item.id}: its normalized SVG cannot render`, { cause: error });
  }
  const id = `libreclipart-${item.id}-v1`;
  const cleanSourceTags = item.tags.filter((tag) => !sourceTagNoise.has(tag.toLowerCase()));
  const tags = [...new Set([...cleanSourceTags, ...intentTags[item.category], "sublimation", "printable design", "POD design"] )];
  sourceManifest.push({
    id, sourceItemId: item.id, title: item.title, description: item.description, sourceCategory: item.category,
    sourceTags: item.tags, publishedDate: item.publishedDate, creatorMetadata, individualArtist: null,
    sourceUrl: item.sourceUrl, previewUrl: item.previewUrl, sourceDownloadUrl: item.downloadUrl,
    sourcePageLicenseLabel: item.license.sourcePageLabel, sourceSvgRightsClaim: rightsClaim,
    sourceLicenseEvidenceUrl: item.license.sourceEvidenceUrl, license: "CC0 1.0 Universal", licenseId: "CC0-1.0",
    licenseUrl: item.license.url, attributionRequired: false, commercialUse: true, modificationAllowed: true,
    redistributionAllowed: true, originalFile, originalSha256: sha256(original), normalizedSvgSha256: sha256(Buffer.from(svg)),
    normalizedPreviewDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: categoryMap[item.category], tags,
    license: "CC0 1.0 Universal",
    source: `Libreclipart.org item #${item.id}; SVG metadata credits ${creatorMetadata ?? "no individual creator"}; published ${item.publishedDate}.`,
    sourceUrl: item.sourceUrl, evidenceUrl: item.license.assetEvidenceUrl, licenseId: "CC0-1.0",
    licenseUrl: item.license.url, attributionRequired: false, attributionText: null,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true, svg,
  });
}
await writeFile(path.join(collection, "worklife-SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Libreclipart.org work and life illustrations", sourceLicenseEvidenceUrl: "https://libreclipart.org/en/licenses",
  sourceItemRecords: "worklife-assets.json", assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/libreclipart-worklife-assets.ts"), `/** Generated from bundled rights-checked Libreclipart work and life SVG originals. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const LIBRECLIPART_WORKLIFE_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Libreclipart CC0 work and life assets.`);
