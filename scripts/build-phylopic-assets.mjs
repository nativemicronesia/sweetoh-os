import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = resolve(root, "docs/licenses/third-party/phylopic-cc0");
const manifest = JSON.parse(readFileSync(resolve(pack, "asset-manifest.json"), "utf8"));

export function normalizePhylopicSvg(source) {
  const match = source.match(/<svg\b[^>]*>/);
  if (!match) throw new Error("PhyloPic original has no SVG root element.");
  const root = match[0]
    .replace(/\s+(?:width|height)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/g, "")
    .replace(/>$/, ' width="200" height="200">');
  return source.replace(match[0], root);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const assets = manifest.assets.map((entry) => {
  const original = readFileSync(resolve(pack, entry.originalFile));
  if (sha256(original) !== entry.originalSha256) {
    throw new Error(`Original source hash changed for ${entry.id}.`);
  }
  const svg = normalizePhylopicSvg(original.toString("utf8"));
  if (sha256(svg) !== entry.studioSvgSha256) {
    throw new Error(`Normalized SVG hash changed for ${entry.id}.`);
  }
  return {
    id: entry.id,
    name: entry.name,
    kind: "element",
    category: entry.category,
    tags: entry.tags,
    license: "CC0 1.0 Universal",
    source: `PhyloPic — ${entry.author}`,
    sourceUrl: entry.sourceUrl,
    evidenceUrl: entry.evidenceUrl,
    licenseId: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attributionRequired: false,
    attributionText: `Optional credit: ${entry.author}, PhyloPic. CC0 1.0; attribution is not required.`,
    commercialUse: true,
    modificationAllowed: true,
    redistributionAllowed: true,
    svg,
  };
});

const moduleText = [
  'import type { StudioAsset } from "./asset-library";',
  "",
  "/** Curated PhyloPic organisms; original sources and per-image evidence are bundled with this pack. */",
  "export const PHYLOPIC_STUDIO_ASSETS: readonly StudioAsset[] = [",
  ...assets.map((asset) => `  ${JSON.stringify(asset)},`),
  "];",
  "",
].join("\n");

writeFileSync(resolve(root, "lib/studio/phylopic-assets.ts"), moduleText);
console.log(`Generated ${assets.length} PhyloPic Studio assets.`);
