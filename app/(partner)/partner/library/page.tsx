import Link from "next/link";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  approveLibraryDesignAction,
  uploadLibraryDesignAction,
} from "../actions/library";

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerLibraryPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const canApprove = canModerateListings(session);
  const designs = await listPartnerLibraryDesigns(session.ventureId);

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
            Design library
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Upload artwork, approve drafts, and place designs on blanks in Canvas. Approved
            designs show up in the customer Studio library.
          </p>
        </div>
        <Link
          href="/partner/canvas"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
        >
          Open Canvas
        </Link>
      </div>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <h2 className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          Upload design
        </h2>
        <form action={uploadLibraryDesignAction} className="mt-4 space-y-3">
          <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Name
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
            Notes
            <textarea
              name="notes"
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <label className="block text-sm" style={{ color: "var(--so-cream-dim)" }}>
            File
            <input name="file" type="file" accept="image/*" required className="mt-1 w-full text-sm" />
          </label>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
          >
            {canApprove ? "Upload to library" : "Upload draft"}
          </button>
        </form>
      </section>

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--so-border)" }}>
          <h2 className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
            Library ({designs.length})
          </h2>
        </div>
        {designs.length === 0 ? (
          <p className="px-5 py-8 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            No designs yet — upload one or compose in Canvas.
          </p>
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2">
            {designs.map((design) => (
              <li
                key={design.id}
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--so-border)" }}
              >
                <div className="aspect-square bg-neutral-100">
                  {design.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.previewUrl}
                      alt={design.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full items-center justify-center text-xs"
                      style={{ color: "var(--so-cream-dim)" }}
                    >
                      No preview
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
                    {design.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
                    {design.status} · {design.createdAt.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {design.isComposition ? (
                      <Link
                        href={`/partner/canvas?composition=${design.id}`}
                        className="text-xs underline"
                        style={{ color: "var(--so-gold)" }}
                      >
                        Edit composition
                      </Link>
                    ) : (
                      <Link
                        href={`/partner/canvas?design=${design.id}`}
                        className="text-xs underline"
                        style={{ color: "var(--so-gold)" }}
                      >
                        Place on blank
                      </Link>
                    )}
                    {canApprove && design.status === "draft" ? (
                      <form action={approveLibraryDesignAction}>
                        <input type="hidden" name="assetId" value={design.id} />
                        <button
                          type="submit"
                          className="text-xs underline"
                          style={{ color: "var(--so-cream)" }}
                        >
                          Approve
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
