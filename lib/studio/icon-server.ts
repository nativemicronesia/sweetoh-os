import type { IconifyJSON } from "@iconify/types";
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from "@iconify/utils";
import { ICON_SETS, parseIconId } from "./icon-sets";
import iconIndex from "./icon-index.json";

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

type Loaded = { data: IconifyJSON };

/**
 * Search runs on a small prebuilt list of names (lib/studio/icon-index.json, built by
 * scripts/build-icon-index.ts), so it never loads the heavy icon data. Only drawing
 * an icon loads its set.
 */
const searchable = new Map<string, { names: string[]; parts: string[][] }>();
function searchSet(prefix: string) {
  let entry = searchable.get(prefix);
  if (!entry) {
    const names = (iconIndex as Record<string, string[]>)[prefix] ?? [];
    entry = { names, parts: names.map((name) => name.split("-")) };
    searchable.set(prefix, entry);
  }
  return entry;
}
const sets = new Map<string, Promise<Loaded>>();

function loadSet(prefix: string): Promise<Loaded> {
  let hit = sets.get(prefix);
  if (!hit) {
    const load = LOADERS[prefix];
    if (!load) return Promise.reject(new Error("Unknown icon set."));
    hit = load().then((module) => ({ data: module.default as IconifyJSON }));
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

function score(name: string, parts: string[], tokens: string[], whole: string): number | null {
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

/** Recent answers, so a popular query is computed once per server instance. */
const recent = new Map<string, string[]>();
const RECENT_MAX = 1500;

/** Name search across sets, best matches first, interleaved so styles are mixed. */
export async function searchIconIds(query: string, prefixes: readonly string[], limit: number, start: number): Promise<string[]> {
  const key = `${[...prefixes].sort().join(",")}|${query.toLowerCase().trim()}|${limit}|${start}`;
  const hit = recent.get(key);
  if (hit) { recent.delete(key); recent.set(key, hit); return hit; }
  const answer = await searchUncached(query, prefixes, limit, start);
  recent.set(key, answer);
  if (recent.size > RECENT_MAX) recent.delete(recent.keys().next().value as string);
  return answer;
}

async function searchUncached(query: string, prefixes: readonly string[], limit: number, start: number): Promise<string[]> {
  const whole = query.toLowerCase().trim().replace(/\s+/g, "-");
  const tokens = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!tokens.length) return [];
  const wanted = prefixes.filter((prefix) => Object.hasOwn(ICON_SETS, prefix));
  const perSet = await Promise.all(wanted.map(async (prefix) => {
    const { names, parts } = searchSet(prefix);
    const hits: Array<readonly [string, number]> = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      // Native substring checks reject almost every name before any scoring.
      let possible = true;
      for (const token of tokens) if (!name.includes(token)) { possible = false; break; }
      if (!possible) continue;
      const value = score(name, parts[i], tokens, whole);
      if (value !== null) hits.push([name, value]);
    }
    return hits
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
