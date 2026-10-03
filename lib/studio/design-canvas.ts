import type { StudioSurface } from "@/lib/domains/catalog/studio-layout";

/**
 * Standalone Studio designs. A design is created without choosing a product:
 * it is one artboard with a real physical size, saved and reopened on its own,
 * and later applied to products (see ./design-apply.ts).
 */
export const DESIGN_EXPORT_DPI = 300;
/** The editor exports at most this many pixels per side. */
export const DESIGN_MAX_PX = 6000;
export const DESIGN_MIN_PX = 40;
export const DESIGN_SURFACE_ID = "design";
export const DESIGN_REGION_ID = "canvas";
/** Editor stage is a square of this many units; artboards sit inside it. */
const STAGE_FILL = 0.9;

export type DesignUnit = "px" | "in" | "mm" | "cm";
export type DesignSize = { width: number; height: number; unit: DesignUnit };

export type DesignType = {
  id: string;
  name: string;
  hint: string;
  size: DesignSize;
};

/** Starting points, like Canva's design types; "Custom size" is always available. */
export const DESIGN_TYPES: readonly DesignType[] = [
  { id: "square", name: "Square artwork", hint: "12 × 12 in", size: { width: 12, height: 12, unit: "in" } },
  { id: "portrait", name: "Portrait artwork", hint: "12 × 16 in · apparel, prints", size: { width: 12, height: 16, unit: "in" } },
  { id: "landscape", name: "Landscape artwork", hint: "16 × 12 in", size: { width: 16, height: 12, unit: "in" } },
  { id: "wrap", name: "Wrap / mug", hint: "9 × 3.5 in", size: { width: 9, height: 3.5, unit: "in" } },
  { id: "sticker", name: "Sticker", hint: "4 × 4 in", size: { width: 4, height: 4, unit: "in" } },
  { id: "pattern", name: "Seamless pattern tile", hint: "12 × 12 in", size: { width: 12, height: 12, unit: "in" } },
  { id: "social", name: "Social post", hint: "1080 × 1080 px", size: { width: 1080, height: 1080, unit: "px" } },
];

export function designTypeById(id: string | null | undefined): DesignType | undefined {
  return DESIGN_TYPES.find((type) => type.id === id);
}

const UNIT_PER_INCH: Record<DesignUnit, number> = { px: DESIGN_EXPORT_DPI, in: 1, mm: 25.4, cm: 2.54 };

/** Export pixels for a size; px sizes export 1:1, physical sizes at 300 DPI. */
export function designPixels(size: DesignSize): { width: number; height: number } {
  const perUnit = DESIGN_EXPORT_DPI / UNIT_PER_INCH[size.unit];
  return size.unit === "px"
    ? { width: Math.round(size.width), height: Math.round(size.height) }
    : { width: Math.round(size.width * perUnit), height: Math.round(size.height * perUnit) };
}

export function parseDesignSize(input: { width: unknown; height: unknown; unit: unknown }): { size: DesignSize } | { error: string } {
  const unit = input.unit;
  if (unit !== "px" && unit !== "in" && unit !== "mm" && unit !== "cm") return { error: "Choose px, in, mm or cm." };
  const width = Number(input.width);
  const height = Number(input.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { error: "Enter a width and height." };
  const size: DesignSize = { width, height, unit };
  const px = designPixels(size);
  if (px.width < DESIGN_MIN_PX || px.height < DESIGN_MIN_PX) return { error: `Designs must be at least ${DESIGN_MIN_PX} px on each side.` };
  if (px.width > DESIGN_MAX_PX || px.height > DESIGN_MAX_PX) {
    const inches = Math.floor(DESIGN_MAX_PX / DESIGN_EXPORT_DPI);
    return { error: `Designs can be up to ${DESIGN_MAX_PX} px (${inches} in at ${DESIGN_EXPORT_DPI} DPI) on each side.` };
  }
  return { size };
}

export function describeDesignSize(size: DesignSize): string {
  const px = designPixels(size);
  const label = size.unit === "px" ? `${px.width} × ${px.height} px` : `${round(size.width)} × ${round(size.height)} ${size.unit}`;
  return size.unit === "px" ? label : `${label} · ${px.width} × ${px.height} px @ ${DESIGN_EXPORT_DPI} DPI`;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/** The single artboard surface for a standalone design: real physical size, no product photo. */
export function designCanvasSurface(size: DesignSize): StudioSurface {
  const aspect = size.width / size.height;
  const width = aspect >= 1 ? STAGE_FILL : STAGE_FILL * aspect;
  const height = aspect >= 1 ? STAGE_FILL / aspect : STAGE_FILL;
  const bounds = { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
  // The area schema stores in/cm; px sizes are expressed in inches at the export DPI.
  const dimensions = size.unit === "px"
    ? { width: size.width / DESIGN_EXPORT_DPI, height: size.height / DESIGN_EXPORT_DPI, unit: "in" as const }
    : size.unit === "mm"
      ? { width: size.width / 10, height: size.height / 10, unit: "cm" as const }
      : { width: size.width, height: size.height, unit: size.unit };
  return {
    id: DESIGN_SURFACE_ID,
    name: "Design",
    assetId: null,
    position: DESIGN_SURFACE_ID,
    area: bounds,
    printRegions: [{ id: DESIGN_REGION_ID, name: "Page", bounds, shape: "rectangle", dimensions }],
  };
}

export function isStandaloneDesign(studio: { surfaces: { id: string; position?: string }[] } | null | undefined): boolean {
  return Boolean(studio && studio.surfaces.length === 1 && studio.surfaces[0].position === DESIGN_SURFACE_ID);
}
