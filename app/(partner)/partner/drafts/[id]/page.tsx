import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftStatusBadge } from "@/app/(owner)/owner/components/draft-status-badge";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { evaluateProductPublishReadiness } from "@/lib/domains/catalog/service";
import type { ProductCategory } from "@/lib/domains/catalog/publish";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { evaluateAiProductDraftCompleteness } from "@/lib/domains/intelligence/draft-completeness";
import {
  getActorProductDraft,
  getAiCreationSessionForProduct,
} from "@/lib/domains/intelligence/service";
import {
  publishPartnerDraftAction,
  updatePartnerDraftAction,
} from "../../actions/drafts";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "sweetoh_creations", label: "Sweet'Oh Creations" },
  { value: "baby_me", label: "Baby + Me" },
  { value: "toys_sensory", label: "Toys & Sensory" },
  { value: "originals", label: "Originals" },
];

type PartnerDraftDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerDraftDetailPage({
  params,
  searchParams,
}: PartnerDraftDetailPageProps) {
  const session = await requirePartnerWorkspace();
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
    (product.draftStatus === "draft" ||
      product.draftStatus === "needs_work" ||
      product.draftStatus === "pending_review");

  async function saveListing(formData: FormData) {
    "use server";
    await updatePartnerDraftAction(id, formData);
  }

  async function publishNow() {
    "use server";
    await publishPartnerDraftAction(id);
  }

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <Link
          href="/partner/drafts"
          className="text-sm underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          ← Drafts
        </Link>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          {product.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <DraftStatusBadge
            draftStatus={product.draftStatus}
            active={product.active}
          />
          <span className="font-mono text-xs" style={{ color: "var(--so-cream-dim)" }}>
            {product.slug}
          </span>
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Sweet&apos;Oh AI prepared this listing. Confirm the price and publish when
          ready — production stays with you.
        </p>
      </div>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
          Publish readiness
        </h2>
        <ul className="mt-4 space-y-2">
          {readiness.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2 text-sm">
              <span style={{ color: check.passed ? "var(--so-gold)" : "#f87171" }}>
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
          <form action={publishNow} className="mt-4">
            <button
              type="submit"
              disabled={!readiness.canPublish}
              className="rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
            >
              Publish to catalog
            </button>
            {!readiness.canPublish ? (
              <p className="mt-2 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                Fix the items above, then publish.
              </p>
            ) : null}
          </form>
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
                <span style={{ color: check.passed ? "var(--so-gold)" : "#f87171" }}>
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

      {aiSession ? (
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

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
          Listing copy
        </h2>
        {canEdit ? (
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
            <label className="block text-sm">
              <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
                Price (cents)
              </span>
              <input
                name="priceCents"
                type="number"
                min={0}
                step={1}
                defaultValue={product.priceCents}
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
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full px-5 py-2.5 text-sm font-medium"
                style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
              >
                Save listing
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            This listing is not editable in its current status.
          </p>
        )}
      </section>
    </div>
  );
}
