"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parsePartnerProductFields,
  validatePartnerProductFields,
} from "@/lib/domains/catalog/product-form";
import {
  getProductById,
  publishProduct,
  rejectProductListing,
  submitProductDraftForReview,
  unpublishProduct,
  updateProduct,
} from "@/lib/domains/catalog/service";
import type { ProductDraftStatus } from "@/lib/domains/catalog/draft-status";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import type { SessionUser } from "@/lib/domains/identity/types";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";

const PARTNER_EDITABLE_STATUSES: ProductDraftStatus[] = [
  "draft",
  "needs_work",
  "pending_review",
];

function draftDetailPath(productId: string, query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix
    ? `/partner/drafts/${productId}?${suffix}`
    : `/partner/drafts/${productId}`;
}

function productsPath(query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix ? `/partner/products?${suffix}` : "/partner/products";
}

async function assertPartnerOwnsDraft(session: SessionUser, productId: string) {
  const owned = await getActorProductDraft({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
    productId,
  });

  if (!owned) {
    throw new ValidationError("You can only manage your own drafts.");
  }

  return owned;
}

async function assertPartnerOwnsEditableDraft(
  session: SessionUser,
  productId: string,
) {
  const owned = await assertPartnerOwnsDraft(session, productId);

  if (owned.product.active) {
    throw new ValidationError(
      "Published products cannot be edited here — unpublish first.",
    );
  }

  if (
    !PARTNER_EDITABLE_STATUSES.includes(
      owned.product.draftStatus as ProductDraftStatus,
    )
  ) {
    throw new ValidationError(
      "This draft cannot be edited in its current status.",
    );
  }

  return owned;
}

export async function publishPartnerDraftAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    if (session.role === "creator") {
      throw new ValidationError(
        "Creators submit for review — the Sweet'Oh partner approves listings.",
      );
    }
    await assertPartnerOwnsDraft(session, productId);

    const row = await publishProduct({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
    });

    revalidatePath("/partner/drafts");
    revalidatePath(`/partner/drafts/${productId}`);
    revalidatePath("/partner/products");
    revalidatePath("/products");

    redirect(
      productsPath({
        success: `"${row.name}" is live in your Sweet'Oh catalog.`,
      }),
    );
  } catch (error) {
    redirect(
      draftDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}

export async function unpublishPartnerProductAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    await getProductById({
      ventureId: session.ventureId,
      productId,
    });

    const row = await unpublishProduct({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
    });

    revalidatePath("/partner/drafts");
    revalidatePath(`/partner/drafts/${productId}`);
    revalidatePath("/partner/products");
    revalidatePath("/products");

    redirect(
      productsPath({
        success: `"${row.name}" unpublished — it is a draft again.`,
      }),
    );
  } catch (error) {
    redirect(productsPath({ error: getActionErrorMessage(error) }));
  }
}

export async function submitPartnerDraftForReviewAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    await assertPartnerOwnsEditableDraft(session, productId);

    const brandVentureSlug =
      session.role === "creator"
        ? (process.env.CREATOR_DEFAULT_BRAND_SLUG?.trim() || "island-sprouts")
        : "sweetoh";

    const row = await submitProductDraftForReview({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
      brandVentureSlug,
    });

    revalidatePath("/partner/drafts");
    revalidatePath(`/partner/drafts/${productId}`);
    revalidatePath("/partner/studio/print");

    redirect(
      draftDetailPath(productId, {
        success:
          row.draftStatus === "pending_review"
            ? `"${row.name}" submitted for Sweet'Oh listing review.`
            : `"${row.name}" needs more work before review.`,
      }),
    );
  } catch (error) {
    redirect(
      draftDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}

export async function approvePendingListingAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    if (session.role === "creator") {
      throw new ValidationError("Only the Sweet'Oh partner can approve listings.");
    }

    const row = await publishProduct({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
    });

    revalidatePath("/partner/studio/print");
    revalidatePath("/partner/products");
    revalidatePath("/partner/drafts");
    revalidatePath("/products");

    redirect(
      `/partner/studio/print?success=${encodeURIComponent(
        `"${row.name}" approved — live on Sweet'Oh (brand: ${row.brandVentureSlug ?? "sweetoh"}).`,
      )}`,
    );
  } catch (error) {
    redirect(
      `/partner/studio/print?error=${encodeURIComponent(getActionErrorMessage(error))}`,
    );
  }
}

export async function rejectPendingListingAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    if (session.role === "creator") {
      throw new ValidationError("Only the Sweet'Oh partner can reject listings.");
    }

    const row = await rejectProductListing({
      ventureId: session.ventureId,
      productId,
      actorUserId: session.appUser.id,
    });

    revalidatePath("/partner/studio/print");
    revalidatePath("/partner/drafts");

    redirect(
      `/partner/studio/print?success=${encodeURIComponent(
        `"${row.name}" rejected.`,
      )}`,
    );
  } catch (error) {
    redirect(
      `/partner/studio/print?error=${encodeURIComponent(getActionErrorMessage(error))}`,
    );
  }
}

export async function updatePartnerDraftAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
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
    revalidatePath("/partner/products");

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
