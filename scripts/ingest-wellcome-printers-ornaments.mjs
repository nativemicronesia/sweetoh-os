import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/wellcome-printers-ornaments");
const config = JSON.parse(await readFile(path.join(collection, "assets.json"), "utf8"));
const iiif = JSON.parse(await readFile(path.join(collection, "records/manifest-evidence.json"), "utf8"));
const metadata = [];
const sourceManifest = [];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (config.schemaVersion !== 1 || config.sourceLicense !== "Creative Commons Public Domain Mark 1.0") {
  throw new Error("Unsupported Wellcome Collection source manifest");
}
if (iiif.license !== "http://creativecommons.org/publicdomain/mark/1.0/" || !JSON.stringify(iiif.metadata).includes("without asking permission") || iiif.related?.["@id"] !== config.sourceWorkUrl) {
  throw new Error("Refusing this Wellcome work: bundled IIIF snapshot no longer proves PDM status, commercial use, and source identity");
}
if (!config.credit.includes("Public Domain Mark") || !config.credit.includes("Wellcome Collection")) {
  throw new Error("Wellcome attribution text must preserve the source's recommended credit");
}

const canvases = iiif.sequences?.[0]?.canvases ?? [];
const pageEvidence = (page) => {
  const suffix = `_${String(page).padStart(4, "0")}.jp2`;
  const canvas = canvases.find((candidate) => candidate.images?.[0]?.resource?.service?.["@id"]?.endsWith(suffix));
  if (!canvas) throw new Error(`Missing IIIF evidence for scan page ${page}`);
  return canvas.images[0].resource.service;
};

for (const item of config.records) {
  const page = pageEvidence(item.page);
  const originalFile = `originals/b31347873-${String(item.page).padStart(4, "0")}.jpg`;
  const originalPath = path.join(collection, originalFile);
  const original = await readFile(originalPath);
  const image = sharp(original, { failOn: "error" });
  const input = await image.metadata();
  if (input.format !== "jpeg" || input.width !== page.width || input.height !== page.height) {
    throw new Error(`Refusing page ${item.page}: source scan does not match the bundled IIIF dimensions`);
  }

  const scaleX = input.width / config.referenceImageSize.width;
  const scaleY = input.height / config.referenceImageSize.height;
  const crop = {
    left: Math.round(item.crop.left * scaleX),
    top: Math.round(item.crop.top * scaleY),
    width: Math.round(item.crop.width * scaleX),
    height: Math.round(item.crop.height * scaleY),
  };
  const { data, info } = await sharp(original).extract(crop).raw().toBuffer({ resolveWithObject: true });
  const softened = await sharp(original).extract(crop).blur(22).raw().toBuffer();
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const source = pixel * info.channels;
    const inkLuma = 0.2126 * data[source] + 0.7152 * data[source + 1] + 0.0722 * data[source + 2];
    const paperLuma = 0.2126 * softened[source] + 0.7152 * softened[source + 1] + 0.0722 * softened[source + 2];
    const alpha = Math.max(0, Math.min(255, Math.round((paperLuma - inkLuma - 10) * 5.2)));
    const target = pixel * 4;
    rgba[target] = 35;
    rgba[target + 1] = 28;
    rgba[target + 2] = 24;
    rgba[target + 3] = alpha;
  }
  const derivative = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: { r: 35, g: 28, b: 24, alpha: 0 }, threshold: 8 })
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92, effort: 5 })
    .toBuffer();
  const outputFile = `studio-assets/wellcome/${item.id}.webp`;
  const outputPath = path.join(root, "public", outputFile);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, derivative);
  const output = await sharp(derivative).metadata();
  if (!output.width || !output.height || output.hasAlpha !== true) {
    throw new Error(`Generated crop ${item.id} must preserve a transparent background`);
  }

  const sourceImageUrl = `${page["@id"]}/full/${page.width},/0/default.jpg`;
  const credit = `${config.credit} Scanned page ${item.printedPlatePage}. ${item.sourcePlateCredit ? `${item.sourcePlateCredit} Individual designer not identified.` : "Individual ornament designer not identified."}`;
  sourceManifest.push({
    id: item.id,
    title: item.name,
    workId: config.workId,
    scanDocumentId: config.scanDocumentId,
    authorOrCompiler: "Henry R. Plomer (compiler; individual original ornament designers are not identified unless noted on the source plate)",
    sourceWorkUrl: config.sourceWorkUrl,
    sourceCatalogueApiUrl: config.catalogueApiUrl,
    iiifManifestUrl: config.iiifManifestUrl,
    sourceScanUrl: sourceImageUrl,
    scanPageIndex: item.page,
    printedPlatePage: item.printedPlatePage,
    sourcePlateCredit: item.sourcePlateCredit ?? null,
    originalFile,
    originalSha256: sha256(original),
    sourceDimensions: { width: input.width, height: input.height },
    cropReferenceSize: config.referenceImageSize,
    cropReferencePixels: item.crop,
    cropSourcePixels: crop,
    license: config.sourceLicense,
    licenseId: config.licenseId,
    licenseUrl: config.licenseUrl,
    rightsEvidenceUrl: config.rightsEvidenceUrl,
    rightsEvidenceSnapshot: "records/manifest-evidence.json",
    attributionRequired: false,
    recommendedCredit: credit,
    commercialUse: true,
    modificationAllowed: true,
    redistributionAllowed: true,
    derivativeFile: outputFile,
    derivativeSha256: sha256(derivative),
    derivativeDimensions: { width: output.width, height: output.height },
  });
  metadata.push({
    id: item.id,
    name: item.name,
    kind: item.kind,
    category: item.category,
    tags: item.tags,
    license: config.sourceLicense,
    source: `Wellcome Collection — English printers' ornaments / Henry R. Plomer (compiler)${item.sourcePlateCredit ? `; ${item.sourcePlateCredit}` : ""}`,
    sourceUrl: config.sourceWorkUrl,
    evidenceUrl: config.rightsEvidenceUrl,
    licenseId: config.licenseId,
    licenseUrl: config.licenseUrl,
    attributionRequired: false,
    attributionText: credit,
    commercialUse: true,
    modificationAllowed: true,
    redistributionAllowed: true,
    imageUrl: `/${outputFile}`,
    width: output.width,
    height: output.height,
  });
}

await writeFile(path.join(collection, "SOURCE-MANIFEST.json"), `${JSON.stringify({ schemaVersion: 1, generatedAt: "reproducible from bundled Wellcome IIIF evidence and original scans", work: { id: config.workId, title: iiif.label, authorOrCompiler: config.creatorAttribution, date: config.date, sourceWorkUrl: config.sourceWorkUrl, iiifManifestUrl: config.iiifManifestUrl, license: config.sourceLicense, licenseId: config.licenseId, licenseUrl: config.licenseUrl, attributionRequired: false, recommendedCredit: config.credit, rightsStatement: "The Wellcome IIIF manifest identifies this work as Public Domain Mark 1.0 and states it may be copied, modified, distributed, performed, and commercially used without permission.", rightsEvidenceSnapshot: "records/manifest-evidence.json" }, assets: sourceManifest }, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/wellcome-ornament-assets.ts"), `/** Generated by scripts/ingest-wellcome-printers-ornaments.mjs from bundled PDM-verified scans. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const WELLCOME_ORNAMENT_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Wellcome public-domain composition assets.`);
