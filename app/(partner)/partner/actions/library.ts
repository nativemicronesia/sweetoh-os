"use server";

import { studioLayoutSchema, surfaceSchema, PRODUCTION_BLANK_ASSET_NOTES, inferSurfaceImageRole, productPrintAreaFromStudio, studioMatchesProductPrintArea } from "@/lib/domains/catalog/studio-layout";
import { assertBuilderRole } from "@/lib/domains/intelligence/partner-builder";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { approveAsset, archiveAsset, getAssetById, getAssetSignedUrl, validateImageUpload } from "@/lib/domains/assets/service";
import { persistDraftProduct } from "@/lib/domains/intelligence/service";
import { getProductById, addProductMediaUpload, markProductDraftReviewed, setProductPrintArea, setProductVariantSetup, updateProduct } from "@/lib/domains/catalog/service";
import { ValidationError } from "@/lib/shared/errors";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace, requireStudioWorkspace, studioBase } from "@/lib/domains/identity/service";
import { getCreditBalance } from "@/lib/domains/creator/credits";
import { countPartnerCompositions } from "@/lib/domains/catalog/partner-design-library";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { plainCatalogDescription } from "@/lib/integrations/printify/catalog";
import { canInsertCreativeLibraryAsset } from "@/lib/domains/library/model";
import { getCreativeLibraryAsset } from "@/lib/domains/library/service";
import { resolveStudioFontKey } from "@/lib/studio/font-provenance";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { isDeepStrictEqual } from "node:util";

export async function resolveStudioCreativeAssetAction(assetId: string) {
  const session = await requirePartnerWorkspace();
  const unavailable = (error: string) => ({ assetId: null, name: null, previewUrl: null, error });
  if (!z.string().uuid().safeParse(assetId).success) return unavailable("That library asset is unavailable.");
  const creativeAsset = await getCreativeLibraryAsset({ ventureId: session.ventureId, assetId });
  if (!creativeAsset || !canInsertCreativeLibraryAsset(creativeAsset, session.ventureId)) {
    return unavailable("That library asset is not available for Studio use.");
  }
  const asset = await getAssetById({ ventureId: session.ventureId, assetId });
  const previewUrl = await getAssetSignedUrl({ ventureId: session.ventureId, assetId });
  if (!previewUrl) return unavailable("A preview is not available for that asset.");
  return { assetId: asset.id, name: asset.name, previewUrl, error: null };
}

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

/** Hide a file from My files. Products already using it keep their images. */
export async function removeLibraryDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const assetId = String(formData.get("assetId") ?? "").trim();
    if (!assetId) redirectLibrary("Missing file.", "error");
    await archiveAsset({ ventureId: session.ventureId, assetId, actorUserId: session.appUser.id, reason: "Removed from My files" });
    revalidatePath("/partner/library");
    redirectLibrary("File removed.", "success");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}

export async function saveCanvasCompositionAction(formData: FormData): Promise<{ error: string } | void> {
  try {
    const session = await requireStudioWorkspace();
    const paths = studioBase(session);
    const name = String(formData.get("name") ?? "").trim() || "Canvas composition";
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirect(`${paths.canvas}?error=${encodeURIComponent("Export failed — try again.")}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const blankProductId = String(formData.get("blankProductId") ?? "").trim();
    let designAssetId = String(formData.get("designAssetId") ?? "").trim();
    const studioInput = formData.get("studioLayout");
    const parsedStudio = studioInput ? studioLayoutSchema.parse(JSON.parse(String(studioInput))) : undefined;
    const studio = parsedStudio ? {
      ...parsedStudio,
      surfaces: parsedStudio.surfaces.map((surface) => ({
        ...surface,
        layers: surface.layers.map((layer) => layer.kind === "text" && layer.font
          ? { ...layer, font: resolveStudioFontKey(layer.font) }
          : layer),
      })),
    } : undefined;
    const surfaceFiles = formData.getAll("surfaceFiles").filter((f): f is File => f instanceof File && f.size > 0);
    const referencedAssets = new Map<string, Awaited<ReturnType<typeof getAssetById>>>();
    if (studio) {
      if (!studio.surfaces.some(s => s.layers.length)) throw new ValidationError("Add artwork or text before saving.");
      if (surfaceFiles.length !== studio.surfaces.length - 1) throw new ValidationError("Preview every surface before saving.");
      const creativeLayerIds = new Set(studio.surfaces.flatMap((surface) => surface.layers.flatMap((layer) => layer.kind === "image" || layer.kind === "pattern" ? [layer.assetId] : [])));
      for (const assetId of creativeLayerIds) {
        const creativeAsset = await getCreativeLibraryAsset({ ventureId: session.ventureId, assetId });
        if (!creativeAsset || !canInsertCreativeLibraryAsset(creativeAsset, session.ventureId)) {
          throw new ValidationError("A saved image is no longer cleared for Studio use. Remove it, or replace it with an available library asset, then save again.");
        }
      }
      const ids = new Set(studio.surfaces.flatMap(s => [s.assetId, s.referenceAssetId, ...s.layers.flatMap(l => (l.kind === "image" || l.kind === "pattern") ? [l.assetId] : [])]).filter((id): id is string => Boolean(id)));
      for (const id of ids) {
        const asset = await getAssetById({ventureId: session.ventureId, assetId:id});
        referencedAssets.set(id, asset);
        if (!["sweetoh_design", "product_asset"].includes(asset.assetType)) throw new ValidationError("Choose a product photo or library artwork.");
      }
      for (const surface of studio.surfaces) if (surface.imageRole === "production_blank") {
        const blankAsset = surface.assetId ? referencedAssets.get(surface.assetId) : null;
        if (!blankAsset || blankAsset.notes !== PRODUCTION_BLANK_ASSET_NOTES) throw new ValidationError("Only a verified background-removed blank can be used as a production surface.");
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

    const applyToProductDraftId = String(formData.get("applyToProductDraftId") ?? "").trim();
    let applyTarget: Awaited<ReturnType<typeof getActorProductDraft>> = null;
    if (applyToProductDraftId) {
      if (session.role !== "partner" && session.role !== "owner") throw new ValidationError("Only the Sweet'Oh partner can apply Studio designs to product drafts.");
      if (!studio || formData.get("saveAsProduct") === "true") throw new ValidationError("Save a Studio composition before applying it to a product draft.");
      applyTarget = await getActorProductDraft({ ventureId: session.ventureId, actorUserId: session.appUser.id, productId: z.string().uuid().parse(applyToProductDraftId) });
      const builderData = builderRecord(applyTarget?.session?.rawResponse);
      if (!applyTarget || applyTarget.product.active || !["draft", "needs_work", "pending_review", "approved"].includes(applyTarget.product.draftStatus)
        || applyTarget.product.fulfillmentType !== "sweetoh" || builderData?.purpose === "blank"
        || !studioMatchesProductPrintArea(studio, applyTarget.product.printArea)) {
        throw new ValidationError("Choose one of your editable private product drafts with matching production surfaces.");
      }
      const savedSurfaces = applyTarget.product.printArea?.surfaces ?? [];
      if (!studio.surfaces.length || studio.surfaces.some((surface, index) => {
        const saved = savedSurfaces[index];
        const imageRole = saved ? inferSurfaceImageRole({ ...saved, assetNotes: saved.assetId ? referencedAssets.get(saved.assetId)?.notes : null }) : null;
        return !saved || imageRole !== "production_blank" || !saved.assetId || surface.imageRole !== "production_blank";
      })) {
        throw new ValidationError("This product draft needs matching verified production blanks on every surface.");
      }
    }
    const sourceCompositionId = String(formData.get("sourceCompositionId") ?? "").trim();
    let reusableComposition: Awaited<ReturnType<typeof getAssetById>> | null = null;
    if (applyTarget && studio && z.string().uuid().safeParse(sourceCompositionId).success) {
      const source = await getAssetById({ ventureId: session.ventureId, assetId: sourceCompositionId }).catch(() => null);
      if (source?.assetType === "sweetoh_design" && ["approved", "licensed"].includes(source.status)
        && source.compositionLayout?.studio && isDeepStrictEqual(source.compositionLayout.studio, studio)) {
        reusableComposition = source;
      }
    }

    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
    if (!studio && !hasLayout) throw new ValidationError("Choose a blank and an artwork before saving.");
    const blank = await getProductById({ ventureId: session.ventureId, productId: blankProductId });
    if (designAssetId) {
      const design = await getAssetById({ ventureId: session.ventureId, assetId: designAssetId });
      if (design.assetType !== "sweetoh_design") throw new ValidationError("Choose an artwork from your library.");
    }
    const saveAsProduct = formData.get("saveAsProduct") === "true";
    if (saveAsProduct && !canModerateListings(session)) throw new ValidationError("Only the shop partner can prepare a finished listing here.");
    if (saveAsProduct) {
      const front = studio?.surfaces[0] ?? blank.printArea?.surfaces?.[0];
      if (!front || front.imageRole !== "production_blank" || !front.assetId) {
        throw new ValidationError("Prepare a verified clean production blank before creating a customer-facing product mockup. Your design can still be saved to My files.");
      }
      const frontAsset = await getAssetById({ ventureId: session.ventureId, assetId: front.assetId });
      if (frontAsset.notes !== PRODUCTION_BLANK_ASSET_NOTES) {
        throw new ValidationError("This product surface has not been verified as a clean blank, so it cannot be used as a customer-facing product mockup.");
      }
    }

    // Text, shape and registry-graphic compositions retain a preview asset for legacy consumers.
    if (studio && !designAssetId) {
      const artwork = await uploadPartnerDesign({ventureId:session.ventureId,ventureSlug:session.ventureSlug,uploadedById:session.appUser.id,name:`${name} — composition preview`,notes:"Composition preview reference",file:buffer,filename:"composition-preview.png",mimeType:"image/png",autoApprove:false});
      designAssetId = artwork.id;
    }
    if (session.role === "creator") {
      const { plan } = await getCreditBalance(session.appUser.id);
      if (plan.savedDesigns !== null) {
        const count = await countPartnerCompositions(session.ventureId);
        if (count >= plan.savedDesigns) throw new ValidationError(`The ${plan.name} plan saves up to ${plan.savedDesigns} designs. Upgrade on the Plans page to save unlimited designs — or delete an old one.`);
      }
    }
    // Saving a design never rewrites an existing product's production geometry; that is owned by
    // product setup (saveBlankSurfacesAction). It only initializes geometry for a blank that has none.
    if (studio && !applyTarget && !blank.printArea?.surfaces?.length && (canModerateListings(session) || session.role === "creator")) {
      const surfaces = studio.surfaces.map(({layers,...surface})=>surface);
      await setProductPrintArea({ventureId:session.ventureId,productId:blank.id,printArea:{...surfaces[0].area,...{surfaces}}});
    }
    const composition = reusableComposition ?? await uploadPartnerDesign({
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
        ? { blankProductId: applyTarget?.product.id ?? blankProductId, designAssetId, offsetX, offsetY, scale, rotation, canvasSize, text, studio }
        : null,
    });

    if (applyTarget && studio) {
      const target = applyTarget.product;
      await updateProduct({
        ventureId: session.ventureId, productId: target.id, actorUserId: session.appUser.id,
        slug: target.slug, name: target.name, description: target.description, priceCents: target.priceCents,
        category: target.category as import("@/lib/domains/catalog/publish").ProductCategory,
        fulfillmentType: target.fulfillmentType as "dropship" | "sweetoh", supplierSku: target.supplierSku,
        sourceAssetId: composition.id, shortDescription: target.shortDescription, seoTitle: target.seoTitle,
        seoDescription: target.seoDescription, internalNotes: target.internalNotes,
        suggestedTags: target.suggestedTags, suggestedCollections: target.suggestedCollections,
      });
      await setProductPrintArea({ ventureId: session.ventureId, productId: target.id, printArea: productPrintAreaFromStudio(studio) });
      await markProductDraftReviewed({ ventureId: session.ventureId, productId: target.id, actorUserId: session.appUser.id });
      revalidatePath(`/partner/review/${target.id}`);
      revalidatePath("/partner/products");
      redirect(`/partner/review/${target.id}?success=${encodeURIComponent("Studio artwork saved to this private product draft.")}`);
    }

    if (saveAsProduct) {
      const saved = await persistDraftProduct({ ventureId: session.ventureId, actorUserId: session.appUser.id,
        mode: "visual_intake", prompt: "Partner canvas composition — no AI call", rawResponse: { kind: "canvas_composition", blankProductId, designAssetId },
        sourceAssetId: composition.id, primaryAssetId: composition.id,
        output: { title: name, description: plainCatalogDescription(blank.description || ""), shortDescription: blank.shortDescription || "",
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

    revalidatePath(paths.library);
    revalidatePath(paths.canvas);
    revalidatePath(paths.home);
    if (session.role === "creator") redirect(`/studio/designs?saved=${composition.id}`);
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
    const session=await requireStudioWorkspace(); assertBuilderRole(session);
    const surfaces=z.array(surfaceSchema).min(1).max(12).refine(ss => new Set(ss.map(s => s.id)).size === ss.length, "Surface IDs must be unique.").parse(input);
    const blank=await getProductById({ventureId:session.ventureId,productId:z.string().uuid().parse(productId)});
    for(const s of surfaces) if(s.assetId || s.referenceAssetId) {
      if(s.assetId) {
        const surfaceAsset=await getAssetById({ventureId:session.ventureId,assetId:s.assetId});
        if(s.imageRole==="production_blank" && surfaceAsset.notes!==PRODUCTION_BLANK_ASSET_NOTES) throw new ValidationError("Only a verified background-removed blank can be used as a production surface.");
      }
      if(s.referenceAssetId) await getAssetById({ventureId:session.ventureId,assetId:s.referenceAssetId});
    }
    for(const s of surfaces) if(s.imageRole==="production_blank" && !s.assetId) throw new ValidationError("A production blank needs its saved background-removed image asset.");
    const photos=new Set(blank.catalogSource?.images ?? []);
    for(const s of surfaces) if(s.imageUrl && !photos.has(s.imageUrl)) throw new ValidationError("Choose a photo of this product.");
    await setProductPrintArea({ventureId:session.ventureId,productId,printArea:{...surfaces[0].area,...{surfaces}}});
    const paths=studioBase(session); revalidatePath(paths.canvas); revalidatePath(paths.catalog); if(session.role==="partner") revalidatePath("/partner/builder"); return {};
  } catch(error) {return {error:getActionErrorMessage(error)};}
}
