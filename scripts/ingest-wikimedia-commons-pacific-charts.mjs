import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/wikimedia-commons-pacific-charts");
const items = JSON.parse(await readFile(path.join(collection, "assets.json"), "utf8"));
const publicDir = path.join(root, "public");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (!Array.isArray(items) || items.length !== 18) throw new Error("Wikimedia Commons Pacific charts set changed size unexpectedly");

const LICENSES = {
  "Public domain": { licenseId: "PD", licenseUrl: "https://en.wikipedia.org/wiki/Public_domain", attributionRequired: false },
  "CC BY-SA 4.0": { licenseId: "CC-BY-SA-4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", attributionRequired: true },
  "CC BY-SA 3.0": { licenseId: "CC-BY-SA-3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", attributionRequired: true },
};

const metadata = [];
const sourceManifest = [];
for (const item of items) {
  const record = JSON.parse(await readFile(path.join(collection, item.recordFile), "utf8"));
  const page = Object.values(record.query.pages)[0];
  const info = page?.imageinfo?.[0];
  const license = info?.extmetadata?.LicenseShortName?.value;
  const restrictions = info?.extmetadata?.Restrictions?.value ?? "";
  const descriptionUrl = info?.descriptionurl;
  const licenseSpec = LICENSES[item.license];
  if (!info || !licenseSpec || license !== item.license || restrictions !== "" || descriptionUrl !== item.commonsUrl || page.title !== item.commonsTitle.replace(/_/g, " ")) {
    throw new Error(`Rights/provenance mismatch for Wikimedia Commons item ${item.id}: license=${license}, expected=${item.license}, restrictions="${restrictions}"`);
  }

  const originalPath = path.join(collection, item.originalFile);
  const original = await readFile(originalPath);
  const image = sharp(original, { failOn: "error" }).rotate(item.rotate || 0);
  const outputPath = path.join(publicDir, item.outputFile);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const output = await image.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toBuffer();
  await writeFile(outputPath, output);
  const dimensions = await sharp(output).metadata();

  sourceManifest.push({
    id: item.id, title: item.title, commonsUrl: item.commonsUrl, creator: item.creator, date: item.date,
    license: item.license, licenseEvidence: `Wikimedia Commons extmetadata LicenseShortName field, fetched live and recorded in ${item.recordFile}`,
    sha1OfOriginalUpload: info.sha1, originalFile: item.originalFile, originalSha256: sha256(original),
    normalizedOutputSha256: sha256(output), normalizedDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id: item.id, name: item.name, kind: item.kind, category: item.category, tags: item.tags,
    license: item.license, source: `Wikimedia Commons — ${item.creator}`,
    sourceUrl: item.commonsUrl, evidenceUrl: item.commonsUrl, licenseId: licenseSpec.licenseId,
    licenseUrl: licenseSpec.licenseUrl,
    attributionRequired: licenseSpec.attributionRequired, attributionText: item.useCredit,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    imageUrl: `/${item.outputFile}`, width: dimensions.width, height: dimensions.height,
  });
}

await writeFile(path.join(collection, "SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Wikimedia Commons — historical and modern Micronesian/Pacific nautical charts and maps",
  rightsEvidence: "Per-file Wikimedia Commons extmetadata LicenseShortName + Restrictions fields, independently verified live for each item; snapshots in records/.",
  assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/wikimedia-commons-pacific-charts-assets.ts"),
  `/** Generated from public-domain and CC BY-SA Wikimedia Commons Micronesian/Pacific nautical charts and maps. Raster images, not vector. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const WIKIMEDIA_PACIFIC_CHARTS_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Wikimedia Commons Pacific chart assets.`);
