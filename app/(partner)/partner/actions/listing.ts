"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/domains/catalog/categories";
import { listOwnProduct, LISTING_MAX_PHOTOS, normalizePhoto, prepareListingFromPhoto, type ListingSuggestion } from "@/lib/domains/catalog/own-listing";
import type { SessionUser } from "@/lib/domains/identity/types";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { getPrimaryProductImageBuffer, getProductById } from "@/lib/domains/catalog/service";
import { createOwnBlank, turnPhotoIntoBlank } from "@/lib/capabilities";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";

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
    const raw = getActionErrorMessage(error);
    // Internal publishing rules shouldn't reach her in engineering language.
    const friendly = /fulfillment path/i.test(raw)
      ? "Couldn't publish that one. Save it as a draft and tell Dave — the photo is safe."
      : /media item/i.test(raw)
        ? "Add at least one photo before publishing."
        : raw;
    return { ok: false, error: friendly };
  }
}

export type PreparedListing =
  | { ok: true; suggestion: ListingSuggestion | null; productShot: string | null; notes: string[] }
  | { ok: false; error: string };

/** Her main photo → Skink's draft listing + a clean shop photo (as a data URL she can accept or drop). */
export async function prepareListingAction(form: FormData): Promise<PreparedListing> {
  const session = await requirePartnerWorkspace();
  try {
    const photo = form.get("photo");
    if (!(photo instanceof File) || !photo.size) return { ok: false, error: "Add a photo first." };
    const result = await prepareListingFromPhoto(session, { photo: Buffer.from(await photo.arrayBuffer()) });
    return {
      ok: true,
      suggestion: result.suggestion,
      productShot: result.productShot ? `data:image/jpeg;base64,${result.productShot.toString("base64")}` : null,
      notes: result.notes,
    };
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

type BlankResult = { ok: true; blankId: string; reused?: boolean } | { ok: false; error: string };

/** Photo → cleaned-up blank (her printed design removed) with proposed print areas. */
async function blankFromPhoto(session: SessionUser, name: string, photo: Buffer): Promise<BlankResult> {
  // She may tap this twice, or come back later — reuse the blank she already has.
  const existing = (await listBuilderBlanks(session)).find((b) => b.name === name);
  if (existing) return { ok: true, blankId: existing.id, reused: true };

  const { bytes, mimeType } = await normalizePhoto(photo);
  const proposal = await turnPhotoIntoBlank(session, {
    photos: [{ file: bytes, mimeType, label: "Front" }],
  });
  const blankId = await createOwnBlank(session, {
    name,
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
  revalidatePath("/partner/products");
  return { ok: true, blankId };
}

/** Right after publishing: her ORIGINAL photo (not the AI shop shot) becomes the design blank. */
export async function makeBlankFromPhotoAction(form: FormData): Promise<BlankResult> {
  const session = await requirePartnerWorkspace();
  try {
    const photo = form.get("photo");
    if (!(photo instanceof File) || !photo.size) return { ok: false, error: "This product needs a photo first." };
    const name = z.string().trim().min(2).max(180).parse(form.get("name"));
    return await blankFromPhoto(session, name, Buffer.from(await photo.arrayBuffer()));
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

/**
 * Skink turns a product she's listed into a blank she can design on: its photo
 * is cleaned up and its printable areas proposed, then it appears in the Studio.
 */
export async function makeBlankFromProductAction(productId: string): Promise<BlankResult> {
  const session = await requirePartnerWorkspace();
  try {
    const id = z.string().uuid().parse(productId);
    const source = await getProductById({ ventureId: session.ventureId, productId: id });
    const photo = await getPrimaryProductImageBuffer(id);
    if (!photo) return { ok: false, error: "This product needs a photo first." };
    return await blankFromPhoto(session, source.name, photo);
  } catch (error) {
    return { ok: false, error: getActionErrorMessage(error) };
  }
}

export async function openBlankInStudioAction(blankId: string): Promise<void> {
  await requirePartnerWorkspace();
  redirect(`/partner/canvas?blank=${z.string().uuid().parse(blankId)}`);
}
