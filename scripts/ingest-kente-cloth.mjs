import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const collection = path.join(root, "docs/licenses/third-party/kente-cloth");
const items = JSON.parse(await readFile(path.join(collection, "assets.json"), "utf8"));
const publicDir = path.join(root, "public");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (!Array.isArray(items) || items.length !== 5) throw new Error("Kente cloth set changed size unexpectedly");

const metadata = [];
const sourceManifest = [];
for (const item of items) {
  const record = JSON.parse(await readFile(path.join(collection, `records/${item.id}.json`), "utf8"));
  const obj = record.object;
  const agg = obj?.aggregations?.[0];
  const rights = agg?.edmRights?.def?.[0];
  if (obj?.about !== `/${item.europeanaId}` || rights !== "http://creativecommons.org/publicdomain/zero/1.0/" || agg?.edmIsShownBy !== item.imageUrl) {
    throw new Error(`Refusing Kente item ${item.id}: CC0 rights or record identity not confirmed on the live Europeana record`);
  }

  const originalFile = `originals/${item.id}.jpg`;
  const original = await readFile(path.join(collection, originalFile));
  const image = sharp(original, { failOn: "error" });
  const input = await image.metadata();
  const outputPath = path.join(publicDir, `studio-assets/kente-cloth/${item.id}.webp`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const output = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toBuffer();
  await writeFile(outputPath, output);
  const dimensions = await sharp(output).metadata();

  const id = `kente-${item.id}-v1`;
  const credit = `${item.title}. Credit: National Museum of World Cultures (Netherlands), via Europeana. CC0 1.0 Universal.`;
  sourceManifest.push({
    id, europeanaId: item.europeanaId, title: item.title,
    sourceRecordUrl: `https://www.europeana.eu/item/${item.europeanaId}`,
    license: "CC0 1.0 Universal", licenseEvidence: item.imageUrl,
    originalWidth: input.width, originalHeight: input.height,
    originalFile, originalSha256: sha256(original), normalizedOutputSha256: sha256(output),
    normalizedDimensions: { width: dimensions.width, height: dimensions.height },
  });
  metadata.push({
    id, name: item.title, kind: "element", category: item.category,
    tags: [...new Set([...item.tags, "print decoration", "POD design"])],
    license: "CC0 1.0 Universal — public domain dedication",
    source: "National Museum of World Cultures (Netherlands), via Europeana",
    sourceUrl: `https://www.europeana.eu/item/${item.europeanaId}`, evidenceUrl: item.imageUrl,
    licenseId: "CC0-1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attributionRequired: false, attributionText: credit,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true,
    imageUrl: `/studio-assets/kente-cloth/${item.id}.webp`, width: dimensions.width, height: dimensions.height,
  });
}

await writeFile(path.join(collection, "SOURCE-MANIFEST.json"), `${JSON.stringify({
  schemaVersion: 1, source: "National Museum of World Cultures (Netherlands) — Ghanaian kente cloth, via Europeana",
  rightsEvidence: "Per-item Europeana record edmRights + edmIsShownBy, independently verified live for each item; snapshots in records/.",
  assets: sourceManifest,
}, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/kente-cloth-assets.ts"),
  `/** Generated from CC0 Ghanaian kente cloth photographs (National Museum of World Cultures, Netherlands, via Europeana). Raster images, not vector. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const KENTE_CLOTH_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} kente cloth assets.`);
