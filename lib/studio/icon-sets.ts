/**
 * Icon and sticker libraries from open sets (data packaged by Iconify, https://iconify.design), served by our own API.
 * Only sets whose licenses allow commercial use without attribution are listed, and only
 * these prefixes are accepted in saved designs. The data is installed as packages and served by
 * our API, so there is no third-party rate limit; icons are fetched when previewed or used.
 */
export type IconSet = { name: string; license: string; source: string; kind: "icon" | "sticker"; /** Single-color glyphs can be recolored; stickers keep their own colors. */ monotone: boolean };

export const ICON_SETS: Record<string, IconSet> = {
  ph: { name: "Phosphor", license: "MIT", source: "https://github.com/phosphor-icons/core", kind: "icon", monotone: true },
  lucide: { name: "Lucide", license: "ISC", source: "https://github.com/lucide-icons/lucide", kind: "icon", monotone: true },
  tabler: { name: "Tabler", license: "MIT", source: "https://github.com/tabler/tabler-icons", kind: "icon", monotone: true },
  heroicons: { name: "Heroicons", license: "MIT", source: "https://github.com/tailwindlabs/heroicons", kind: "icon", monotone: true },
  iconoir: { name: "Iconoir", license: "MIT", source: "https://github.com/iconoir-icons/iconoir", kind: "icon", monotone: true },
  bi: { name: "Bootstrap Icons", license: "MIT", source: "https://github.com/twbs/icons", kind: "icon", monotone: true },
  ri: { name: "Remix Icon", license: "Apache-2.0", source: "https://github.com/Remix-Design/RemixIcon", kind: "icon", monotone: true },
  mdi: { name: "Material Design Icons", license: "Apache-2.0", source: "https://github.com/Templarian/MaterialDesign", kind: "icon", monotone: true },
  "fluent-emoji-flat": { name: "Fluent Emoji", license: "MIT", source: "https://github.com/microsoft/fluentui-emoji", kind: "sticker", monotone: false },
};

export const ICON_PREFIXES = Object.keys(ICON_SETS).filter((p) => ICON_SETS[p].kind === "icon");
export const STICKER_PREFIXES = Object.keys(ICON_SETS).filter((p) => ICON_SETS[p].kind === "sticker");

const ID = /^([a-z0-9-]+):([a-z0-9]+(?:-[a-z0-9]+)*)$/;
export function parseIconId(id: string): { prefix: string; name: string } | null {
  const match = ID.exec(id);
  return match && Object.hasOwn(ICON_SETS, match[1]) ? { prefix: match[1], name: match[2] } : null;
}
export function isStudioIconId(id: string): boolean {
  return parseIconId(id) !== null;
}
export function isMonotoneIcon(id: string): boolean {
  const parsed = parseIconId(id);
  return Boolean(parsed && ICON_SETS[parsed.prefix].monotone);
}

/** Served by our own API from the installed open sets (see lib/studio/icon-server.ts). */
const API = "/api/studio/icons";
/** SVG at a fixed square; monotone icons take a color. */
export function iconSvgUrl(id: string, color?: string, size = 512): string {
  const parsed = parseIconId(id);
  if (!parsed) throw new Error("Unknown icon.");
  const query = new URLSearchParams({ size: String(size) });
  if (color && ICON_SETS[parsed.prefix].monotone && /^#[0-9a-f]{6}$/i.test(color)) query.set("color", color.toLowerCase());
  return `${API}/${parsed.prefix}/${parsed.name}?${query}`;
}
export function iconPreviewUrl(id: string, color?: string): string {
  return iconSvgUrl(id, color, 96);
}

const searchCache = new Map<string, Promise<string[]>>();
export function searchIcons(query: string, prefixes: readonly string[], limit = 64, start = 0): Promise<string[]> {
  const key = `${prefixes.join(",")}|${query}|${limit}|${start}`;
  const hit = searchCache.get(key);
  if (hit) return hit;
  const request = (async () => {
    const params = new URLSearchParams({ q: query, sets: prefixes.join(","), limit: String(limit), start: String(start) });
    const response = await fetch(`${API}/search?${params}`);
    if (!response.ok) throw new Error("Icon search is unavailable right now.");
    const data = (await response.json()) as { icons?: string[] };
    return (data.icons ?? []).filter(isStudioIconId);
  })();
  request.catch(() => searchCache.delete(key));
  searchCache.set(key, request);
  return request;
}

/** Fetched SVG text, cached by icon and color. */
const svgCache = new Map<string, Promise<string>>();
export function loadIconSvg(id: string, color?: string): Promise<string> {
  const url = iconSvgUrl(id, color);
  const hit = svgCache.get(url);
  if (hit) return hit;
  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error("Couldn’t load an icon. Check your connection and try again.");
    return response.text();
  });
  request.catch(() => svgCache.delete(url));
  svgCache.set(url, request);
  return request;
}

export const ICON_SHELVES: readonly { title: string; query: string }[] = [
  { title: "Sun & sky", query: "sun" }, { title: "Ocean", query: "wave" }, { title: "Palm & plants", query: "palm" }, { title: "Hearts", query: "heart" },
  { title: "Stars & sparkle", query: "sparkle" }, { title: "Coffee & food", query: "coffee" }, { title: "Music", query: "music" }, { title: "Travel", query: "airplane" },
  { title: "Moon & night", query: "moon" }, { title: "Mountains", query: "mountain" }, { title: "Camera", query: "camera" }, { title: "Arrows", query: "arrow" },
  { title: "Fire & energy", query: "fire" }, { title: "Crown", query: "crown" }, { title: "Anchor & sailing", query: "anchor" }, { title: "Flowers", query: "flower" },
];
export const STICKER_SHELVES: readonly { title: string; query: string }[] = [
  { title: "Smiles", query: "smiling" }, { title: "Hearts", query: "heart" }, { title: "Celebrate", query: "party" }, { title: "Sun & beach", query: "sun" },
  { title: "Ocean life", query: "fish" }, { title: "Animals", query: "cat" }, { title: "Food & treats", query: "pizza" }, { title: "Nature", query: "flower" },
  { title: "Travel", query: "airplane" }, { title: "Fire & sparkle", query: "fire" }, { title: "Music", query: "guitar" }, { title: "Sports", query: "basketball" },
];
