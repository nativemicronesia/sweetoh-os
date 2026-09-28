import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const base = path.join(root, "docs/licenses/third-party/uigradients");
const revision = "afb018418e92c3fa4048daa88eb6525a78f5486e";
const repository = `https://github.com/ghosh/uiGradients/blob/${revision}`;
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const original = await readFile(path.join(base, "gradients.json"));
const license = await readFile(path.join(base, "LICENSE.md"));
if (sha256(original) !== "56e1cf9e9c213aece92be9e1abe32aed958bf10c77031f2504431964b1cb7030" ||
    sha256(license) !== "dbea8f3f615dceaaf0bdc386990302144d56f8e49164ca0e11fb475804aae2f2" ||
    !license.toString().includes("Copyright (c) 2017 Indrashish Ghosh")) {
  throw new Error("Pinned uiGradients palette source or MIT notice changed");
}
const source = JSON.parse(original.toString("utf8"));
const selected = JSON.parse(await readFile(path.join(base, "selected-indices.json"), "utf8"));
if (!Array.isArray(source) || !Array.isArray(selected) || selected.length < 50 ||
    new Set(selected).size !== selected.length) throw new Error("Invalid uiGradients selection");

const themes = [
  [/christmas/i, ["christmas", "holiday", "winter"]],
  [/winter|frost|ice|snow/i, ["winter", "icy", "cool colors"]],
  [/summer|beach|bora|maldives|ocean|sea|reef|lagoon|shore|emerald water|digital water/i, ["summer", "ocean", "coastal", "island"]],
  [/sunrise|sunset|dusk|dawn|horizon/i, ["sunset", "sunrise", "sky", "landscape"]],
  [/wedding|love|rose|blush|cherryblossom/i, ["wedding", "romantic", "valentine", "floral"]],
  [/forest|moss|earth|wood|grass|leaf|meadow/i, ["nature", "botanical", "organic"]],
  [/neon|disco|electric|cosmic|rainbow/i, ["neon", "vibrant", "retro", "party"]],
  [/pastel|delicate|peach|candy/i, ["pastel", "soft", "baby", "greeting card"]],
];
const slug = (name) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const metadata = [];
const records = [];
const ids = new Set();
for (const sourceIndex of selected) {
  const item = source[sourceIndex];
  if (!item || typeof item.name !== "string" || !Array.isArray(item.colors) ||
      item.colors.length < 2 || item.colors.length > 8 ||
      !item.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))) {
    throw new Error(`Invalid pinned uiGradients record ${sourceIndex}`);
  }
  const id = `uigradients-${slug(item.name)}-v1`;
  if (ids.has(id)) throw new Error(`Duplicate uiGradients ID ${id}`);
  ids.add(id);
  const stops = item.colors.map((color, index) => `<stop offset="${Math.round(index * 100 / (item.colors.length - 1))}%" stop-color="${color}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="palette" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient></defs><rect width="800" height="800" fill="url(#palette)"/></svg>`;
  await sharp(Buffer.from(svg)).resize(120, 120).png().toBuffer();
  const tags = [...new Set([item.name.toLowerCase(), ...item.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    "gradient", "linear gradient", "gradient background", "color blend", "vector background", "poster", "card design", "printable", "sublimation",
    ...themes.flatMap(([pattern, values]) => pattern.test(item.name) ? values : [])])];
  const notice = "uiGradients, copyright (c) 2017 Indrashish Ghosh. MIT License; retain the bundled copyright and permission notice when redistributing substantial source material.";
  records.push({ id, sourceIndex, originalName: item.name, originalColors: item.colors, sourceRevision: revision,
    originalDataFile: "gradients.json", originalDataSha256: sha256(original), originalLicenseFile: "LICENSE.md", originalLicenseSha256: sha256(license),
    originalSourceUrl: `${repository}/gradients.json`, originalLicenseUrl: `${repository}/LICENSE.md`,
    paletteContributor: "uiGradients community contributors; individual contributor not identified in gradients.json",
    repositoryMaintainer: "Indrashish Ghosh", license: "MIT", attributionRequired: true,
    commercialUse: true, modificationAllowed: true, redistributionAllowed: true, normalizedSvgSha256: sha256(svg) });
  metadata.push({ id, name: `${item.name} gradient`, kind: "element", category: "Backgrounds", tags,
    license: "MIT", source: `uiGradients community palette “${item.name}”; repository maintained by Indrashish Ghosh; revision ${revision}.`,
    sourceUrl: `${repository}/gradients.json`, evidenceUrl: `${repository}/LICENSE.md`, licenseId: "MIT", licenseUrl: `${repository}/LICENSE.md`,
    attributionRequired: true, attributionText: notice, commercialUse: true, modificationAllowed: true, redistributionAllowed: true, svg });
}
await writeFile(path.join(base, "SOURCE-MANIFEST.json"), `${JSON.stringify({ schemaVersion: 1, source: "uiGradients", revision,
  originalDataSha256: sha256(original), originalLicenseSha256: sha256(license), assets: records }, null, 2)}\n`);
await writeFile(path.join(root, "lib/studio/uigradients-assets.ts"), `/** Generated from the pinned MIT-licensed uiGradients palette collection. */\nimport type { StudioAsset } from "./asset-library";\n\nexport const UIGRADIENTS_STUDIO_ASSETS: readonly StudioAsset[] = ${JSON.stringify(metadata, null, 2)};\n`);
console.log(`Verified and generated ${metadata.length} MIT uiGradients SVG backgrounds.`);
