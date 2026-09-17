import Link from "next/link";
import { CreationSteps } from "../../components/creation-steps";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { notFound } from "next/navigation";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  evaluateProductPublishReadiness,
  getPrimaryProductImageUrl,
  getProductById,
} from "@/lib/domains/catalog/service";
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
import {
  approvePendingListingAction,
  publishPartnerDraftAction,
  rejectPendingListingAction,
  submitPartnerDraftForReviewAction,
  updatePartnerDraftAction,
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

  const draftCompleteness = aiSession && !builderRecord(aiSession.session.rawResponse) && (aiSession.session.rawResponse as { kind?: string })?.kind !== "canvas_composition"
    ? evaluateAiProductDraftCompleteness({
        product,
        session: aiSession.session,
        mediaCount: aiSession.media.length,
      })
    : null;

  const canEdit =
    isOwn &&
    !product.active &&
    (product.draftStatus === "draft" ||
      product.draftStatus === "needs_work" ||
      product.draftStatus === "pending_review");

  const isPending = !product.active && product.draftStatus === "pending_review";

  async function saveListing(formData: FormData) {
    "use server";
    await updatePartnerDraftAction(id, formData);
  }

  async function publishNow() {
    "use server";
    await publishPartnerDraftAction(id);
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

  return (
    <div className="studio-review space-y-6"><CreationSteps current={product.active ? 5 : 4} />
      {(aiSession?.session.rawResponse as {kind?:string})?.kind === "canvas_composition" && product.sourceAssetId && <Link className="so-link" href={`/partner/canvas?composition=${product.sourceAssetId}`}>← Open saved design</Link>}
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />
      {builderRecord(aiSession?.session.rawResponse) && <Link href={`/partner/builder/${id}`} className="so-link">Review product research & source details →</Link>}

      <div>
        <Link
          href="/partner/review"
          className="text-sm underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          ← All listings
        </Link>
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
                className="rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: "var(--so-border)", color: "var(--so-cream)" }}
              >
                View live listing
              </Link>
            ) : null}
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
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full px-5 py-2.5 text-sm font-medium"
                style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
              >
                Save listing
              </button>
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
            Ready for your shop
          </h2>
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
              <form action={publishNow}>
                <button
                  type="submit"
                  disabled={!readiness.canPublish}
                  className="rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
                >
                  Publish to catalog
                </button>
              </form>
              <form action={submitForReview}>
                <button
                  type="submit"
                  className="rounded-full border px-5 py-2.5 text-sm"
                  style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
                >
                  Send to pending
                </button>
              </form>
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
