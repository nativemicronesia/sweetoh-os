import type { PrintRegion, StudioLayer, StudioSurface } from "@/lib/domains/catalog/studio-layout";
import { EDITOR_STAGE } from "@/lib/domains/catalog/production-geometry";

type Box = { x: number; y: number; width: number; height: number };

/**
 * Apply a saved standalone design to one product print region. The artboard is
 * scaled uniformly to fit the region and centered in it (contain, like Canva's
 * "resize"), so artwork keeps its proportions. Every layer kind carries its own
 * scale, so one similarity transform is exact for images, text, shapes,
 * patterns, graphics and drawings alike.
 */
export function applyDesignToRegion(
  design: Pick<StudioSurface, "area"> & { layers: StudioLayer[] },
  target: Pick<PrintRegion, "id" | "bounds">,
): StudioLayer[] {
  const from = toStage(design.area);
  const to = toStage(target.bounds);
  const factor = Math.min(to.width / from.width, to.height / from.height);
  const originX = to.x + (to.width - from.width * factor) / 2;
  const originY = to.y + (to.height - from.height * factor) / 2;
  return design.layers.map((layer) => ({
    ...layer,
    id: crypto.randomUUID(),
    x: originX + (layer.x - from.x) * factor,
    y: originY + (layer.y - from.y) * factor,
    scaleX: layer.scaleX * factor,
    scaleY: layer.scaleY * factor,
    printRegionId: target.id,
  }));
}

function toStage(box: Box): Box {
  return { x: box.x * EDITOR_STAGE, y: box.y * EDITOR_STAGE, width: box.width * EDITOR_STAGE, height: box.height * EDITOR_STAGE };
}
