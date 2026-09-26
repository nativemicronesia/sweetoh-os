import type { StudioLayout } from "./studio-layout";
import { resolveStudioFontKey } from "@/lib/studio/font-provenance";

/** Make a rights-safe, independent copy of a saved Studio layout for a new composition. */
export function prepareStudioTemplateCopy(layout: StudioLayout, allowedAssetIds: ReadonlySet<string>) {
  let removedAssetCount = 0;
  let fontFallbackCount = 0;
  const copy = structuredClone(layout);
  copy.surfaces = copy.surfaces.map((surface) => ({
    ...surface,
    layers: surface.layers.flatMap((layer) => {
      if ((layer.kind === "image" || layer.kind === "pattern") && !allowedAssetIds.has(layer.assetId)) {
        removedAssetCount += 1;
        return [];
      }
      if (layer.kind === "text" && layer.font) {
        const font = resolveStudioFontKey(layer.font);
        if (font !== layer.font) fontFallbackCount += 1;
        return [{ ...layer, font }];
      }
      return [layer];
    }),
  }));
  return { layout: copy, removedAssetCount, fontFallbackCount };
}
