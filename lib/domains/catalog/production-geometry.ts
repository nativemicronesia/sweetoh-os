import type { PrintRegion } from "./studio-layout";

/**
 * Production geometry: the single place that turns a print region (editor
 * fractions of the 720-unit stage + a real physical size) into manufacturing
 * numbers. Supplier print areas (Printify placeholders) are pixel sizes at
 * 300 DPI. Mockups and previews never feed this; only the region does.
 */
export const PRODUCTION_DPI = 300;
export const EDITOR_STAGE = 720;

export type PhysicalSize = { width: number; height: number; unit: "in" | "cm" };

/** Print file pixels for a region's physical size at the production DPI. */
export function physicalToPixels(size: PhysicalSize): { width: number; height: number } {
  const factor = size.unit === "cm" ? PRODUCTION_DPI / 2.54 : PRODUCTION_DPI;
  return { width: Math.round(size.width * factor), height: Math.round(size.height * factor) };
}

export function pixelsToInches(px: { width: number; height: number }): PhysicalSize {
  return { width: px.width / PRODUCTION_DPI, height: px.height / PRODUCTION_DPI, unit: "in" };
}

/** Production pixel size of a region, from its own dimensions when it has them. */
export function regionProductionPixels(region: Pick<PrintRegion, "dimensions">): { width: number; height: number } | null {
  return region.dimensions ? physicalToPixels(region.dimensions) : null;
}

/** Editor stage point -> pixel coordinates in the exported print file for this region. */
export function stageToProduction(
  region: Pick<PrintRegion, "bounds">,
  pixels: { width: number; height: number },
  point: { x: number; y: number },
): { x: number; y: number } {
  const b = region.bounds;
  return {
    x: ((point.x / EDITOR_STAGE - b.x) / b.width) * pixels.width,
    y: ((point.y / EDITOR_STAGE - b.y) / b.height) * pixels.height,
  };
}

/** Pixel coordinates in the print file -> editor stage point. */
export function productionToStage(
  region: Pick<PrintRegion, "bounds">,
  pixels: { width: number; height: number },
  point: { x: number; y: number },
): { x: number; y: number } {
  const b = region.bounds;
  return {
    x: (b.x + (point.x / pixels.width) * b.width) * EDITOR_STAGE,
    y: (b.y + (point.y / pixels.height) * b.height) * EDITOR_STAGE,
  };
}

export function describeProductionSize(size: PhysicalSize): string {
  const px = physicalToPixels(size);
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${r(size.width)} × ${r(size.height)} ${size.unit} · ${px.width} × ${px.height} px @ ${PRODUCTION_DPI} DPI`;
}
