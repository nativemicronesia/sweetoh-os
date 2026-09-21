"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/domains/catalog/categories";
import { listOwnProduct, LISTING_MAX_PHOTOS } from "@/lib/domains/catalog/own-listing";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { getPrimaryProductImageBuffer, getProductById } from "@/lib/domains/catalog/service";
import { createOwnBlank, turnPhotoIntoBlank } from "@/lib/capabilities";

export type ListingResult = { ok: true; productId: string; published: boolean } | { ok: false; error: string };

/** Photograph something she already sells → a real listing, at her price. */
export async function listOwnProductAction(form: FormData): Promise<ListingResult> {
  const session = await requirePartnerWorkspace();
  try {
    const dollars = String(form.get("priceDollars") ?? "").trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(dollars)) return { ok: false, error: "Enter a price like 24 or 24.50." };
    const photos = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, LISTING_MAX_PHOTOS);
    if (!photos.length) return { ok: false, error: "Add at least one photo." };

    const created = await listOwnProduct(session, {
      name: String(form.get("name") ?? ""),
      priceCents: Math.round(Number(dollars) * 100),
      description: String(form.get("description") ?? "") || null,
      category: z.enum(PRODUCT_CATEGORIES as unknown as [ProductCategory, ...ProductCategory[]]).parse(form.get("category")),
      photos: await Promise.all(photos.map(async (f) => ({ file: Buffer.from(await f.arrayBuffer()), filename: f.name }))),
      publish: form.get("publish") === "true",
    });

    revalidatePath("/partner/products");
    revalidatePath("/partner");
    revalidatePath("/collections");
    return { ok: true, productId: created.id, published: form.get("publish") === "true" };
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

/**
 * Skink turns a product she's listed into a blank she can design on: its photo
 * is cleaned up and its printable areas proposed, then it appears in the Studio.
 */
export async function makeBlankFromProductAction(productId: string): Promise<{ ok: true; blankId: string } | { ok: false; error: string }> {
  const session = await requirePartnerWorkspace();
  try {
    const id = z.string().uuid().parse(productId);
    const source = await getProductById({ ventureId: session.ventureId, productId: id });
    const photo = await getPrimaryProductImageBuffer(id);
    if (!photo) return { ok: false, error: "This product needs a photo first." };

    const proposal = await turnPhotoIntoBlank(session, {
      photos: [{ file: photo, mimeType: "image/jpeg", label: "Front" }],
    });
    const blankId = await createOwnBlank(session, {
      name: source.name,
      productType: proposal.productType,
      colors: [proposal.color],
      sizes: proposal.sizes,
      views: proposal.views.map((v) => ({
        label: v.label,
        position: v.position,
        // Prefer the cleaned-up cutout; fall back to her original photo.
        assetId: v.cutoutAssetId ?? v.originalAssetId,
        originalAssetId: v.originalAssetId,
        area: v.area,
        printWidthIn: v.printWidthIn,
        printHeightIn: v.printHeightIn,
      })),
    });
    revalidatePath("/partner/catalog");
    return { ok: true, blankId };
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

export async function openBlankInStudioAction(blankId: string): Promise<void> {
  await requirePartnerWorkspace();
  redirect(`/partner/canvas?blank=${z.string().uuid().parse(blankId)}`);
}
