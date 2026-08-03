import Link from "next/link";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  listActiveProducts,
  listProductsPendingReview,
} from "@/lib/domains/catalog/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import {
  approvePendingListingAction,
  rejectPendingListingAction,
} from "../../actions/drafts";

type StudioListingsPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function StudioListingsPage({
  searchParams,
}: StudioListingsPageProps) {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });
  const query = await searchParams;

  const [pending, drafts, live] = await Promise.all([
    listProductsPendingReview(session.ventureId),
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    listActiveProducts(session.ventureId),
  ]);

  const openDrafts = drafts.filter(({ product }) => !product.active);
  const canModerate = pack.id === "sweetoh_partner";

  return (
    <div className="space-y-8">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/studio" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Studio
          </Link>
          {" / "}
          Listings
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Listings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {canModerate
            ? "Approve venture submits for Sweet'Oh + brand sites. Manage live catalog."
            : "Your drafts and submits. Partner approves before they go live."}
        </p>
      </div>

      {canModerate ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
            Pending review ({pending.length})
          </h2>
          <div
            className="rounded-xl border"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            {pending.length === 0 ? (
              <p className="px-5 py-6 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                No listings waiting for approval.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
                {pending.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div>
                      <Link
                        href={`/partner/drafts/${product.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "var(--so-cream)" }}
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                        Brand: {product.brandVentureSlug ?? "sweetoh"} ·{" "}
                        <DraftStatusBadge
                          draftStatus={product.draftStatus}
                          active={product.active}
                        />
                      </p>
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
            Your drafts ({openDrafts.length})
          </h2>
          <Link
            href="/partner/drafts"
            className="text-xs underline"
            style={{ color: "var(--so-cream-dim)" }}
          >
            Open all
          </Link>
        </div>
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Live catalog:{" "}
          <Link href="/partner/products" className="underline" style={{ color: "var(--so-cream)" }}>
            {live.length} products
          </Link>
        </p>
      </section>
    </div>
  );
}
