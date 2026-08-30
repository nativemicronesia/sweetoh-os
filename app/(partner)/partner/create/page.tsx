import Link from "next/link";
import {
  isAiProductBuilderConfigured,
  isMockAiEnabled,
} from "@/lib/config/env";
import { isPieImageIntakeReady } from "@/lib/domains/intelligence/pie-readiness";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  generatePartnerPieDraftAction,
  generatePartnerPieIntakeAction,
} from "../actions/intelligence";

/**
 * One Create screen. Photo lane and text lane share the same PIE pipeline
 * underneath (`createPieProductDraft`) — this replaces the old Create doors
 * page, Visual Intake, and the Text-draft "Intelligence" page.
 */

type PartnerCreatePageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerCreatePage({
  searchParams,
}: PartnerCreatePageProps) {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });
  const query = await searchParams;

  const [drafts, imageIntake] = await Promise.all([
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    isPieImageIntakeReady(),
  ]);

  const openDrafts = drafts.filter(({ product }) => !product.active).length;
  const aiReady = isAiProductBuilderConfigured();
  const mockMode = isMockAiEnabled();
  const photoReady = aiReady && imageIntake.ready;

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Create
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Photograph a piece or describe it. Sweet&apos;Oh AI drafts the listing —
          photos also land in your{" "}
          <Link href="/partner/library" className="underline" style={{ color: "var(--so-gold)" }}>
            Design library
          </Link>{" "}
          for Studio.
        </p>
      </div>

      {!aiReady ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--so-gold-dim)",
            color: "var(--so-cream)",
            background: "rgba(201,168,76,0.07)",
          }}
        >
          Add <code>OPENAI_API_KEY</code> for live AI, or{" "}
          <code>AI_MOCK_MODE=true</code> for offline testing.
        </p>
      ) : mockMode ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
        >
          <code>AI_MOCK_MODE=true</code> — mock analysis, real storage upload.
        </p>
      ) : null}

      {!imageIntake.ready ? (
        <p
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--so-gold-dim)",
            color: "var(--so-cream)",
            background: "rgba(201,168,76,0.07)",
          }}
        >
          Storage buckets missing (<code>design-library</code>,{" "}
          <code>product-media</code>). The photo lane stays disabled until storage
          setup runs — the text lane still works.
        </p>
      ) : null}

      <section
        className="rounded-xl border p-6"
        style={{
          borderColor: "var(--so-gold-dim)",
          background: "rgba(201,168,76,0.05)",
        }}
      >
        <h2 className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          From a photo
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Best result — Sweet&apos;Oh AI sees the actual piece.
        </p>
        <form action={generatePartnerPieIntakeAction} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Product photo
            </span>
            <input
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              required
              disabled={!photoReady}
              className="w-full text-sm disabled:opacity-60"
              style={{ color: "var(--so-cream-dim)" }}
            />
            <span className="mt-1 block text-xs" style={{ color: "var(--so-cream-dim)" }}>
              On a phone this opens the camera. Or pick a photo from your library.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Notes (optional)
            </span>
            <textarea
              name="operatorNotes"
              rows={2}
              placeholder="e.g. Toddler tee, soft cotton, name Mae on the front"
              disabled={!photoReady}
              className="w-full rounded-lg border px-3 py-2 disabled:opacity-60"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <button
            type="submit"
            disabled={!photoReady}
            className="rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
          >
            Prepare listing from photo
          </button>
        </form>
      </section>

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <h2 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
          From a description
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          No photo yet? Describe it — or just tell the Studio bar above and it
          will draft it for you.
        </p>
        <form action={generatePartnerPieDraftAction} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Describe the product
            </span>
            <textarea
              name="textPrompt"
              rows={4}
              required
              disabled={!aiReady}
              placeholder="Custom onesie with tropical leaves and the name Keola…"
              className="w-full rounded-lg border px-3 py-2 disabled:opacity-60"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <button
            type="submit"
            disabled={!aiReady}
            className="rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            style={{ borderColor: "var(--so-gold-dim)", color: "var(--so-gold)" }}
          >
            Prepare listing from text
          </button>
        </form>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="/partner/review"
          className="underline"
          style={{ color: "var(--so-cream)" }}
        >
          {openDrafts > 0
            ? `${openDrafts} open draft${openDrafts === 1 ? "" : "s"} in Review`
            : "No open drafts"}
        </Link>
        <Link
          href="/partner/library"
          className="underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Design library
        </Link>
        <Link
          href="/studio"
          className="underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Customer Studio
        </Link>
      </div>
    </div>
  );
}
