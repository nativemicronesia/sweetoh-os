import Link from "next/link";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { listProducts } from "@/lib/domains/catalog/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { formatPrice } from "@/lib/shared/format";
import { unpublishPartnerProductAction } from "../actions/drafts";

type PartnerProductsPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerProductsPage({
  searchParams,
}: PartnerProductsPageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const [products, myDrafts] = await Promise.all([
    listProducts(session.ventureId),
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
  ]);

  const live = products.filter((item) => item.active);
  const openDrafts = myDrafts.filter(({ product }) => !product.active);

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
            <Link href="/partner/design" className="hover:underline" style={{ color: "var(--so-cream)" }}>
              Design
            </Link>
            {" / "}
            Live listings
          </p>
          <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
            Live listings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Published catalog. Facebook stays your customer channel until you share
            them there.
          </p>
        </div>
        <Link
          href="/partner/visual-intake"
          className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
        >
          New from photo
        </Link>
      </div>

      <section className="space-y-3">
        <h2
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Live ({live.length})
        </h2>
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          {live.length === 0 ? (
            <p className="px-6 py-6 text-sm" style={{ color: "var(--so-cream-dim)" }}>
              Nothing live yet. Publish a draft to add it here.
            </p>
          ) : (
            <ul>
              {live.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 last:border-b-0"
                  style={{ borderColor: "var(--so-border)" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "var(--so-cream)" }}>
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                      {formatPrice(product.priceCents)} ·{" "}
                      <Link
                        href={`/products/${product.slug}`}
                        className="underline"
                        target="_blank"
                      >
                        View
                      </Link>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DraftStatusBadge
                      draftStatus={product.draftStatus}
                      active={product.active}
                    />
                    <form action={unpublishPartnerProductAction.bind(null, product.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border px-3 py-1.5 text-sm"
                        style={{
                          borderColor: "var(--so-border)",
                          color: "var(--so-cream-dim)",
                        }}
                      >
                        Unpublish
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Your open drafts ({openDrafts.length})
        </h2>
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          {openDrafts.length === 0 ? (
            <p className="px-6 py-6 text-sm" style={{ color: "var(--so-cream-dim)" }}>
              No open drafts.{" "}
              <Link href="/partner/visual-intake" className="underline">
                New from photo
              </Link>
              .
            </p>
          ) : (
            <ul>
              {openDrafts.map(({ product }) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 last:border-b-0"
                  style={{ borderColor: "var(--so-border)" }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "var(--so-cream)" }}>
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                      {formatPrice(product.priceCents)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DraftStatusBadge
                      draftStatus={product.draftStatus}
                      active={product.active}
                    />
                    <Link
                      href={`/partner/drafts/${product.id}`}
                      className="rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: "var(--so-border)", color: "var(--so-cream)" }}
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
