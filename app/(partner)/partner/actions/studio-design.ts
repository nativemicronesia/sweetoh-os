"use server";

import { revalidatePath } from "next/cache";
import { getAssetById, replaceCompositionAsset, validateImageUpload } from "@/lib/domains/assets/service";
import { studioLayoutSchema } from "@/lib/domains/catalog/studio-layout";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { canInsertCreativeLibraryAsset } from "@/lib/domains/library/model";
import { getCreativeLibraryAsset } from "@/lib/domains/library/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";
import { resolveStudioFontKey } from "@/lib/studio/font-provenance";
import { isStandaloneDesign } from "@/lib/studio/design-canvas";

export type SaveStudioDesignResult = { error: string } | { saved: { id: string; name: string } };

/**
 * Save a standalone Studio design: artwork on a sized artboard, no product.
 * Nothing here reads or writes product geometry; products consume designs later.
 * Saving an open design updates it in place (same id), so autosave never piles up copies.
 */
export async function saveStudioDesignAction(formData: FormData): Promise<SaveStudioDesignResult> {
  try {
    const session = await requirePartnerWorkspace();
    const name = (String(formData.get("name") ?? "").trim() || "Untitled design").slice(0, 180);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ValidationError("Export failed — try again.");
    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });

    const parsed = studioLayoutSchema.parse(JSON.parse(String(formData.get("studioLayout") ?? "null")));
    if (!isStandaloneDesign(parsed)) throw new ValidationError("This save is only for standalone designs.");
    if (!parsed.surfaces[0].layers.length) throw new ValidationError("Add artwork or text before saving.");
    const studio = {
      ...parsed,
      surfaces: parsed.surfaces.map((surface) => ({
        ...surface,
        layers: surface.layers.map((layer) => layer.kind === "text" && layer.font ? { ...layer, font: resolveStudioFontKey(layer.font) } : layer),
      })),
    };

    const assetIds = new Set(studio.surfaces.flatMap((surface) => surface.layers.flatMap((layer) => layer.kind === "image" || layer.kind === "pattern" ? [layer.assetId] : [])));
    for (const assetId of assetIds) {
      const creative = await getCreativeLibraryAsset({ ventureId: session.ventureId, assetId });
      if (!creative || !canInsertCreativeLibraryAsset(creative, session.ventureId)) {
        throw new ValidationError("A saved image is no longer cleared for Studio use. Remove it, or replace it with an available library asset, then save again.");
      }
      const row = await getAssetById({ ventureId: session.ventureId, assetId });
      if (!["sweetoh_design", "product_asset"].includes(row.assetType)) throw new ValidationError("Choose a product photo or library artwork.");
    }

    const previousId = String(formData.get("designId") ?? "").trim();
    const previous = previousId ? await getAssetById({ ventureId: session.ventureId, assetId: previousId }).catch(() => null) : null;
    const replaces = previous && previous.assetType === "sweetoh_design" && isStandaloneDesign(previous.compositionLayout?.studio) ? previous : null;

    const compositionLayout = { studio, blankProductId: null, designAssetId: null, offsetX: 0, offsetY: 0, scale: 1, rotation: 0, canvasSize: 720 };
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = replaces
      ? await replaceCompositionAsset({ ventureId: session.ventureId, ventureSlug: session.ventureSlug, assetId: replaces.id, name, file: bytes, filename: file.name || "design.png", mimeType: file.type || "image/png", compositionLayout })
      : await uploadPartnerDesign({
          ventureId: session.ventureId,
          ventureSlug: session.ventureSlug,
          uploadedById: session.appUser.id,
          name,
          notes: "Standalone Studio design",
          file: bytes,
          filename: file.name || "design.png",
          mimeType: file.type || "image/png",
          autoApprove: false,
          compositionLayout,
        });

    revalidatePath("/partner/studio");
    revalidatePath("/partner/library");
    return { saved: { id: saved.id, name } };
  } catch (error) {
    return { error: getActionErrorMessage(error) };
  }
}
