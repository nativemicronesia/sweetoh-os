import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/wellcome-marine-life");
const items = JSON.parse(await readFile(path.join(collection, "assets.json"), "utf8"));
const publicDir = path.join(root, "public");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (!Array.isArray(items) || items.length !== 6) throw new Error("Wellcome marine life set changed size unexpectedly");

const metadata = [];
const sourceManifest = [];
for (const item of items) {
  const work = JSON.parse(await readFile(path.join(collection, `records/${item.id}.json`), "utf8"));
  const titleMatch = item.apiTitleMatch ?? item.title;
  if (work.id !== item.workId || !work.title.startsWith(titleMatch)) {
    throw new Error(`Refusing Wellcome item ${item.id}: work record title/id does not match the expected item`);
  }
  const license = work.items?.flatMap((it) => it.locations ?? []).find((loc) => loc.license?.id === "pdm");
  const openAccess = work.items?.flatMap((it) => it.locations ?? []).some((loc) => loc.accessConditions?.some((ac) => ac.status?.id === "open"));
  if (!license || license.url !== `https://iiif.wellcomecollection.org/image/${item.iiifImageId}/info.json` || !openAccess) {
    throw new Error(`Refusing Wellcome item ${item.id}: PDM license or open access not confirmed on the live work record`);
  }
  const iiifInfo = JSON.parse(await readFile(path.join(collection, `records/${item.id}-iiif-info.json`), "utf8"));
  if (iiifInfo["@id"] !== `https://iiif.wellcomecollection.org/image/${item.iiifImageId}`) {
    throw new Error(`Refusing Wellcome item ${item.id}: IIIF info.json identity does not match`);
  }

  const originalFile = `originals/${item.id}.jpg`;
  const original = await readFile(path.join(collection, originalFile));
  const image = sharp(original, { failOn: "error" });
  const input = await image.metadata();
  const outputPath = path.join(publicDir, `studio-assets/wellcome-marine-life/${item.id}.webp`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const output = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toBuffer();
  await writeFile(outputPath, output);
  const dimensions = await sharp(output).metadata();

  const id = `wellcome-marine-${item.id}-v1`;
  const credit = `${item.title}. ${item.creator === "unattributed" ? "Creator not identified in the collection record." : `Engraving by ${item.creator}.`} Credit: Wellcome Collection. Public Domain Mark.`;
  sourceManifest.push({
    id, workId: item.workId, iiifImageId: item.iiifImageId, title: item.title, creator: item.creator, date: item.date,
    sourceWorkUrl: `https://wellcomecollection.org/works/${item.workId}`,
    license: "Public Domain Mark", licenseEvidence: license.url,
    originalWidth: input.width, originalHeight: input.height,
    iiifWidth: iiifInfo.width, iiifHeight: iiifInfo.height,
    originalFile, originalSha256: sha256(original), normalizedOutputSha256: sha256(output),
    normalizedDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: item.category, tags: item.tags,
    license: "Creative Commons Public Domain Mark 1.0", source: `Wellcome Collection — ${item.creator}`,
    sourceUrl: `https://wellcomecollection.org/works/${item.workId}`, evidenceUrl: license.url,
    licenseId: "PUBLIC-DOMAIN-MARK-1.0", licenseUrl: "http://creativecommons.org/publicdomain/mark/1.0/",
    attributionRequired: false, attributionText: credit,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    imageUrl: `/studio-assets/wellcome-marine-life/${item.id}.webp`, width: dimensions.width, height: dimensions.height,
  });
}

await writeFile(path.join(collection, "SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "Wellcome Collection — 18th/19th-century marine life engravings",
  rightsEvidence: "Per-work Wellcome Collection catalogue API license + accessConditions, independently verified live for each item; snapshots in records/.",
  assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/wellcome-marine-life-assets.ts"),
  `/** Generated from Public Domain Mark Wellcome Collection marine life engravings. Raster images, not vector. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const WELLCOME_MARINE_LIFE_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} Wellcome Collection marine life assets.`);
