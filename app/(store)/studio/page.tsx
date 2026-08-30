import { PRODUCT_CATEGORY_META } from "@/lib/domains/catalog/categories";
import { listApprovedDesignsForStudio } from "@/lib/domains/catalog/design-library";
import {
  getPrimaryProductImageUrl,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import type { ProductCategory } from "@/lib/domains/catalog/categories";
import { StudioView } from "./studio-view";

export default async function StudioPage() {
  const venture = await getDefaultVenture();
  const [products, library] = await Promise.all([
    listActiveProducts(venture.id),
    listApprovedDesignsForStudio(venture.id),
  ]);

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  const blanks = products.map((product, index) => ({
    id: product.id,
    name: product.name,
    priceCents: product.priceCents,
    category: product.category as ProductCategory,
    imageUrl: images[index],
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
      <div className="max-w-2xl">
        <p className="so-eyebrow">Create</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          Studio
        </h1>
        <p className="mt-3 text-sm leading-relaxed so-muted sm:text-base">
          Choose a blank. Create with AI, upload, or place a library design. Preview the
          mockup — then add to cart and wait for the package.
        </p>
      </div>
      <StudioView
        blanks={blanks}
        library={library}
        categoryLabels={PRODUCT_CATEGORY_META.map((item) => ({
          value: item.value,
          label: item.label,
        }))}
      />
    </div>
  );
}
