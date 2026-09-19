"use server";

import { studioLayoutSchema, surfaceSchema } from "@/lib/domains/catalog/studio-layout";
import { assertBuilderRole } from "@/lib/domains/intelligence/partner-builder";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { approveAsset, getAssetById, validateImageUpload } from "@/lib/domains/assets/service";
import { persistDraftProduct } from "@/lib/domains/intelligence/service";
import { getProductById, addProductMediaUpload, setProductVariantSetup } from "@/lib/domains/catalog/service";
import { ValidationError } from "@/lib/shared/errors";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { setProductPrintArea } from "@/lib/domains/catalog/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function redirectLibrary(message: string, kind: "error" | "success"): never {
  const key = kind === "error" ? "error" : "success";
  redirect(`/partner/library?${key}=${encodeURIComponent(message)}`);
}

/** "island-tote_v2.png" -> "Island Tote V2" — a sane default name for a bulk import. */
function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./]+$/, "");
  const spaced = base.replace(/[_-]+/g, " ").trim();
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ") || "Untitled design";
}

export async function uploadLibraryDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const file = formData.get("file");

    if (!name) {
      redirectLibrary("Design name is required.", "error");
    }
    if (!(file instanceof File) || file.size === 0) {
      redirectLibrary("File is required.", "error");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const autoApprove = canModerateListings(session);

    await uploadPartnerDesign({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id,
      name,
      notes,
      file: buffer,
      filename: file.name,
      mimeType: file.type || "image/png",
      autoApprove,
    });

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    redirectLibrary(
      autoApprove
        ? "Design uploaded and available in Studio."
        : "Design uploaded as draft — waiting for partner approval.",
      "success",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}

export async function approveLibraryDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    if (!canModerateListings(session)) {
      redirectLibrary("Only the partner can approve designs.", "error");
    }
    const assetId = String(formData.get("assetId") ?? "").trim();
    if (!assetId) {
      redirectLibrary("Missing design.", "error");
    }

    await approveAsset({
      ventureId: session.ventureId,
      assetId,
      approvedById: session.appUser.id,
    });

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    redirectLibrary("Design approved for Studio.", "success");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}

export async function saveCanvasCompositionAction(formData: FormData): Promise<{ error: string } | void> {
  try {
    const session = await requirePartnerWorkspace();
    const name = String(formData.get("name") ?? "").trim() || "Canvas composition";
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirect(`/partner/canvas?error=${encodeURIComponent("Export failed — try again.")}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const blankProductId = String(formData.get("blankProductId") ?? "").trim();
    let designAssetId = String(formData.get("designAssetId") ?? "").trim();
    const studioInput = formData.get("studioLayout");
    const studio = studioInput ? studioLayoutSchema.parse(JSON.parse(String(studioInput))) : undefined;
    const surfaceFiles = formData.getAll("surfaceFiles").filter((f): f is File => f instanceof File && f.size > 0);
    if (studio) {
      if (!studio.surfaces.some(s => s.layers.length)) throw new ValidationError("Add artwork or text before saving.");
      if (surfaceFiles.length !== studio.surfaces.length - 1) throw new ValidationError("Preview every surface before saving.");
      const ids = new Set(studio.surfaces.flatMap(s => [s.assetId, ...s.layers.flatMap(l => (l.kind === "image" || l.kind === "pattern") ? [l.assetId] : [])]).filter((id): id is string => Boolean(id)));
      for (const id of ids) {
        const asset = await getAssetById({ventureId: session.ventureId, assetId:id});
        if (!["sweetoh_design", "product_asset"].includes(asset.assetType)) throw new ValidationError("Choose a product photo or library artwork.");
      }
      for (const image of surfaceFiles) validateImageUpload({mimeType:image.type,sizeBytes:image.size});
      const firstImage = studio.surfaces.flatMap(s=>s.layers).find(l=>l.kind === "image");
      if (firstImage?.kind === "image") designAssetId = firstImage.assetId;
    }
    const offsetX = Number(formData.get("offsetX") ?? 0);
    const offsetY = Number(formData.get("offsetY"));
    const scale = Number(formData.get("scale") ?? 1);
    const rotation = Number(formData.get("rotation"));
    const canvasSize = Number(formData.get("canvasSize") ?? 720);
    const textInput = String(formData.get("textLayer") || "null");
    const text = z.object({ value: z.string().max(120), x: z.number().min(0).max(720), y: z.number().min(0).max(720), size: z.number().min(12).max(120), color: z.string().regex(/^#[0-9a-f]{6}$/i) }).nullable().parse(JSON.parse(textInput)) ?? undefined;
    const hasLayout =
      blankProductId &&
      designAssetId &&
      [offsetX, offsetY, scale, rotation, canvasSize].every(Number.isFinite);

    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
    if (!studio && !hasLayout) throw new ValidationError("Choose a blank and an artwork before saving.");
    const blank = await getProductById({ ventureId: session.ventureId, productId: blankProductId });
    if (designAssetId) {
      const design = await getAssetById({ ventureId: session.ventureId, assetId: designAssetId });
      if (design.assetType !== "sweetoh_design") throw new ValidationError("Choose an artwork from your library.");
    }
    const saveAsProduct = formData.get("saveAsProduct") === "true";
    if (saveAsProduct && !canModerateListings(session)) throw new ValidationError("Only the shop partner can prepare a finished listing here.");

    // Text-only compositions retain a real asset reference for legacy consumers.
    if (studio && !designAssetId) {
      const artwork = await uploadPartnerDesign({ventureId:session.ventureId,ventureSlug:session.ventureSlug,uploadedById:session.appUser.id,name:`${name} — text preview`,notes:"Text composition reference",file:buffer,filename:"text-preview.png",mimeType:"image/png",autoApprove:false});
      designAssetId = artwork.id;
    }
    if (studio && canModerateListings(session)) {
      const surfaces = studio.surfaces.map(({layers,...surface})=>surface);
      await setProductPrintArea({ventureId:session.ventureId,productId:blank.id,printArea:{...surfaces[0].area,...{surfaces}}});
    }
    const composition = await uploadPartnerDesign({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id,
      name,
      notes: "Composed on blank in partner canvas",
      file: buffer,
      filename: file.name || "composition.png",
      mimeType: file.type || "image/png",
      autoApprove: canModerateListings(session),
      compositionLayout: studio || hasLayout
        ? { blankProductId, designAssetId, offsetX, offsetY, scale, rotation, canvasSize, text, studio }
        : null,
    });

    if (saveAsProduct) {
      const saved = await persistDraftProduct({ ventureId: session.ventureId, actorUserId: session.appUser.id,
        mode: "visual_intake", prompt: "Partner canvas composition — no AI call", rawResponse: { kind: "canvas_composition", blankProductId, designAssetId },
        sourceAssetId: composition.id, primaryAssetId: composition.id,
        output: { title: name, description: blank.description || "", shortDescription: blank.shortDescription || "",
          seoTitle: name.slice(0, 60), seoDescription: blank.seoDescription || "", category: blank.category,
          suggestedTags: blank.suggestedTags || [], suggestedCollections: [], suggestedPriceCents: 0,
          internalNotes: `Created on ${blank.name}. Review print area and product options before production.` },
      });
      if (studio) await setProductPrintArea({ ventureId: session.ventureId, productId: saved.product.id,
        printArea: { ...studio.surfaces[0].area, surfaces: studio.surfaces.map(({ layers: _layers, ...surface }) => surface) } });
      if (blank.variantOptions || blank.catalogSource)
        await setProductVariantSetup({ ventureId: session.ventureId, productId: saved.product.id,
          variantOptions: blank.variantOptions, catalogSource: blank.catalogSource });
      const colorFiles = formData.getAll("colorFiles").filter((f): f is File => f instanceof File && f.size > 0);
      const offered = new Set(blank.variantOptions?.colors.map((c) => c.name) ?? []);
      await addProductMediaUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
        productId: saved.product.id, actorUserId: session.appUser.id, file: buffer, filename: "mockup.png", mimeType: "image/png", assetId: composition.id });
      // One mockup per color the product is sold in, tagged so the storefront can switch.
      for (const [index, image] of colorFiles.entries()) {
        const color = image.name.replace(/\.(png|jpe?g)$/i, "");
        if (!offered.has(color)) continue;
        validateImageUpload({ mimeType: image.type, sizeBytes: image.size });
        await addProductMediaUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
          productId: saved.product.id, actorUserId: session.appUser.id, file: Buffer.from(await image.arrayBuffer()),
          filename: `color-${index + 1}.jpg`, mimeType: image.type, color });
      }
      for (const [index, image] of surfaceFiles.entries()) {
        await addProductMediaUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
          productId: saved.product.id, actorUserId: session.appUser.id, file: Buffer.from(await image.arrayBuffer()), filename: `surface-${index+2}.png`, mimeType: image.type });
      }
      revalidatePath("/partner");
      revalidatePath("/partner/builder");
      revalidatePath("/partner/review");
      redirect(`/partner/review/${saved.product.id}`);
    }

    revalidatePath("/partner/library");
    revalidatePath("/partner/canvas");
    revalidatePath("/studio");
    redirect(
      `/partner/library?success=${encodeURIComponent("Composition saved to your library.")}`,
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return { error: getActionErrorMessage(error) };
  }
}

export async function setBlankPrintAreaAction(input: {
  productId: string;
  printArea: { x: number; y: number; width: number; height: number };
}): Promise<{ error?: string }> {
  try {
    const session = await requirePartnerWorkspace();
    await setProductPrintArea({
      ventureId: session.ventureId,
      productId: input.productId,
      printArea: input.printArea,
    });
    revalidatePath("/partner/canvas");
    return {};
  } catch (error) {
    return { error: getActionErrorMessage(error) };
  }
}

/**
 * Bring in a batch of already-finished design files at once — separate from
 * the AI photo-intake lane on Create, which is for photographing a physical
 * product, not importing existing artwork. Best-effort: one bad file
 * doesn't block the rest of the batch.
 */
export async function bulkUploadLibraryDesignsAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      redirect(
        `/partner/create?error=${encodeURIComponent("Pick at least one design file.")}`,
      );
    }

    const autoApprove = canModerateListings(session);
    let succeeded = 0;
    const failed: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadPartnerDesign({
          ventureId: session.ventureId,
          ventureSlug: session.ventureSlug,
          uploadedById: session.appUser.id,
          name: nameFromFilename(file.name),
          notes: null,
          file: buffer,
          filename: file.name,
          mimeType: file.type || "image/png",
          autoApprove,
        });
        succeeded += 1;
      } catch {
        failed.push(file.name);
      }
    }

    revalidatePath("/partner/library");
    revalidatePath("/partner/canvas");
    revalidatePath("/studio");

    if (succeeded === 0) {
      redirect(
        `/partner/create?error=${encodeURIComponent("None of those files could be uploaded.")}`,
      );
    }

    const message =
      failed.length === 0
        ? `${succeeded} design${succeeded === 1 ? "" : "s"} added to your library.`
        : `${succeeded} design${succeeded === 1 ? "" : "s"} added; ${failed.length} failed (${failed.join(", ")}).`;

    redirect(`/partner/library?success=${encodeURIComponent(message)}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(
      `/partner/create?error=${encodeURIComponent(getActionErrorMessage(error))}`,
    );
  }
}

export async function saveBlankSurfacesAction(productId: string, input: unknown): Promise<{error?:string}> {
  try {
    const session=await requirePartnerWorkspace(); assertBuilderRole(session);
    const surfaces=z.array(surfaceSchema).min(1).max(12).refine(ss => new Set(ss.map(s => s.id)).size === ss.length, "Surface IDs must be unique.").parse(input);
    const blank=await getProductById({ventureId:session.ventureId,productId:z.string().uuid().parse(productId)});
    for(const s of surfaces) if(s.assetId) await getAssetById({ventureId:session.ventureId,assetId:s.assetId});
    const photos=new Set(blank.catalogSource?.images ?? []);
    for(const s of surfaces) if(s.imageUrl && !photos.has(s.imageUrl)) throw new ValidationError("Choose a photo of this product.");
    await setProductPrintArea({ventureId:session.ventureId,productId,printArea:{...surfaces[0].area,...{surfaces}}});
    revalidatePath("/partner/builder"); revalidatePath("/partner/canvas"); revalidatePath("/partner/catalog"); return {};
  } catch(error) {return {error:getActionErrorMessage(error)};}
}
