import Link from "next/link";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { REVIEW_QUEUE_DRAFT_STATUSES } from "@/lib/domains/catalog/draft-status";
import { requireRole } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { submitPartnerDraftForReviewAction } from "../actions/drafts";

export default async function PartnerDraftsPage() {
  const session = await requireRole("partner");

  const rows = await listActorProductDrafts({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
  });

  const pending = rows.filter(({ product }) =>
    REVIEW_QUEUE_DRAFT_STATUSES.includes(product.draftStatus),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My product drafts</h1>
        <p className="mt-1 text-sm text-neutral-600">
          AI-generated drafts you created. Edit listing copy, then submit for
          owner review — partners cannot publish.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">
            No drafts yet. Use{" "}
            <Link href="/partner/intelligence" className="text-emerald-800 hover:underline">
              Product Intelligence
            </Link>{" "}
            or{" "}
            <Link
              href="/partner/visual-intake"
              className="text-emerald-800 hover:underline"
            >
              Visual intake
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {rows.map(({ product, session: aiSession }) => (
              <li key={product.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/partner/drafts/${product.id}`}
                      className="font-medium text-emerald-900 hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-neutral-500">
                      {aiSession.mode.replaceAll("_", " ")} ·{" "}
                      {new Date(aiSession.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 font-mono text-xs text-neutral-400">
                      Ref {product.id.slice(0, 8)}… · {product.slug}
                    </p>
                  </div>
                  <DraftStatusBadge
                    draftStatus={product.draftStatus}
                    active={product.active}
                  />
                </div>
                {product.draftStatus === "draft" ||
                product.draftStatus === "needs_work" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/partner/drafts/${product.id}`}
                      className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Edit listing
                    </Link>
                    <form
                      action={submitPartnerDraftForReviewAction.bind(null, product.id)}
                    >
                      <button
                        type="submit"
                        className="rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
                      >
                        Submit for owner review
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link
                    href={`/partner/drafts/${product.id}`}
                    className="mt-3 inline-block text-sm text-emerald-800 hover:underline"
                  >
                    View draft →
                  </Link>
                )}
                {product.suggestedTags?.length ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    Tags: {product.suggestedTags.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-neutral-500">
        {pending.length} draft{pending.length === 1 ? "" : "s"} awaiting owner
        review.
      </p>
    </div>
  );
}
