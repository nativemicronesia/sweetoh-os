import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  evaluateProductPublishReadiness,
} from "@/lib/domains/catalog/service";
import type { ProductCategory } from "@/lib/domains/catalog/publish";
import { requireRole } from "@/lib/domains/identity/service";
import { evaluateAiProductDraftCompleteness } from "@/lib/domains/intelligence/draft-completeness";
import {
  getActorProductDraft,
  getAiCreationSessionForProduct,
} from "@/lib/domains/intelligence/service";
import {
  submitPartnerDraftForReviewAction,
  updatePartnerDraftAction,
} from "../../actions/drafts";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "baby_me", label: "Baby + Me" },
  { value: "toys_sensory", label: "Toys & Sensory" },
  { value: "sweetoh_creations", label: "Sweet'Oh Creations" },
  { value: "originals", label: "Island Sprouts Originals" },
];

type PartnerDraftDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerDraftDetailPage({
  params,
  searchParams,
}: PartnerDraftDetailPageProps) {
  const session = await requireRole("partner");
  const { id } = await params;
  const query = await searchParams;

  const owned = await getActorProductDraft({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
    productId: id,
  });

  if (!owned) {
    notFound();
  }

  const { product } = owned;
  const aiSession = await getAiCreationSessionForProduct({
    ventureId: session.ventureId,
    productId: id,
  });

  const readiness = await evaluateProductPublishReadiness({
    ventureId: session.ventureId,
    productId: id,
  });

  const draftCompleteness = aiSession
    ? evaluateAiProductDraftCompleteness({
        product,
        session: aiSession.session,
        mediaCount: aiSession.media.length,
      })
    : null;

  const canEdit =
    !product.active &&
    (product.draftStatus === "draft" || product.draftStatus === "needs_work");

  async function saveListing(formData: FormData) {
    "use server";
    await updatePartnerDraftAction(id, formData);
  }

  async function submitForReview() {
    "use server";
    await submitPartnerDraftForReviewAction(id);
  }

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <Link
          href="/partner/drafts"
          className="text-sm text-emerald-800 hover:underline"
        >
          ← My drafts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
          <DraftStatusBadge
            draftStatus={product.draftStatus}
            active={product.active}
          />
          <span className="font-mono text-xs text-neutral-400">{product.slug}</span>
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Edit listing copy before submitting for owner review. Partners cannot
          publish — owners review and publish in the Command Center.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Publish readiness</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Owner publish gate — fix missing items before submit when possible.
        </p>
        <ul className="mt-4 space-y-2">
          {readiness.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-sm">
              <span className={check.passed ? "text-emerald-700" : "text-red-700"}>
                {check.passed ? "✓" : "✗"}
              </span>
              <span>
                {check.label}
                {check.message ? (
                  <span className="block text-neutral-500">{check.message}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <form action={submitForReview} className="mt-4">
            <button
              type="submit"
              className="rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
            >
              Submit for owner review
            </button>
          </form>
        ) : product.draftStatus === "pending_review" ? (
          <p className="mt-4 text-sm text-amber-800">
            Awaiting owner review — editing is locked until the owner returns it
            as needs work.
          </p>
        ) : null}
      </section>

      {draftCompleteness ? (
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-medium">Draft completeness</h2>
          <ul className="mt-4 space-y-2">
            {draftCompleteness.checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                <span className={check.passed ? "text-emerald-700" : "text-red-700"}>
                  {check.passed ? "✓" : "✗"}
                </span>
                <span>
                  {check.label}
                  {check.message ? (
                    <span className="block text-neutral-500">{check.message}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {aiSession ? (
        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6">
          <h2 className="text-lg font-medium">AI source (read-only)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Mode: {aiSession.session.mode.replaceAll("_", " ")}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">
            {aiSession.session.prompt}
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Listing copy</h2>
        {canEdit ? (
          <form action={saveListing} className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">Name</span>
              <input
                name="name"
                required
                defaultValue={product.name}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">Description</span>
              <textarea
                name="description"
                rows={4}
                defaultValue={product.description ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">Short description</span>
              <textarea
                name="shortDescription"
                rows={2}
                defaultValue={product.shortDescription ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-700">SEO title</span>
              <input
                name="seoTitle"
                defaultValue={product.seoTitle ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-700">Price (cents)</span>
              <input
                name="priceCents"
                type="number"
                min={0}
                step={1}
                defaultValue={product.priceCents}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">SEO description</span>
              <textarea
                name="seoDescription"
                rows={2}
                defaultValue={product.seoDescription ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-700">Category</span>
              <select
                name="category"
                defaultValue={product.category}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">
                Suggested tags (comma-separated)
              </span>
              <input
                name="suggestedTags"
                defaultValue={product.suggestedTags?.join(", ") ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-neutral-700">
                Suggested collections (comma-separated)
              </span>
              <input
                name="suggestedCollections"
                defaultValue={product.suggestedCollections?.join(", ") ?? ""}
                className="w-full rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
              >
                Save listing
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            This draft is not editable in its current status.
          </p>
        )}
      </section>
    </div>
  );
}
