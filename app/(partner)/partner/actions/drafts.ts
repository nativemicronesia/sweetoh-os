"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { redirect } from "next/navigation";
import {
  parsePartnerProductFields,
  validatePartnerProductFields,
} from "@/lib/domains/catalog/product-form";
import {
  approvePartnerPendingListing,
  publishPartnerDraft,
  rejectPartnerPendingListing,
  submitPartnerDraft,
  unpublishPartnerProduct,
  updatePartnerDraftFields,
} from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

/**
 * Thin redirect/revalidate shells. Every role and ownership check lives in
 * `lib/domains/catalog/partner-listings.ts`, which the Studio chat tools call
 * too — so a chat tool can never do what the equivalent button could not.
 */

function reviewDetailPath(productId: string, query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix
    ? `/partner/review/${productId}?${suffix}`
    : `/partner/review/${productId}`;
}

function reviewPath(query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix ? `/partner/review?${suffix}` : "/partner/review";
}

function productsPath(query?: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix ? `/partner?${suffix}` : "/partner";
}

function revalidateListingSurfaces(productId: string): void {
  revalidatePath("/partner");
  revalidatePath("/partner/review");
  revalidatePath(`/partner/review/${productId}`);
  revalidatePath("/partner/products");
  revalidatePath("/products");
}

export async function publishPartnerDraftAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await publishPartnerDraft(session, productId);

    revalidateListingSurfaces(productId);

    redirect(
      productsPath({
        success: `"${row.name}" is live in your Sweet'Oh catalog.`,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      reviewDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}

export async function unpublishPartnerProductAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await unpublishPartnerProduct(session, productId);

    revalidateListingSurfaces(productId);

    redirect(
      productsPath({
        success: `"${row.name}" unpublished — it is a draft again.`,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(productsPath({ error: getActionErrorMessage(error) }));
  }
}

export async function submitPartnerDraftForReviewAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await submitPartnerDraft(session, productId);

    revalidateListingSurfaces(productId);

    redirect(
      reviewDetailPath(productId, {
        success:
          row.draftStatus === "pending_review"
            ? `"${row.name}" submitted for Sweet'Oh listing review.`
            : `"${row.name}" needs more work before review.`,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      reviewDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}

export async function approvePendingListingAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await approvePartnerPendingListing(session, productId);

    revalidateListingSurfaces(productId);

    redirect(
      reviewPath({
        success: `"${row.name}" approved — live on Sweet'Oh (brand: ${
          row.brandVentureSlug ?? "sweetoh"
        }).`,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(reviewPath({ error: getActionErrorMessage(error) }));
  }
}

export async function rejectPendingListingAction(
  productId: string,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await rejectPartnerPendingListing(session, productId);

    revalidateListingSurfaces(productId);

    redirect(reviewPath({ success: `"${row.name}" rejected.` }));
  } catch (error) {
    unstable_rethrow(error);
    redirect(reviewPath({ error: getActionErrorMessage(error) }));
  }
}

export async function updatePartnerDraftAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const fields = parsePartnerProductFields(formData);
    validatePartnerProductFields(fields);

    const row = await updatePartnerDraftFields(session, productId, fields);

    if (formData.get("intent") === "publish") {
      await publishPartnerDraft(session, productId);
      revalidateListingSurfaces(productId);
      redirect(productsPath({ success: `"${row.name}" is live in your Sweet’Oh shop.` }));
    }
    revalidateListingSurfaces(productId);

    redirect(
      reviewDetailPath(productId, {
        success: `Saved listing copy for "${row.name}".`,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      reviewDetailPath(productId, { error: getActionErrorMessage(error) }),
    );
  }
}
