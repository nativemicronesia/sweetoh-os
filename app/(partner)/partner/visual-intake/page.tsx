import Link from "next/link";
import {
  isAiProductBuilderConfigured,
  isMockAiEnabled,
} from "@/lib/config/env";
import { isPieImageIntakeReady } from "@/lib/domains/intelligence/pie-readiness";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { generatePartnerPieIntakeAction } from "../actions/intelligence";

type PartnerVisualIntakePageProps = {
  searchParams: Promise<{ error?: string; success?: string; draft?: string }>;
};

export default async function PartnerVisualIntakePage({
  searchParams,
}: PartnerVisualIntakePageProps) {
  await requirePartnerWorkspace();
  const query = await searchParams;
  const aiReady = isAiProductBuilderConfigured();
  const mockMode = isMockAiEnabled();
  const imageIntake = await isPieImageIntakeReady();
  const formReady = aiReady && imageIntake.ready;

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      {query.draft ? (
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "var(--so-gold-dim)",
            background: "rgba(201,168,76,0.07)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
            Draft ready — review and publish when the listing looks right.
          </p>
          <Link
            href={`/partner/drafts/${query.draft}`}
            className="mt-2 inline-block text-sm hover:underline"
            style={{ color: "var(--so-cream)" }}
          >
            Open draft →
          </Link>
        </div>
      ) : null}

      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/design" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Design
          </Link>
          {" / "}
          New from photo
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          New design from photo
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Snap or upload a product you already made. Sweet&apos;Oh AI prepares the
          listing — you confirm price and publish. Production stays with you.
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
          <code>AI_MOCK_MODE=true</code> — mock image analysis, real storage upload.
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
          <code>product-media</code>). Run storage setup before photographing products.
        </p>
      ) : null}

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <form action={generatePartnerPieIntakeAction} className="space-y-4">
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
              disabled={!formReady}
              className="w-full text-sm disabled:opacity-60"
              style={{ color: "var(--so-cream-dim)" }}
            />
            <span className="mt-1 block text-xs" style={{ color: "var(--so-cream-dim)" }}>
              On a phone, this opens the camera. Or choose a photo from your library.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Notes (optional)
            </span>
            <textarea
              name="operatorNotes"
              rows={3}
              placeholder="e.g. Toddler tee, soft cotton, name Mae on the front"
              disabled={!formReady}
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
            disabled={!formReady}
            className="rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
          >
            Prepare listing with Sweet&apos;Oh AI
          </button>
        </form>
      </section>

      <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
        Prefer typing only?{" "}
        <Link href="/partner/intelligence" className="underline hover:opacity-80">
          Text draft
        </Link>
        .
      </p>
    </div>
  );
}
