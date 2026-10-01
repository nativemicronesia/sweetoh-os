/**
 * Clean flat product blanks, drawn at real size.
 *
 * When a product has no verified blank photo, Studio shows the product as a
 * neutral flat illustration (no sample artwork, no supplier photo) scaled so its
 * print zone matches the surface's printable dimensions. These are visual aids
 * for placing artwork in context: production geometry still comes only from the
 * print region, and a verified photo is still required for customer-facing
 * mockups.
 */
export type FlatBlankKind = "tee" | "hoodie" | "tote" | "panel";

const STAGE = 720;

export function flatBlankKindFor(input: { name?: string | null; model?: string | null; position?: string | null }): FlatBlankKind {
  const text = `${input.name ?? ""} ${input.model ?? ""}`.toLowerCase();
  const position = input.position ?? "front";
  if (position !== "front" && position !== "back") return "panel";
  if (/hood|sweatshirt|pullover|zip/.test(text)) return "hoodie";
  if (/tote|bag|backpack/.test(text)) return "tote";
  if (/tee|t-shirt|shirt|tank|jersey|polo|onesie|bodysuit/.test(text)) return "tee";
  return "panel";
}

type Zone = { x: number; y: number; width: number; height: number };

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))));
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
}
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 170;
}

/**
 * zone: the print region's bounds as fractions of the 720-unit stage.
 * widthIn: the region's real printable width in inches, which sets the scale.
 */
export function flatBlankSvg(kind: FlatBlankKind, opts: { zone: Zone; widthIn: number; heightIn: number; color: string; position?: string | null }): string {
  const { zone, widthIn, heightIn } = opts;
  const color = /^#[0-9a-f]{6}$/i.test(opts.color) ? opts.color : "#ffffff";
  const u = (zone.width * STAGE) / widthIn; // stage units per inch
  const ox = (zone.x + zone.width / 2) * STAGE;
  const oy = zone.y * STAGE;
  const edge = isLight(color) ? "#aab2ad" : shade(color, -0.35);
  const rib = shade(color, isLight(color) ? -0.08 : 0.12);
  const back = opts.position === "back";
  let body = "";
  if (kind === "tee") {
    const neck = back ? -4.4 : -1.7;
    body = `<path d="M -3.7 -5.2 Q 0 ${neck} 3.7 -5.2 L 9.4 -4.6 L 16.8 1.6 L 14.2 5.2 L 10 2.6 L 10 23 L -10 23 L -10 2.6 L -14.2 5.2 L -16.8 1.6 L -9.4 -4.6 Z" fill="${color}" stroke="${edge}" stroke-width="0.24"/>
      <path d="M -3.7 -5.2 Q 0 ${neck} 3.7 -5.2" fill="none" stroke="${rib}" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M 10 2.6 L 10 23 M -10 2.6 L -10 23" stroke="${edge}" stroke-width="0.1" opacity=".5"/>`;
  } else if (kind === "hoodie") {
    const w = Math.max(11, widthIn / 2 + 4);
    body = `<ellipse cx="0" cy="-6.4" rx="6.4" ry="5.2" fill="${shade(color, -0.06)}" stroke="${edge}" stroke-width="0.18"/>
      <path d="M -4 -5.6 Q 0 -1.2 4 -5.6 L ${w - 1.2} -4.8 L ${w + 6.8} 16 L ${w + 3.4} 17.2 L ${w} 4.6 L ${w} 25 L -${w} 25 L -${w} 4.6 L -${w + 3.4} 17.2 L -${w + 6.8} 16 L -${w - 1.2} -4.8 Z" fill="${color}" stroke="${edge}" stroke-width="0.18"/>
      <path d="M -1.6 -3.4 L -1.6 3 M 1.6 -3.4 L 1.6 3" stroke="${rib}" stroke-width="0.35" stroke-linecap="round"/>`;
  } else if (kind === "tote") {
    const w = Math.max(15, widthIn + 3) / 2;
    const top = -3.2, bottom = heightIn + 3;
    body = `<path d="M -${w * 0.55} ${top} C -${w * 0.55} ${top - 9} ${w * 0.55} ${top - 9} ${w * 0.55} ${top}" fill="none" stroke="${rib}" stroke-width="1.1" stroke-linecap="round"/>
      <rect x="-${w}" y="${top}" width="${w * 2}" height="${bottom - top}" rx="0.6" fill="${color}" stroke="${edge}" stroke-width="0.18"/>`;
  } else {
    const m = Math.max(0.6, widthIn * 0.06);
    body = `<rect x="-${widthIn / 2 + m}" y="-${m}" width="${widthIn + m * 2}" height="${heightIn + m * 2}" rx="${m * 0.7}" fill="${color}" stroke="${edge}" stroke-width="0.12"/>`;
  }
  const defs = `<defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient></defs>`;
  const shaded = body.replace(/fill="(?!none|url)[^"]*"/g, 'fill="url(#g)"').replace(/stroke="[^"]*"/g, 'stroke="none"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE}" height="${STAGE}" viewBox="0 0 ${STAGE} ${STAGE}">${defs}<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${u.toFixed(4)})" >${body}${shaded}</g></svg>`;
}

export function flatBlankDataUrl(...args: Parameters<typeof flatBlankSvg>): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(flatBlankSvg(...args))}`;
}

/** Garment extent in inches around a print zone's top-center, per blank kind. */
function extent(kind: FlatBlankKind, widthIn: number, heightIn: number) {
  if (kind === "tee") return { half: Math.max(16.8, widthIn / 2), top: -5.2, bottom: Math.max(23, heightIn + 3) };
  if (kind === "hoodie") return { half: Math.max(17.8, widthIn / 2 + 6.8), top: -11.6, bottom: Math.max(25, heightIn + 3) };
  if (kind === "tote") return { half: Math.max(7.5, (widthIn + 3) / 2), top: -12.2, bottom: heightIn + 3 };
  const m = Math.max(0.6, widthIn * 0.06);
  return { half: widthIn / 2 + m, top: -m, bottom: heightIn + m };
}

/**
 * Where the print zone sits on the 720 stage (as fractions) so the whole blank
 * fits, centered, with the zone at the printable size's true proportions.
 */
export function flatBlankZone(kind: FlatBlankKind, widthIn: number, heightIn: number): Zone {
  const e = extent(kind, widthIn, heightIn);
  const u = Math.min((0.9 * STAGE) / (e.half * 2), (0.9 * STAGE) / (e.bottom - e.top));
  const oy = STAGE / 2 - (u * (e.top + e.bottom)) / 2;
  const width = (widthIn * u) / STAGE;
  return { x: 0.5 - width / 2, y: oy / STAGE, width, height: (heightIn * u) / STAGE };
}
