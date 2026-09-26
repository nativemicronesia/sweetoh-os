import { SubmitButton } from "../../components/submit-button";
import { DeleteProductButton } from "../../components/delete-product-button";
import { VariantPricing } from "../../components/variant-pricing";
import Link from "next/link";
import { CreationSteps } from "../../components/creation-steps";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { notFound } from "next/navigation";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  evaluateProductPublishReadiness,
  getPrimaryProductImageUrl,
  getProductMedia,
  getProductById,
} from "@/lib/domains/catalog/service";
import { getAssetById, getAssetSignedUrl } from "@/lib/domains/assets/service";
import { isApprovedAssetStatus } from "@/lib/domains/assets/types";
import { productMediaPublicUrl } from "@/lib/storage/client";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import type { ProductCategory } from "@/lib/domains/catalog/publish";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { evaluateAiProductDraftCompleteness } from "@/lib/domains/intelligence/draft-completeness";
import {
  getActorProductDraft,
  getAiCreationSessionForProduct,
} from "@/lib/domains/intelligence/service";
import { formatPrice } from "@/lib/shared/format";
import { NotFoundError } from "@/lib/shared/errors";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { inferSurfaceImageRole, PRODUCTION_BLANK_ASSET_NOTES, studioLayoutSchema } from "@/lib/domains/catalog/studio-layout";
import {
  approvePendingListingAction,
  rejectPendingListingAction,
  publishPartnerDraftAction,
  submitPartnerDraftForReviewAction,
  updatePartnerDraftAction,
  unpublishPartnerProductAction,
  deletePartnerProductAction,
  markPartnerDraftReadyAction,
} from "../../actions/drafts";

/**
 * Review detail. Closes the audit-flagged gap: the actual product photo is
 * rendered beside the AI-written copy, so the operator can see what she is
 * approving instead of judging text alone.
 */

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "apparel", label: "Apparel" },
  { value: "kids", label: "Kids" },
  { value: "home", label: "Home" },
  { value: "drinkware", label: "Drinkware" },
  { value: "accessories", label: "Accessories" },
  { value: "custom", label: "Custom" },
];

type PartnerReviewDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerReviewDetailPage({
  params,
  searchParams,
}: PartnerReviewDetailPageProps) {
  const session = await requirePartnerWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const canModerate = canModerateListings(session);

  const owned = await getActorProductDraft({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
    productId: id,
  });

  // Partner/owner also open submissions they did not author, to approve them.
  let product = owned?.product ?? null;
  if (!product && canModerate) {
    try {
      product = await getProductById({
        ventureId: session.ventureId,
        productId: id,
      });
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
    }
  }

  if (!product) {
    notFound();
  }

  const isOwn = Boolean(owned);
  const canEdit =
    isOwn &&
    !product.active &&
    (product.draftStatus === "draft" ||
      product.draftStatus === "needs_work" ||
      product.draftStatus === "pending_review" ||
      product.draftStatus === "approved");
  const [aiSession, readiness, imageUrl] = await Promise.all([
    getAiCreationSessionForProduct({
      ventureId: session.ventureId,
      productId: id,
    }),
    evaluateProductPublishReadiness({
      ventureId: session.ventureId,
      productId: id,
    }),
    getPrimaryProductImageUrl(id),
  ]);
  const mediaRows = await getProductMedia(id);
  const [gallery, productionAsset] = await Promise.all([
    Promise.all(mediaRows.map(async (media) => ({
      id: media.id,
      color: media.color,
      url: media.objectKey
        ? productMediaPublicUrl(media.objectKey)
        : media.assetId
          ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId: media.assetId }).catch(() => null)
          : null,
    }))),
    product.sourceAssetId
      ? getAssetById({ ventureId: session.ventureId, assetId: product.sourceAssetId })
          .then(async (asset) => ({ asset, url: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: asset.id }).catch(() => null) }))
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const productionSurfaces = await Promise.all((product.printArea?.surfaces ?? []).map(async (surface) => {
    const asset = surface.assetId ? await getAssetById({ ventureId: session.ventureId, assetId: surface.assetId }).catch(() => null) : null;
    const isVerifiedBlank = inferSurfaceImageRole({ ...surface, assetNotes: asset?.notes }) === "production_blank"
      && asset?.assetType === "product_asset" && asset.notes === PRODUCTION_BLANK_ASSET_NOTES
      && isApprovedAssetStatus(asset.status as import("@/lib/domains/assets/types").AssetStatus);
    return {
      ...surface,
      isVerifiedBlank,
      previewUrl: isVerifiedBlank && surface.assetId ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId: surface.assetId }).catch(() => null) : null,
    };
  }));
  const associatedStudio = productionAsset?.asset.compositionLayout?.studio
    ? studioLayoutSchema.safeParse(productionAsset.asset.compositionLayout.studio)
    : null;
  const designAssets = canEdit
    ? (await listPartnerLibraryDesigns(session.ventureId)).filter((item) => item.status === "approved" || item.status === "licensed")
    : [];

  const draftCompleteness = aiSession && !builderRecord(aiSession.session.rawResponse) && (aiSession.session.rawResponse as { kind?: string })?.kind !== "canvas_composition"
    ? evaluateAiProductDraftCompleteness({
        product,
        session: aiSession.session,
        mediaCount: aiSession.media.length,
      })
    : null;

  const isPending = !product.active && product.draftStatus === "pending_review";

  async function saveListing(formData: FormData) {
    "use server";
    await updatePartnerDraftAction(id, formData);
  }

  async function unpublishNow() {
    "use server";
    await unpublishPartnerProductAction(id);
  }

  async function deleteNow() {
    "use server";
    await deletePartnerProductAction(id);
  }

  async function submitForReview() {
    "use server";
    await submitPartnerDraftForReviewAction(id);
  }

  async function approveListing() {
    "use server";
    await approvePendingListingAction(id);
  }

  async function rejectListing() {
    "use server";
    await rejectPendingListingAction(id);
  }

  async function markReady() {
    "use server";
    await markPartnerDraftReadyAction(id);
  }

  async function publishNow() {
    "use server";
    await publishPartnerDraftAction(id);
  }

  return (
    <div className="studio-review space-y-6"><CreationSteps current={product.active ? 5 : 4} />
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />
      {builderRecord(aiSession?.session.rawResponse) && <Link href={`/partner/builder/${id}`} className="so-link">Review product research & source details →</Link>}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link href="/partner/products" className="so-link">← My products</Link>
        {productionAsset?.asset.compositionLayout && product.sourceAssetId && <Link className="so-link" href={`/partner/canvas?composition=${product.sourceAssetId}&targetDraft=${product.id}`}>Edit product artwork</Link>}
      </div>

      {/* Photo beside the AI-written copy — the whole point of this screen. */}
      <section
        className="grid gap-5 rounded-xl border p-6 md:grid-cols-[minmax(0,14rem)_1fr]"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div
          className="aspect-square w-full overflow-hidden rounded-xl border"
          style={{
            borderColor: "var(--so-border)",
            background: "var(--so-black)",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center px-4 text-center text-xs"
              style={{ color: "var(--so-cream-dim)" }}
            >
              No photo on this listing yet — publishing needs one.
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: "var(--so-cream)" }}
            >
              {product.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <DraftStatusBadge
                draftStatus={product.draftStatus}
                active={product.active}
              />
              <span style={{ color: "var(--so-cream)" }}>
                {formatPrice(product.priceCents)}
              </span>
              <span
                className="font-mono text-xs"
                style={{ color: "var(--so-cream-dim)" }}
              >
                {product.slug}
              </span>
            </p>
          </div>

          {product.shortDescription ? (
            <p className="text-sm" style={{ color: "var(--so-cream)" }}>
              {product.shortDescription}
            </p>
          ) : null}

          {product.description ? (
            <p
              className="whitespace-pre-wrap text-sm"
              style={{ color: "var(--so-cream-dim)" }}
            >
              {product.description}
            </p>
          ) : null}

          {product.suggestedTags && product.suggestedTags.length > 0 ? (
            <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
              {product.suggestedTags.join(" · ")}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {canModerate && isPending && !isOwn ? (
              <>
                <form action={approveListing}>
                  <button
                    type="submit"
                    className="rounded-full px-4 py-2 text-sm font-medium"
                    style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
                  >
                    Approve &amp; publish
                  </button>
                </form>
                <form action={rejectListing}>
                  <button
                    type="submit"
                    className="rounded-full border px-4 py-2 text-sm"
                    style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
                  >
                    Reject
                  </button>
                </form>
              </>
            ) : null}

            {isOwn && !product.active && !canModerate ? (
              <form action={submitForReview}>
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
                >
                  Submit for review
                </button>
              </form>
            ) : null}

            {product.active ? (
              <Link
                href={`/products/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: "var(--so-border)", color: "var(--so-cream)" }}
              >
                Inspect exact live listing ↗
              </Link>
            ) : null}
            {product.active && isOwn && canModerate && <form action={unpublishNow}><SubmitButton pendingLabel="Unpublishing…">Unpublish and return to private draft</SubmitButton></form>}
            {canModerate && <DeleteProductButton action={deleteNow} />}
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border p-6 lg:grid-cols-2" style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}>
        <div className="space-y-3">
          <h2 className="font-medium" style={{ color: "var(--so-cream)" }}>Storefront preview</h2>
          <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>{product.active ? "This product is live. Open the customer listing above to inspect the exact storefront experience." : "This is the saved customer-facing copy and photo set. Product remains private until published."}</p>
          <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>Category: {product.category}</p>
          <div className="flex flex-wrap gap-2">
            {gallery.map((photo, index) => photo.url ? <figure key={photo.id} className="w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`${product.name}${photo.color ? ` in ${photo.color}` : ` photo ${index + 1}`}`} className="aspect-square w-full rounded-lg object-cover" />
              {photo.color && <figcaption className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>{photo.color}</figcaption>}
            </figure> : null)}
            {gallery.length === 0 && <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>No product photos saved yet.</p>}
          </div>
          {product.variantOptions && <div className="space-y-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            <p>Colors: {product.variantOptions.colors.length ? product.variantOptions.colors.map((item) => item.name).join(", ") : "No color variants"}</p>
            <p>Sizes: {product.variantOptions.sizes.length ? product.variantOptions.sizes.map((size) => `${size}${product.variantOptions?.sizeUpchargeCents[size] ? ` (+${formatPrice(product.variantOptions.sizeUpchargeCents[size])})` : ""}`).join(", ") : "No size variants"}</p>
          </div>}
          {!product.variantOptions && product.catalogSource && <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>No color or size variants are currently configured for sale.</p>}
          {product.suggestedCollections?.length ? <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>Collections: {product.suggestedCollections.join(", ")}</p> : null}
        </div>
        <div className="space-y-3">
          <h2 className="font-medium" style={{ color: "var(--so-cream)" }}>Production setup</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt style={{ color: "var(--so-cream-dim)" }}>Fulfillment</dt><dd style={{ color: "var(--so-cream)" }}>{product.fulfillmentType}</dd></div>
            <div><dt style={{ color: "var(--so-cream-dim)" }}>Supplier SKU</dt><dd style={{ color: "var(--so-cream)" }}>{product.supplierSku || "Not set"}</dd></div>
            {product.catalogSource && <div className="sm:col-span-2"><dt style={{ color: "var(--so-cream-dim)" }}>Catalog source</dt><dd style={{ color: "var(--so-cream)" }}>{[product.catalogSource.provider, product.catalogSource.brand, product.catalogSource.model].filter(Boolean).join(" · ")}</dd></div>}
          </dl>
          <div>
            <h3 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>{productionAsset?.asset.compositionLayout?.studio ? "Associated Studio design" : "Linked source / artwork"}</h3>
            {productionAsset ? <div className="mt-2 flex items-center gap-3 text-sm">
              {productionAsset.url && <div className="h-14 w-14 overflow-hidden rounded border" style={{ borderColor: "var(--so-border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productionAsset.url} alt="Linked production asset" className="h-full w-full object-contain" />
              </div>}
              <div style={{ color: "var(--so-cream-dim)" }}><p>{productionAsset.asset.name}</p><p>{productionAsset.asset.assetType} · {productionAsset.asset.status}{isApprovedAssetStatus(productionAsset.asset.status as import("@/lib/domains/assets/types").AssetStatus) ? " · approved for production" : " · approval required"}</p>{associatedStudio?.success && <p>Editable Studio composition · {associatedStudio.data.surfaces.reduce((count, surface) => count + surface.layers.length, 0)} artwork layers</p>}</div>
            </div> : <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>No linked production asset.</p>}
          </div>
          <div>
            <h3 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>Print areas</h3>
            {productionSurfaces.length ? <ul className="mt-2 space-y-3 text-sm" style={{ color: "var(--so-cream-dim)" }}>{productionSurfaces.map((surface) => <li key={surface.id} className="flex items-start gap-3">{surface.previewUrl && <img src={surface.previewUrl} alt={`${surface.name} verified production blank`} className="h-14 w-14 rounded border object-contain" style={{ borderColor: "var(--so-border)" }} />}<span><strong style={{ color: surface.isVerifiedBlank ? "var(--so-cream)" : "#dc2626" }}>{surface.name}{surface.position ? ` (${surface.position})` : ""} · {surface.isVerifiedBlank ? "verified production blank" : "production blank invalid"}</strong><br/>Artwork bounds {Math.round(surface.area.x * 100)}%, {Math.round(surface.area.y * 100)}%, {Math.round(surface.area.width * 100)}% × {Math.round(surface.area.height * 100)}%{surface.printRegions?.map((region) => ` · ${region.name} (${region.shape}${region.dimensions ? `, ${region.dimensions.width}×${region.dimensions.height}${region.dimensions.unit}` : ""})`).join("")}</span></li>)}</ul> : <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>No print-area geometry is saved on this product.</p>}
          </div>
        </div>
      </section>

      {canEdit ? (
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
            Listing details & price
          </h2>
          <form action={saveListing} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Name
              </span>
              <input
                name="name"
                required
                defaultValue={product.name}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Description
              </span>
              <textarea
                name="description"
                rows={4}
                defaultValue={product.description ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>


            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Selling price (USD)
              </span>
              <input
                name="priceDollars"
                type="number"
                min={0}
                step="0.01"
                defaultValue={(product.priceCents / 100).toFixed(2)}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>Production artwork</span>
              <select name="sourceAssetId" defaultValue={product.sourceAssetId ?? ""} className="w-full rounded-lg border px-3 py-2" style={{ borderColor: "var(--so-border)", background: "var(--so-black)", color: "var(--so-cream)" }}>
                <option value="">No linked artwork</option>
                {product.sourceAssetId && !designAssets.some((item) => item.id === product.sourceAssetId) && <option value={product.sourceAssetId}>Keep current product source</option>}
                {designAssets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <span className="mt-1 block text-xs" style={{ color: "var(--so-cream-dim)" }}>Only approved artwork can be linked for production. Uploads and designs remain in My files.</span>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Category
              </span>
              <select
                name="category"
                defaultValue={product.category}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>


            {(product.catalogSource || product.variantOptions) && (
              <VariantPricing
                available={{
                  colors: product.catalogSource?.availableColors.length
                    ? product.catalogSource.availableColors
                    : product.variantOptions?.colors ?? [],
                  sizes: product.catalogSource?.availableSizes.length
                    ? product.catalogSource.availableSizes
                    : product.variantOptions?.sizes ?? [],
                }}
                current={product.variantOptions ?? null}
              />
            )}

            <details className="studio-optional md:col-span-2"><summary>More listing options (optional)</summary><div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Short description
              </span>
              <textarea
                name="shortDescription"
                rows={2}
                defaultValue={product.shortDescription ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                SEO title
              </span>
              <input
                name="seoTitle"
                defaultValue={product.seoTitle ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                SEO description
              </span>
              <textarea
                name="seoDescription"
                rows={2}
                defaultValue={product.seoDescription ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Suggested tags (comma-separated)
              </span>
              <input
                name="suggestedTags"
                defaultValue={product.suggestedTags?.join(", ") ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Suggested collections (comma-separated)
              </span>
              <input
                name="suggestedCollections"
                defaultValue={product.suggestedCollections?.join(", ") ?? ""}
                className="w-full rounded-lg border px-3 py-2"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-black)",
                  color: "var(--so-cream)",
                }}
              />
            </label>
            </div></details>
            <div className="flex flex-wrap gap-3 md:col-span-2">
              <SubmitButton variant="outline" pendingLabel="Saving…">Save draft</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}
      {isOwn && canModerate ? (
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
            Publication readiness
          </h2>
          {product.draftStatus === "approved" && !product.active ? <p className="mt-2 text-sm" style={{ color: "var(--so-gold)" }}>Approved and ready to publish. This listing is still private.</p> : null}
          {!readiness.canPublish ? <p className="mt-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>Complete the failed requirements below, save your changes, then check readiness again.</p> : null}
          {!readiness.canPublish && productionAsset?.asset.compositionLayout && product.sourceAssetId && canEdit ? <Link className="so-link mt-2 inline-block" href={`/partner/canvas?composition=${product.sourceAssetId}&targetDraft=${product.id}`}>Reopen the associated Studio design to correct it</Link> : null}
          <ul className="mt-4 space-y-2">
            {readiness.checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                <span style={{ color: check.passed ? "var(--so-gold)" : "#dc2626" }}>
                  {check.passed ? "✓" : "✗"}
                </span>
                <span style={{ color: "var(--so-cream-dim)" }}>
                  {check.label}
                  {check.message ? (
                    <span className="block opacity-80">{check.message}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {!product.active ? (
            <div className="mt-4 flex flex-wrap gap-2">

              {canEdit ? <form action={markReady}>
                <SubmitButton pendingLabel="Checking…" variant="outline">
                  {readiness.canPublish ? product.draftStatus === "approved" ? "Recheck readiness" : "Mark ready for publication (stays private)" : "Check readiness"}
                </SubmitButton>
              </form> : null}
              {canEdit && product.draftStatus === "approved" && readiness.canPublish ? <form action={publishNow}>
                <SubmitButton pendingLabel="Publishing…">Publish this approved product</SubmitButton>
              </form> : null}
            </div>
          ) : (
            <p className="mt-4 text-sm" style={{ color: "var(--so-gold)" }}>
              Live — manage from{" "}
              <Link href="/partner/products" className="underline">
                Products
              </Link>
              .
            </p>
          )}
        </section>
      ) : null}

      {draftCompleteness ? (
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
            Draft completeness
          </h2>
          <ul className="mt-4 space-y-2">
            {draftCompleteness.checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                <span style={{ color: check.passed ? "var(--so-gold)" : "#dc2626" }}>
                  {check.passed ? "✓" : "✗"}
                </span>
                <span style={{ color: "var(--so-cream-dim)" }}>
                  {check.label}
                  {check.message ? (
                    <span className="block opacity-80">{check.message}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {aiSession && (aiSession.session.rawResponse as { kind?: string })?.kind !== "canvas_composition" ? (
        <section
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--so-border)", background: "var(--so-black)" }}
        >
          <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
            AI source
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Mode: {aiSession.session.mode.replaceAll("_", " ")}
          </p>
          <p
            className="mt-3 whitespace-pre-wrap text-sm"
            style={{ color: "var(--so-cream-dim)" }}
          >
            {aiSession.session.prompt}
          </p>
        </section>
      ) : null}


    </div>
  );
}
