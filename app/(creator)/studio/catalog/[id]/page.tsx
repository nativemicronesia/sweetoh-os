import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPrintifyBlueprint, getBlueprintOptions, catalogCategory, plainCatalogDescription } from "@/lib/integrations/printify/catalog";
import { requireCreator } from "@/lib/domains/identity/service";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";
import { categoryLabel } from "@/lib/domains/catalog/categories";
import { CatalogProduct } from "@/app/(partner)/partner/catalog/catalog-product";

export const metadata = { title: "Product" };
export const maxDuration = 120;

export default async function CreatorCatalogProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requireCreator();
  const { id } = await params;
  if (!/^printify-\d+$/.test(id)) {
    // One of the creator's own saved products: straight into the Studio.
    const mine = (await listBuilderBlanks(session)).find((b) => b.id === id);
    if (!mine) notFound();
    redirect(`/studio/design?blank=${mine.id}`);
  }
  const query = await searchParams;
  let blueprint;
  try {
    blueprint = await getPrintifyBlueprint(Number(id.slice("printify-".length)));
  } catch {
    return (
      <div className="cs-empty">
        <h3>The catalog is taking a break</h3>
        <p className="cs-muted">Try again in a minute.</p>
        <Link href="/studio/catalog" className="cs-btn cs-btn-ghost">Back to catalog</Link>
      </div>
    );
  }
  const [options, blanks] = await Promise.all([getBlueprintOptions(blueprint.id).catch(() => null), listBuilderBlanks(session).catch(() => [])]);
  const saved = blanks.find((b) => b.catalogSource?.blueprintId === blueprint.id)?.variantOptions;
  return (
    <div className="cs-stack" style={{ gap: 16 }}>
      <Link href="/studio/catalog" className="cs-link"><ArrowLeft size={15} /> All products</Link>
      {query.error && <p className="cs-alert" role="alert">{query.error}</p>}
      <div className="sweetoh-studio cs-catalog">
        <CatalogProduct
          options={options}
          initial={saved ? { colors: saved.colors.map((c) => c.name), sizes: saved.sizes } : null}
          provider={{ title: "Printify print network · On demand", text: "Printed and shipped when a customer orders — through your own Printify store, or ask Sweet’Oh to print it." }}
          product={{ id: blueprint.id, name: blueprint.title, brand: blueprint.brand, model: blueprint.model, images: blueprint.images, description: plainCatalogDescription(blueprint.description), category: categoryLabel(catalogCategory(blueprint.title)) }}
        />
      </div>
    </div>
  );
}
