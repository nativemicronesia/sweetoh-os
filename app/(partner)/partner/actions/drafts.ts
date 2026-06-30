"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parsePartnerProductFields,
  validatePartnerProductFields,
} from "@/lib/domains/catalog/product-form";
import {
  submitProductDraftForReview,
  updateProduct,
} from "@/lib/domains/catalog/service";
import type { ProductDraftStatus } from "@/lib/domains/catalog/draft-status";
import { requireRole } from "@/lib/domains/identity/service";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";

const PARTNER_EDITABLE_STATUSES: ProductDraftStatus[] = ["draft", "needs_work"];

function draftsPath(query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix ? `/partner/drafts?${suffix}` : "/partner/drafts";
}

function draftDetailPath(productId: string, query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix
    ? `/partner/drafts/${productId}?${suffix}`
    : `/partner/drafts/${productId}`;
}

async function assertPartnerOwnsEditableDraft(
  session: Awaited<ReturnType<typeof requireRole>>,
  productId: string,
) {
  const owned = await getActorProductDraft({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
    productId,
  });

  if (!owned) {
    throw new ValidationError("You can only edit your own drafts.");
  }

  if (owned.product.active) {
    throw new ValidationError("Published products cannot be edited by partners.");
  }

  if (
    !PARTNER_EDITABLE_STATUSES.includes(
      owned.product.draftStatus as ProductDraftStatus,
    )
  ) {
    throw new ValidationError(
      "This draft cannot be edited while it is in owner review or archived.",
    );
  }

  return owned;
}

export async function submitPartnerDraftForReviewAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requireRole("partner");
    await assertPartnerOwnsEditableDraft(session, productId);

    const row = await submitProductDraftForReview({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
    });

    revalidatePath("/partner/drafts");
    revalidatePath(`/partner/drafts/${productId}`);
    revalidatePath("/owner/review");

    redirect(
      draftDetailPath(productId, {
        success: `"${row.name}" submitted for owner review.`,
      }),
    );
  } catch (error) {
    redirect(
      draftDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}

export async function updatePartnerDraftAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requireRole("partner");
    const owned = await assertPartnerOwnsEditableDraft(session, productId);
    const fields = parsePartnerProductFields(formData);
    validatePartnerProductFields(fields);

    const row = await updateProduct({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
      slug: owned.product.slug,
      name: fields.name,
      description: fields.description,
      priceCents: fields.priceCents,
      category: fields.category,
      fulfillmentType: owned.product.fulfillmentType as "dropship" | "sweetoh",
      supplierSku: owned.product.supplierSku,
      sourceAssetId: owned.product.sourceAssetId,
      shortDescription: fields.shortDescription,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      internalNotes: owned.product.internalNotes,
      suggestedTags: fields.suggestedTags,
      suggestedCollections: fields.suggestedCollections,
    });

    revalidatePath("/partner/drafts");
    revalidatePath(`/partner/drafts/${productId}`);

    redirect(
      draftDetailPath(productId, {
        success: `Saved listing copy for "${row.name}".`,
      }),
    );
  } catch (error) {
    redirect(
      draftDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}
