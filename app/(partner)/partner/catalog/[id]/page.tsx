import { getPrintifyBlueprint, getBlueprintOptions, catalogCategory, plainCatalogDescription } from "@/lib/integrations/printify/catalog";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";
import { CatalogProduct } from "../catalog-product";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Package, MapPin } from "lucide-react";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { assertBuilderRole } from "@/lib/domains/intelligence/partner-builder";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { categoryLabel } from "@/lib/domains/catalog/categories";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreationSteps } from "../../components/creation-steps";
import { sizedPhoto } from "@/lib/studio/photo";

export default async function CatalogProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requirePartnerWorkspace();
  assertBuilderRole(session);
  const { id } = await params;
  if (/^printify-\d+$/.test(id)) {
    const query = await searchParams;
    let blueprint;
    try { blueprint = await getPrintifyBlueprint(Number(id.slice("printify-".length))); }
    catch { return <div className="space-y-5"><h1 className="text-2xl font-semibold">Catalog temporarily unavailable</h1><p>Your saved products are still available.</p><Link href="/partner/catalog">← Back to catalog</Link></div>; }
    const [options, blanks] = await Promise.all([
      getBlueprintOptions(blueprint.id).catch(() => null),
      listBuilderBlanks(session),
    ]);
    const saved = blanks.find((b) => b.catalogSource?.blueprintId === blueprint.id)?.variantOptions;
    return <div className="space-y-7"><CreationSteps current={1}/><Link href="/partner/catalog" className="inline-flex items-center gap-2"><ArrowLeft size={16}/> All products</Link><FlashBanner message={query.error} variant="error"/><CatalogProduct options={options} initial={saved ? { colors: saved.colors.map((c) => c.name), sizes: saved.sizes } : null} product={{id:blueprint.id,name:blueprint.title,brand:blueprint.brand,model:blueprint.model,images:blueprint.images,description:plainCatalogDescription(blueprint.description),category:categoryLabel(catalogCategory(blueprint.title))}}/></div>;
  }
  const item = (await listPartnerCatalog(session)).find(p => p.id === id);
  if (!item) notFound();
  return <div className="space-y-7">
    <CreationSteps current={1} />
    <Link href="/partner/catalog" className="inline-flex items-center gap-2 text-sm"><ArrowLeft size={16} /> All products</Link>
    <section className="catalog-detail">
      <div className="catalog-detail-image">{item.imageUrl ? <img src={sizedPhoto(item.imageUrl)} alt={item.name} /> : <div className="catalog-no-image"><Package size={56} /><p>Product photo needed</p></div>}</div>
      <div className="space-y-6 py-4">
        <Badge variant="secondary">{categoryLabel(item.category)}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{item.name}</h1>
        <p className="leading-7 text-muted-foreground">{item.description || "Customize this product with your own artwork or text."}</p>
        <div className="catalog-provider"><MapPin size={20} /><div><strong>Sweet’Oh · Local production</strong><p>Printed and fulfilled by your shop.</p></div></div>
        <dl className="catalog-specs"><div><dt>Print areas</dt><dd>{item.printArea?.surfaces?.map(s => s.name).join(", ") || "Front"}</dd></div><div><dt>Artwork</dt><dd>Upload, artwork library, or text</dd></div><div><dt>Selling price</dt><dd>Set your price after designing</dd></div></dl>
        {item.imageUrl ? <Link className={buttonVariants({ size: "lg" })} href={`/partner/canvas?blank=${item.id}`}>Start designing <ArrowRight size={16} /></Link>
          : <div className="space-y-3"><p className="text-sm text-muted-foreground">Add a photo of your local blank to prepare this product for designing.</p><Link className={buttonVariants({ size: "lg" })} href="/partner/catalog/new">Add product photo</Link></div>}
      </div>
    </section>
  </div>;
}
