import Link from "next/link";
import {
  isAiProductBuilderConfigured,
  isMockAiEnabled,
} from "@/lib/config/env";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { generatePartnerPieDraftAction } from "../actions/intelligence";

type PartnerIntelligencePageProps = {
  searchParams: Promise<{ error?: string; success?: string; draft?: string }>;
};

export default async function PartnerIntelligencePage({
  searchParams,
}: PartnerIntelligencePageProps) {
  await requirePartnerWorkspace();
  const query = await searchParams;
  const aiReady = isAiProductBuilderConfigured();
  const mockMode = isMockAiEnabled();

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      {query.draft ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          <Link
            href={`/partner/drafts/${query.draft}`}
            className="underline"
            style={{ color: "var(--so-cream)" }}
          >
            Open draft →
          </Link>
        </p>
      ) : null}

      <div>
        <Link
          href="/partner/visual-intake"
          className="text-sm underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          ← New from photo
        </Link>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Text draft
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Describe a product when you do not have a photo yet. Prefer{" "}
          <Link href="/partner/visual-intake" className="underline">
            New from photo
          </Link>{" "}
          when you can.
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
          Add <code>OPENAI_API_KEY</code> or <code>AI_MOCK_MODE=true</code>.
        </p>
      ) : mockMode ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Mock AI mode is on.
        </p>
      ) : null}

      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <form action={generatePartnerPieDraftAction} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Describe the product
            </span>
            <textarea
              name="textPrompt"
              rows={5}
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
            className="rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
          >
            Prepare listing with Sweet&apos;Oh AI
          </button>
        </form>
      </section>
    </div>
  );
}
