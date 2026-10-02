import sharp from "sharp";
import { ValidationError } from "@/lib/shared/errors";

/**
 * Bringing artwork in from other tools (Canva, Kittl, Photoshop, an AI image).
 * Files go straight to storage (not through a server action, which Vercel caps
 * at a few MB), then this module checks and normalizes them: SVG is sanitized
 * and drawn at print size on a transparent background, photos are rotated
 * upright and capped at a printable size, and the creator gets a plain-language
 * report of anything worth fixing before it prints.
 */
export const ARTWORK_IMPORT_MAX_BYTES = 60 * 1024 * 1024;
export const ARTWORK_MAX_SIDE = 6000;
export const ARTWORK_IMPORT_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif", "image/svg+xml"] as const;

export type ImportIssue = { level: "info" | "warn"; code: string; message: string; fix?: string };
export type ImportReport = {
  source: "svg" | "raster";
  width: number;
  height: number;
  hasTransparency: boolean;
  solidBackground: boolean;
  reduced: boolean;
  issues: ImportIssue[];
};
export type ImportedArtwork = { bytes: Buffer; mimeType: "image/png" | "image/jpeg"; extension: "png" | "jpg"; report: ImportReport };

export function validateArtworkImport(input: { mimeType: string; sizeBytes: number }) {
  if (!ARTWORK_IMPORT_MIME_TYPES.includes(input.mimeType as (typeof ARTWORK_IMPORT_MIME_TYPES)[number])) {
    throw new ValidationError("Bring in a PNG, JPG, WebP, GIF, HEIC or SVG. From Canva or Kittl, export as PNG with a transparent background, or SVG.");
  }
  if (input.sizeBytes <= 0) throw new ValidationError("That file is empty.");
  if (input.sizeBytes > ARTWORK_IMPORT_MAX_BYTES) throw new ValidationError("That file is over 60 MB. Export it again at the print size you need.");
}

/**
 * SVG is a document that can carry scripts and fetch other files, so only plain
 * drawing is accepted. Anything else is refused, never quietly "cleaned".
 */
export function sanitizeSvg(source: string): string {
  const text = source.replace(/^﻿/, "");
  if (!/<svg[\s>]/i.test(text)) throw new ValidationError("That doesn't look like an SVG file.");
  const refuse = (why: string): never => { throw new ValidationError(`This SVG can't be imported (${why}). Export it again from your design tool as a plain SVG, or as a PNG.`); };
  if (/<!DOCTYPE[^>]*\[/i.test(text) || /<!ENTITY/i.test(text)) refuse("it defines custom entities");
  if (/<\s*(script|foreignObject|iframe|embed|object|audio|video|animate|set)\b/i.test(text)) refuse("it contains scripts or embedded content");
  if (/\son[a-z]+\s*=/i.test(text)) refuse("it contains event handlers");
  if (/javascript:/i.test(text)) refuse("it contains script links");
  if (/@import/i.test(text)) refuse("it imports other files");
  for (const match of text.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
    const target = match[1].trim();
    if (target.startsWith("#")) continue;
    if (/^data:image\/(png|jpe?g|webp);base64,/i.test(target)) continue;
    refuse("it links to another file");
  }
  for (const match of text.matchAll(/url\(\s*["']?([^)"']*)["']?\s*\)/gi)) {
    if (!match[1].trim().startsWith("#")) refuse("it links to another file");
  }
  return text;
}

/** Share of pixels that are see-through, and whether the image sits on one solid color. */
async function inspect(input: Buffer) {
  const { data, info } = await sharp(input).resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) clear++;
  const at = (x: number, y: number) => { const o = (y * info.width + x) * 4; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };
  const edge: number[][] = [];
  for (let k = 0; k < info.width; k++) edge.push(at(k, 0), at(k, info.height - 1));
  for (let k = 0; k < info.height; k++) edge.push(at(0, k), at(info.width - 1, k));
  const ref = edge[0];
  const uniform = edge.every((p) => p[3] > 250 && Math.abs(p[0] - ref[0]) < 10 && Math.abs(p[1] - ref[1]) < 10 && Math.abs(p[2] - ref[2]) < 10);
  return { transparentShare: clear / n, solidBackground: uniform && ref[3] > 250 };
}

function reportFor(base: Omit<ImportReport, "issues">, transparentShare: number): ImportReport {
  const issues: ImportIssue[] = [];
  const longest = Math.max(base.width, base.height);
  if (base.reduced) issues.push({ level: "info", code: "reduced", message: `Reduced to ${ARTWORK_MAX_SIDE}px on the long side, which is plenty for print.` });
  if (longest < 1200) issues.push({ level: "warn", code: "low-resolution", message: `This is only ${base.width} × ${base.height} px. It will look soft on anything bigger than a small print.`, fix: "Export it larger from your design tool, or use a vector SVG." });
  if (base.solidBackground && !base.hasTransparency) issues.push({ level: "warn", code: "solid-background", message: "It sits on a solid background, which will print as a box on colored products.", fix: "Remove the background here, or export from your tool with a transparent background." });
  if (base.hasTransparency && transparentShare > 0.97) issues.push({ level: "warn", code: "nearly-empty", message: "Almost the whole image is transparent. Check the export.", fix: "Re-export and make sure the artwork is visible." });
  if (base.source === "svg") issues.push({ level: "info", code: "svg-drawn", message: "Drawn from your SVG at print resolution on a transparent background." });
  if (base.hasTransparency && base.source === "raster" && !issues.some((i) => i.level === "warn")) issues.push({ level: "info", code: "transparent", message: "Transparent background kept." });
  return { ...base, issues };
}

/** Check and normalize one imported file. */
export async function importArtwork(bytes: Buffer, mimeType: string, opts: { targetWidthPx?: number } = {}): Promise<ImportedArtwork> {
  validateArtworkImport({ mimeType, sizeBytes: bytes.length });
  if (mimeType === "image/svg+xml") {
    const svg = Buffer.from(sanitizeSvg(bytes.toString("utf8")));
    let meta;
    try { meta = await sharp(svg, { density: 72 }).metadata(); } catch { throw new ValidationError("We couldn't read that SVG. Export it again as a plain SVG, or as a PNG."); }
    const w = meta.width ?? 0, h = meta.height ?? 0;
    if (!w || !h) throw new ValidationError("That SVG has no size. Export it again from your design tool.");
    const wanted = Math.min(ARTWORK_MAX_SIDE, Math.max(1200, opts.targetWidthPx ?? 3000));
    const scale = wanted / Math.max(w, h);
    const density = Math.min(1200, Math.max(72, Math.round(72 * scale)));
    const png = await sharp(svg, { density, limitInputPixels: 80_000_000 }).resize(ARTWORK_MAX_SIDE, ARTWORK_MAX_SIDE, { fit: "inside", withoutEnlargement: false }).png({ compressionLevel: 9 }).toBuffer();
    const out = await sharp(png).metadata();
    const seen = await inspect(png);
    return { bytes: png, mimeType: "image/png", extension: "png", report: reportFor({ source: "svg", width: out.width ?? w, height: out.height ?? h, hasTransparency: true, solidBackground: false, reduced: false }, seen.transparentShare) };
  }
  let meta;
  try { meta = await sharp(bytes, { limitInputPixels: 120_000_000 }).metadata(); } catch { throw new ValidationError("We couldn't read that image. Try exporting it again as a PNG."); }
  const turned = (meta.orientation ?? 1) >= 5;
  const sourceW = (turned ? meta.height : meta.width) ?? 0, sourceH = (turned ? meta.width : meta.height) ?? 0;
  if (!sourceW || !sourceH) throw new ValidationError("We couldn't read that image. Try exporting it again as a PNG.");
  const reduced = Math.max(sourceW, sourceH) > ARTWORK_MAX_SIDE;
  const resized = sharp(bytes, { limitInputPixels: 120_000_000 }).rotate().resize(ARTWORK_MAX_SIDE, ARTWORK_MAX_SIDE, { fit: "inside", withoutEnlargement: true });
  const png = await resized.clone().png({ compressionLevel: 9 }).toBuffer();
  const seen = await inspect(png);
  const hasTransparency = Boolean(meta.hasAlpha) && seen.transparentShare > 0.001;
  const dims = await sharp(png).metadata();
  // Opaque photos stay small as JPEG; anything with transparency stays PNG.
  const keepJpeg = !hasTransparency && mimeType === "image/jpeg";
  const outBytes = keepJpeg ? await resized.clone().flatten({ background: "#ffffff" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer() : png;
  return { bytes: outBytes, mimeType: keepJpeg ? "image/jpeg" : "image/png", extension: keepJpeg ? "jpg" : "png", report: reportFor({ source: "raster", width: dims.width ?? sourceW, height: dims.height ?? sourceH, hasTransparency, solidBackground: seen.solidBackground, reduced }, seen.transparentShare) };
}
