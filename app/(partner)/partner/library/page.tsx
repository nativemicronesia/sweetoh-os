import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  approveLibraryDesignAction,
  removeLibraryDesignAction,
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

      <header className="studio-page-heading">
        <div>
          <h1>My files</h1>
          <p>Your artwork and saved designs, ready to place on any product.</p>
        </div>
        <Link href="/partner/catalog" className="studio-primary">
          ＋ Create product
        </Link>
      </header>

      <details
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <summary className="cursor-pointer font-medium">＋ Upload artwork to your library</summary>
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
      </details>

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
          <div className="catalog-empty">
            <ImageIcon size={36} strokeWidth={1.5} />
            <h3>No files yet</h3>
            <p>Upload artwork above, or save a design from the design studio.</p>
          </div>
        ) : (
          <ul className="grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {designs.map((design) => (
              <li
                key={design.id}
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--so-border)" }}
              >
                <div className="library-thumb aspect-square">
                  {design.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.previewUrl}
                      alt={design.name}
                      className="h-full w-full object-contain"
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
                  <p className="flex items-center gap-2 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                    <Badge variant={design.status === "draft" ? "secondary" : "default"}>
                      {design.isComposition ? "Design" : design.status === "draft" ? "Draft" : "Ready"}
                    </Badge>
                    {design.createdAt.toLocaleDateString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {design.isComposition ? (
                      <Link
                        href={`/partner/canvas?composition=${design.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Open in studio
                      </Link>
                    ) : (
                      <Link
                        href={`/partner/canvas?design=${design.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Use on a product
                      </Link>
                    )}
                    {canApprove && design.status === "draft" ? (
                      <form action={approveLibraryDesignAction}>
                        <input type="hidden" name="assetId" value={design.id} />
                        <button
                          type="submit"
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Approve
                        </button>
                      </form>
                    ) : null}
                    <form action={removeLibraryDesignAction}>
                      <input type="hidden" name="assetId" value={design.id} />
                      <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
                        Remove
                      </button>
                    </form>
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
