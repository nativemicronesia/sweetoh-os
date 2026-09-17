/**
 * Partner-workspace listing operations — the single place role and ownership
 * are enforced for draft/listing writes.
 *
 * Both callers go through here: the Server Actions behind the Review screen's
 * buttons (`app/(partner)/partner/actions/drafts.ts`) and the Studio chat's
 * tool wrappers (`lib/domains/studio-chat/tools.ts`). Neither re-implements the
 * checks, so the chat can never do something the equivalent role's button
 * could not. The Server Actions keep the redirect/revalidate shell; the plain
 * results below are what both surfaces share.
 */

import { ValidationError } from "@/lib/shared/errors";
import type { SessionUser } from "@/lib/domains/identity/types";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import type { ProductDraftStatus } from "./draft-status";
import type { ParsedPartnerProductFormFields } from "./product-form";
import {
  publishProduct,
  rejectProductListing,
  submitProductDraftForReview,
  unpublishProduct,
  updateProduct,
  getProductById,
} from "./service";

const PARTNER_EDITABLE_STATUSES: ProductDraftStatus[] = [
  "draft",
  "needs_work",
  "pending_review",
];

/** Partner/owner may publish, approve, and reject. Creators submit only. */
export function canModerateListings(session: SessionUser): boolean {
  return session.role === "partner" || session.role === "owner";
}

export async function assertPartnerOwnsDraft(
  session: SessionUser,
  productId: string,
) {
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

export async function assertPartnerOwnsEditableDraft(
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

/** Publish one of your own drafts. Creators cannot self-publish. */
export async function publishPartnerDraft(
  session: SessionUser,
  productId: string,
) {
  if (!canModerateListings(session)) {
    throw new ValidationError(
      "Creators submit for review — the Sweet'Oh partner approves listings.",
    );
  }

  await assertPartnerOwnsDraft(session, productId);

  return publishProduct({
    ventureId: session.ventureId,
    productId,
    actorUserId: session.appUser.id,
  });
}

/** Take a live product back to draft. Same gate the Products button uses. */
export async function unpublishPartnerProduct(
  session: SessionUser,
  productId: string,
) {
  if (!canModerateListings(session)) throw new ValidationError("Only the shop partner or owner can unpublish products.");
  await getProductById({ ventureId: session.ventureId, productId });

  return unpublishProduct({
    ventureId: session.ventureId,
    productId,
    actorUserId: session.appUser.id,
  });
}

/** Send one of your own drafts into the Sweet'Oh review queue. */
export async function submitPartnerDraft(
  session: SessionUser,
  productId: string,
) {
  await assertPartnerOwnsEditableDraft(session, productId);

  const brandVentureSlug =
    session.role === "creator"
      ? process.env.CREATOR_DEFAULT_BRAND_SLUG?.trim() || "island-sprouts"
      : "sweetoh";

  return submitProductDraftForReview({
    ventureId: session.ventureId,
    productId,
    actorUserId: session.appUser.id,
    brandVentureSlug,
  });
}

/** Approve a submitted listing — partner/owner only. */
export async function approvePartnerPendingListing(
  session: SessionUser,
  productId: string,
) {
  if (!canModerateListings(session)) {
    throw new ValidationError("Only the Sweet'Oh partner can approve listings.");
  }

  return publishProduct({
    ventureId: session.ventureId,
    productId,
    actorUserId: session.appUser.id,
  });
}

/** Reject a submitted listing — partner/owner only. */
export async function rejectPartnerPendingListing(
  session: SessionUser,
  productId: string,
) {
  if (!canModerateListings(session)) {
    throw new ValidationError("Only the Sweet'Oh partner can reject listings.");
  }

  return rejectProductListing({
    ventureId: session.ventureId,
    productId,
    actorUserId: session.appUser.id,
  });
}

/** Save listing copy on one of your own editable drafts. */
export async function updatePartnerDraftFields(
  session: SessionUser,
  productId: string,
  fields: ParsedPartnerProductFormFields,
) {
  const owned = await assertPartnerOwnsEditableDraft(session, productId);

  return updateProduct({
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
}
