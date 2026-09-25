/** Stable brush identities are stored on drawing layers so the editor can add
 * richer engines later without changing the freehand document boundary. */
export const STUDIO_DRAW_BRUSHES = [
  { id: "pencil", label: "Pencil", description: "A clean, rounded line.", width: 5, opacity: 1 },
  { id: "marker", label: "Marker", description: "A broad, translucent marker line.", width: 16, opacity: 0.42 },
  { id: "dashed", label: "Dotted", description: "A broken line for accents and guides.", width: 6, opacity: 1 },
] as const;

export type StudioDrawBrush = (typeof STUDIO_DRAW_BRUSHES)[number]["id"];

export function studioDrawBrush(value: unknown): StudioDrawBrush {
  return STUDIO_DRAW_BRUSHES.some((brush) => brush.id === value) ? value as StudioDrawBrush : "pencil";
}

export function drawingDashPattern(brush: StudioDrawBrush, width: number): number[] | undefined {
  return brush === "dashed" ? [Math.max(2, width * 1.7), Math.max(2, width * 1.15)] : undefined;
}
