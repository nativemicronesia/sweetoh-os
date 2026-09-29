"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { assertPartnerOwnsEditableDraft } from "@/lib/domains/catalog/partner-listings";
import { addProductMediaUpload, getProductMedia, removeProductMedia } from "@/lib/domains/catalog/service";
import { LISTING_MAX_PHOTOS, normalizePhoto } from "@/lib/domains/catalog/own-listing";
import { validateImageUpload } from "@/lib/domains/assets/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";

const productIdSchema = z.string().uuid();

export async function addPartnerProductPhotoAction(form: FormData): Promise<void> {
  const session = await requirePartnerWorkspace();
  const productId = productIdSchema.parse(form.get("productId"));
  try {
    const owned = await assertPartnerOwnsEditableDraft(session, productId);
    if (owned.product.fulfillmentType !== "sweetoh") throw new ValidationError("This product’s photos cannot be changed here.");
    const current = await getProductMedia(productId);
    if (current.length >= LISTING_MAX_PHOTOS) throw new ValidationError(`A product can have up to ${LISTING_MAX_PHOTOS} photos.`);
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) throw new ValidationError("Choose a product photo first.");
    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
    const normalized = await normalizePhoto(Buffer.from(await file.arrayBuffer()));
    await addProductMediaUpload({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      productId,
      actorUserId: session.appUser.id,
      file: normalized.bytes,
      filename: `photo-${crypto.randomUUID()}.jpg`,
      mimeType: normalized.mimeType,
    });
    revalidatePath(`/partner/review/${productId}`);
    revalidatePath("/partner/products");
    revalidatePath("/partner");
    redirect(`/partner/review/${productId}?success=${encodeURIComponent("Photo added to this draft.")}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/partner/review/${productId}?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }
}

export async function removePartnerProductPhotoAction(form: FormData): Promise<void> {
  const session = await requirePartnerWorkspace();
  const productId = productIdSchema.parse(form.get("productId"));
  try {
    await assertPartnerOwnsEditableDraft(session, productId);
    const mediaId = productIdSchema.parse(form.get("mediaId"));
    await removeProductMedia({ ventureId: session.ventureId, productId, mediaId, actorUserId: session.appUser.id });
    revalidatePath(`/partner/review/${productId}`);
    revalidatePath("/partner/products");
    revalidatePath("/partner");
    redirect(`/partner/review/${productId}?success=${encodeURIComponent("Photo removed from this draft.")}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(`/partner/review/${productId}?error=${encodeURIComponent(getActionErrorMessage(error))}`);
  }
}
