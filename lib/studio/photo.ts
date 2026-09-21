/**
 * Printify serves catalog photos as full-size originals (~4–5 MB PNGs), which
 * is minutes on an island connection. Route them through /api/photo, which
 * shrinks them to the size actually shown and lets the CDN keep the result.
 * Any other URL is returned unchanged.
 */
export const PHOTO_WIDTHS = [400, 800, 1200] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

export function sizedPhoto<T extends string | null | undefined>(url: T, width: PhotoWidth = 1200): T {
  if (!url || !url.startsWith("https://images.printify.com/")) return url;
  return `/api/photo?src=${encodeURIComponent(url)}&w=${width}` as T;
}
