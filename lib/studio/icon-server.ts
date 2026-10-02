import type { IconifyJSON } from "@iconify/types";
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from "@iconify/utils";
import { ICON_SETS, parseIconId } from "./icon-sets";

/** Static import paths so the bundler includes exactly these sets. */
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  ph: () => import("@iconify-json/ph/icons.json"),
  lucide: () => import("@iconify-json/lucide/icons.json"),
  tabler: () => import("@iconify-json/tabler/icons.json"),
  heroicons: () => import("@iconify-json/heroicons/icons.json"),
  iconoir: () => import("@iconify-json/iconoir/icons.json"),
  bi: () => import("@iconify-json/bi/icons.json"),
  ri: () => import("@iconify-json/ri/icons.json"),
  mdi: () => import("@iconify-json/mdi/icons.json"),
  "fluent-emoji-flat": () => import("@iconify-json/fluent-emoji-flat/icons.json"),
};

type Loaded = { data: IconifyJSON; names: string[] };
const sets = new Map<string, Promise<Loaded>>();
/** Weight variants that make a list noisy; each concept appears in regular, bold and fill only. */
const NOISY = /-(thin|light|duotone)$/;

function loadSet(prefix: string): Promise<Loaded> {
  let hit = sets.get(prefix);
  if (!hit) {
    const load = LOADERS[prefix];
    if (!load) return Promise.reject(new Error("Unknown icon set."));
    hit = load().then((module) => {
      const data = module.default as IconifyJSON;
      return { data, names: [...Object.keys(data.icons), ...Object.keys(data.aliases ?? {})].filter((name) => !NOISY.test(name)) };
    });
    hit.catch(() => sets.delete(prefix));
    sets.set(prefix, hit);
  }
  return hit;
}

/** One icon as a standalone SVG at `size` px; single-color sets take `color`. */
export async function iconSvg(prefix: string, name: string, size: number, color?: string): Promise<string | null> {
  if (!parseIconId(`${prefix}:${name}`)) return null;
  const { data } = await loadSet(prefix);
  const icon = getIconData(data, name);
  if (!icon) return null;
  const rendered = iconToSVG(icon, { width: size, height: size });
  let svg = iconToHTML(replaceIDs(rendered.body), rendered.attributes);
  if (color && ICON_SETS[prefix].monotone) svg = svg.replaceAll("currentColor", color);
  return svg;
}

function score(name: string, tokens: string[], whole: string): number | null {
  const parts = name.split("-");
  let total = 0;
  for (const token of tokens) {
    if (parts.includes(token)) total += 0;
    else if (parts.some((part) => part.startsWith(token))) total += 2;
    else if (name.includes(token)) total += 4;
    else return null;
  }
  if (name === whole) return 0;
  if (name.startsWith(whole)) return 1 + total / 10;
  return 2 + total + parts.length * 0.4;
}

/** Name search across sets, best matches first, interleaved so styles are mixed. */
export async function searchIconIds(query: string, prefixes: readonly string[], limit: number, start: number): Promise<string[]> {
  const whole = query.toLowerCase().trim().replace(/\s+/g, "-");
  const tokens = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!tokens.length) return [];
  const wanted = prefixes.filter((prefix) => Object.hasOwn(ICON_SETS, prefix));
  const perSet = await Promise.all(wanted.map(async (prefix) => {
    const { names } = await loadSet(prefix);
    return names
      .map((name) => [name, score(name, tokens, whole)] as const)
      .filter((entry): entry is readonly [string, number] => entry[1] !== null)
      .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length)
      .slice(0, start + limit)
      .map(([name]) => `${prefix}:${name}`);
  }));
  const merged: string[] = [];
  for (let i = 0; merged.length < start + limit; i++) {
    let any = false;
    for (const list of perSet) if (i < list.length) { merged.push(list[i]); any = true; }
    if (!any) break;
  }
  return merged.slice(start, start + limit);
}
