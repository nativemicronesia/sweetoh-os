import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { StudioHome } from "./studio-home";

type PageProps = { searchParams: Promise<{ error?: string }> };

/**
 * Studio home. Studio is a standalone creative workspace: start a design on any
 * canvas, reopen saved designs, and only then decide which products use them.
 */
export default async function PartnerStudioPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const [designs, catalog] = await Promise.all([
    listPartnerLibraryDesigns(session.ventureId),
    listPartnerCatalog(session).catch(() => []),
  ]);
  const products = catalog.filter((p) => Boolean(p.imageUrl)).map((p) => ({ id: p.id, name: p.name }));
  return <StudioHome designs={designs} products={products} error={query.error} />;
}
