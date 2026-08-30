import Link from "next/link";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import {
  getPrimaryProductImageUrl,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { PartnerCanvasClient } from "./canvas-client";

type PageProps = {
  searchParams: Promise<{ design?: string; error?: string }>;
};

export default async function PartnerCanvasPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const [products, designs] = await Promise.all([
    listActiveProducts(session.ventureId),
    listPartnerLibraryDesigns(session.ventureId),
  ]);

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  const blanks = products.map((product, index) => ({
    id: product.id,
    name: product.name,
    imageUrl: images[index],
  }));

  const designOptions = designs
    .filter((item) => item.status === "approved" || item.status === "licensed" || item.status === "draft")
    .map((item) => ({
      id: item.id,
      name: item.name,
      previewUrl: item.previewUrl,
    }));

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
            Canvas
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Place a library design on a blank, scale it, and save the composition back to your
            library for Studio.
          </p>
        </div>
        <Link
          href="/partner/library"
          className="text-sm underline"
          style={{ color: "var(--so-gold)" }}
        >
          Design library
        </Link>
      </div>

      {blanks.length === 0 || designOptions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Need at least one live blank and one library design.{" "}
          <Link href="/partner/library" className="underline" style={{ color: "var(--so-cream)" }}>
            Upload a design
          </Link>{" "}
          or publish blanks from Products.
        </p>
      ) : (
        <PartnerCanvasClient
          blanks={blanks}
          designs={designOptions}
          initialDesignId={query.design ?? null}
        />
      )}
    </div>
  );
}
