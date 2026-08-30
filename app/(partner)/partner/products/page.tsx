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
          <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
            Products
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Published catalog.{" "}
            <Link
              href="/partner/library"
              className="underline"
              style={{ color: "var(--so-gold)" }}
            >
              Design library
            </Link>{" "}
            ·{" "}
            <Link
              href="/partner/canvas"
              className="underline"
              style={{ color: "var(--so-gold)" }}
            >
              Canvas
            </Link>
            . Facebook stays your customer channel until you share them there.
          </p>
        </div>
        <Link
          href="/partner/create"
          className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
        >
          New piece
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
              <Link href="/partner/create" className="underline">
                Make something
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
                      href={`/partner/review/${product.id}`}
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
