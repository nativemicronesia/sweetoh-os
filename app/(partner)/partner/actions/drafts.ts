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
  deletePartnerProduct,
  updatePartnerDraftFields,
} from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";
import { getProductById, setProductVariantSetup } from "@/lib/domains/catalog/service";
import { sortSizes } from "@/lib/domains/catalog/variants";

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
  return suffix ? `/partner/products?${suffix}` : "/partner/products";
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

export async function deletePartnerProductAction(productId: string): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const row = await deletePartnerProduct(session, productId);
    revalidateListingSurfaces(productId);
    redirect(productsPath({ success: `"${row.name}" deleted.` }));
  } catch (error) {
    unstable_rethrow(error);
    redirect(reviewDetailPath(productId, { error: getActionErrorMessage(error) }));
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
    if (formData.get("variantsPresent") === "1") await saveVariantFields(session, productId, formData);

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

/** Colors, sizes and upcharges posted from the Details & pricing form. */
async function saveVariantFields(
  session: Awaited<ReturnType<typeof requirePartnerWorkspace>>,
  productId: string,
  formData: FormData,
) {
  const product = await getProductById({ ventureId: session.ventureId, productId });
  const pool = {
    colors: product.catalogSource?.availableColors.length
      ? product.catalogSource.availableColors
      : (product.variantOptions?.colors ?? []),
    sizes: product.catalogSource?.availableSizes.length
      ? product.catalogSource.availableSizes
      : (product.variantOptions?.sizes ?? []),
  };
  const colorNames = formData.getAll("variantColor").map(String);
  const colors = pool.colors.filter((c) => colorNames.includes(c.name));
  const sizes = sortSizes(formData.getAll("variantSize").map(String).filter((s) => pool.sizes.includes(s)));
  if (pool.colors.length && !colors.length) throw new ValidationError("Offer at least one color.");
  if (pool.sizes.length && !sizes.length) throw new ValidationError("Offer at least one size.");
  const sizeUpchargeCents = Object.fromEntries(
    sizes.map((s) => {
      const dollars = Number(formData.get(`upcharge:${s}`) ?? 0);
      if (!Number.isFinite(dollars) || dollars < 0 || dollars > 1000)
        throw new ValidationError(`Enter a valid extra charge for ${s}.`);
      return [s, Math.round(dollars * 100)];
    }),
  );
  await setProductVariantSetup({
    ventureId: session.ventureId,
    productId,
    variantOptions: { colors, sizes, sizeUpchargeCents },
  });
}
