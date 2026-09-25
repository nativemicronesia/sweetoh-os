import { z } from "zod";

/** Stable brush identities are stored on drawing layers so the editor can add
 * richer engines later without changing the freehand document boundary. */
export const STUDIO_DRAW_BRUSHES = [
  { id: "pencil", label: "Pencil", description: "A clean, rounded line.", width: 5, opacity: 1 },
  { id: "marker", label: "Marker", description: "A broad, translucent marker line.", width: 16, opacity: 0.42 },
  { id: "dashed", label: "Dotted", description: "A broken line for accents and guides.", width: 6, opacity: 1 },
] as const;
export type StudioDrawBrush = (typeof STUDIO_DRAW_BRUSHES)[number]["id"];

/** Original procedural resources authored for SweetOh Studio; no third-party
 * artwork is bundled. Stable IDs and provenance travel with saved presets. */
export const STUDIO_DRAW_TEXTURES = [
  { id: "sweetoh-grain", label: "Soft grain", source: "SweetOh OS original procedural tile", license: "Original in-repository resource; cleared for SweetOh Studio designs." },
  { id: "sweetoh-woven", label: "Woven lines", source: "SweetOh OS original procedural tile", license: "Original in-repository resource; cleared for SweetOh Studio designs." },
] as const;

export const studioBrushPresetSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(36),
  baseBrush: z.enum(["pencil", "marker", "dashed"]),
  textureId: z.enum(["sweetoh-grain", "sweetoh-woven"]),
  textureScale: z.number().min(0.5).max(3),
  pressureMode: z.enum(["size", "opacity", "size-opacity"]),
});
export type StudioBrushPreset = z.infer<typeof studioBrushPresetSchema>;

const textureCanvasCache = new Map<string, HTMLCanvasElement>();
export function studioBrushTextureCanvas(textureId: StudioBrushPreset["textureId"], scale = 1, color = "#173e39") {
  const key = `${textureId}:${scale}:${color}`;
  const cached = textureCanvasCache.get(key);
  if (cached) return cached;
  const size = Math.max(8, Math.round(24 / scale));
  const tile = document.createElement("canvas"); tile.width = size; tile.height = size;
  const context = tile.getContext("2d");
  if (!context) return tile;
  context.clearRect(0, 0, size, size);
  if (textureId === "sweetoh-grain") {
    // Deterministic, repeatable tiny specks; no random seed or downloaded art.
    for (let i = 0; i < 22; i++) {
      const x = (i * 37 + 7) % size; const y = (i * 19 + 3) % size;
      context.fillStyle = color; context.globalAlpha = i % 3 ? 0.4 : 0.65;
      context.fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
    }
  } else {
    context.strokeStyle = color; context.globalAlpha = 0.45; context.lineWidth = 1;
    for (let i = 0; i < size; i += 4) { context.beginPath(); context.moveTo(0, i); context.lineTo(size, i); context.moveTo(i, 0); context.lineTo(i, size); context.stroke(); }
  }
  context.globalAlpha = 1;
  textureCanvasCache.set(key, tile);
  return tile;
}

export function studioDrawBrush(value: unknown): StudioDrawBrush {
  return STUDIO_DRAW_BRUSHES.some((brush) => brush.id === value) ? value as StudioDrawBrush : "pencil";
}

export function drawingDashPattern(brush: StudioDrawBrush, width: number): number[] | undefined {
  return brush === "dashed" ? [Math.max(2, width * 1.7), Math.max(2, width * 1.15)] : undefined;
}
