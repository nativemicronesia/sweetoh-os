/**
 * Writes lib/studio/icon-index.json: just the icon NAMES of each installed set,
 * so search never has to load the multi-megabyte icon data. Re-run after
 * changing the icon packages (a test fails if the index is out of date):
 *
 *   npx tsx scripts/build-icon-index.ts
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ICON_SETS } from "../lib/studio/icon-sets";

const require = createRequire(import.meta.url);
const NOISY = /-(thin|light|duotone)$/;

export function currentIconNames(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const prefix of Object.keys(ICON_SETS)) {
    const data = require(`@iconify-json/${prefix}/icons.json`) as { icons: Record<string, unknown>; aliases?: Record<string, unknown> };
    out[prefix] = [...Object.keys(data.icons), ...Object.keys(data.aliases ?? {})].filter((name) => !NOISY.test(name)).sort();
  }
  return out;
}

if (process.argv[1]?.endsWith("build-icon-index.ts")) {
  const names = currentIconNames();
  writeFileSync("lib/studio/icon-index.json", JSON.stringify(names));
  console.log(Object.entries(names).map(([p, n]) => `${p}: ${n.length}`).join("  "));
}
