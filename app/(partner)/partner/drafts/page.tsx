import Link from "next/link";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import {
  publishPartnerDraftAction,
  submitPartnerDraftForReviewAction,
} from "../actions/drafts";

export default async function PartnerDraftsPage() {
  const session = await requirePartnerWorkspace();

  const rows = await listActorProductDrafts({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
  });

  const openDrafts = rows.filter(({ product }) => !product.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
            Drafts
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            AI-prepared listings. Fix the price if needed, then publish — you do not
            wait on an owner.
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

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        {openDrafts.length === 0 ? (
          <p className="px-6 py-8 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            No open drafts.{" "}
            <Link href="/partner/visual-intake" className="underline" style={{ color: "var(--so-cream)" }}>
              Photograph a product
            </Link>{" "}
            to start.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
            {openDrafts.map(({ product, session: aiSession }) => (
              <li
                key={product.id}
                className="px-6 py-4"
                style={{ borderColor: "var(--so-border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/partner/drafts/${product.id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--so-cream)" }}
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                      {aiSession.mode.replaceAll("_", " ")} ·{" "}
                      {new Date(aiSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <DraftStatusBadge
                    draftStatus={product.draftStatus}
                    active={product.active}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/partner/drafts/${product.id}`}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "var(--so-border)", color: "var(--so-cream)" }}
                  >
                    Edit listing
                  </Link>
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
                      Mark for later review
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
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
