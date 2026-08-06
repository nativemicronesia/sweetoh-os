import Link from "next/link";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  getPrimaryProductImageUrl,
  listProductsPendingReview,
} from "@/lib/domains/catalog/service";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { formatPrice } from "@/lib/shared/format";
import {
  approvePendingListingAction,
  publishPartnerDraftAction,
  rejectPendingListingAction,
  submitPartnerDraftForReviewAction,
} from "../actions/drafts";

/**
 * One decision list. Absorbs the old Drafts list, Studio/Print approve queue,
 * and Studio/Listings. Which buttons appear is role-driven, exactly as the
 * Server Actions enforce.
 */

type PartnerReviewPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

function Thumb({ url, alt }: { url: string | null; alt: string }) {
  return (
    <div
      className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--so-border)", background: "var(--so-black)" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-[10px]"
          style={{ color: "var(--so-cream-dim)" }}
        >
          no photo
        </span>
      )}
    </div>
  );
}

export default async function PartnerReviewPage({
  searchParams,
}: PartnerReviewPageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const canModerate = canModerateListings(session);

  const [drafts, pending] = await Promise.all([
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    canModerate
      ? listProductsPendingReview(session.ventureId)
      : Promise.resolve([]),
  ]);

  const openDrafts = drafts.filter(({ product }) => !product.active);
  const pendingIds = new Set(pending.map((product) => product.id));
  // Submissions already listed in "Waiting on you" are not repeated below.
  const ownDrafts = openDrafts.filter(({ product }) => !pendingIds.has(product.id));

  const [pendingThumbs, draftThumbs] = await Promise.all([
    Promise.all(
      pending.map(async (product) => ({
        id: product.id,
        url: await getPrimaryProductImageUrl(product.id),
      })),
    ),
    Promise.all(
      ownDrafts.map(async ({ product }) => ({
        id: product.id,
        url: await getPrimaryProductImageUrl(product.id),
      })),
    ),
  ]);

  const thumbById = new Map(
    [...pendingThumbs, ...draftThumbs].map((row) => [row.id, row.url]),
  );

  return (
    <div className="space-y-8">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Review
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {canModerate
            ? "Everything waiting on a decision — approve submissions, finish and publish your own drafts."
            : "Your drafts. Finish the listing, then submit it for Sweet'Oh approval."}
        </p>
      </div>

      {canModerate ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
            Waiting on you ({pending.length})
          </h2>
          <div
            className="rounded-xl border"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                Nothing waiting on you right now.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
                {pending.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb
                        url={thumbById.get(product.id) ?? null}
                        alt={product.name}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/partner/review/${product.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: "var(--so-cream)" }}
                        >
                          {product.name}
                        </Link>
                        <p
                          className="mt-1 flex flex-wrap items-center gap-2 text-xs"
                          style={{ color: "var(--so-cream-dim)" }}
                        >
                          <span>{formatPrice(product.priceCents)}</span>
                          <span>·</span>
                          <span>Brand: {product.brandVentureSlug ?? "sweetoh"}</span>
                          <DraftStatusBadge
                            draftStatus={product.draftStatus}
                            active={product.active}
                          />
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={approvePendingListingAction.bind(null, product.id)}>
                        <button
                          type="submit"
                          className="rounded-full px-3 py-1.5 text-xs font-medium"
                          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectPendingListingAction.bind(null, product.id)}>
                        <button
                          type="submit"
                          className="rounded-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
          Your drafts ({ownDrafts.length})
        </h2>
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          {ownDrafts.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: "var(--so-cream-dim)" }}>
              No open drafts.{" "}
              <Link href="/partner/create" className="underline" style={{ color: "var(--so-cream)" }}>
                Make something
              </Link>{" "}
              to start.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
              {ownDrafts.map(({ product, session: aiSession }) => (
                <li key={product.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb
                        url={thumbById.get(product.id) ?? null}
                        alt={product.name}
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/partner/review/${product.id}`}
                          className="text-sm font-medium hover:underline"
                          style={{ color: "var(--so-cream)" }}
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                          {formatPrice(product.priceCents)} ·{" "}
                          {aiSession.mode.replaceAll("_", " ")} ·{" "}
                          {new Date(aiSession.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <DraftStatusBadge
                      draftStatus={product.draftStatus}
                      active={product.active}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/partner/review/${product.id}`}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: "var(--so-border)", color: "var(--so-cream)" }}
                    >
                      Open
                    </Link>
                    {canModerate ? (
                      <>
                        <form action={publishPartnerDraftAction.bind(null, product.id)}>
                          <button
                            type="submit"
                            className="rounded-lg px-3 py-1.5 text-sm font-medium"
                            style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
                          >
                            Publish
                          </button>
                        </form>
                        <form
                          action={submitPartnerDraftForReviewAction.bind(null, product.id)}
                        >
                          <button
                            type="submit"
                            className="rounded-lg border px-3 py-1.5 text-sm"
                            style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
                          >
                            Send to pending
                          </button>
                        </form>
                      </>
                    ) : (
                      <form
                        action={submitPartnerDraftForReviewAction.bind(null, product.id)}
                      >
                        <button
                          type="submit"
                          className="rounded-lg px-3 py-1.5 text-sm font-medium"
                          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
                        >
                          Submit for review
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
        Published items live under{" "}
        <Link href="/partner/products" className="underline">
          Products
        </Link>
        .
      </p>
    </div>
  );
}
