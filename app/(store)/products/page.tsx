import { Suspense } from "react";
import { getPrimaryProductImageUrl, listActiveProducts } from "@/lib/domains/catalog";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ProductsView } from "./products-view";

/**
 * No searchParams read here — category filtering happens client-side in
 * ProductsView so this page stays cacheable (inherits the store layout's
 * 30s revalidate) instead of re-querying the DB on every category click.
 */
export default async function ProductsPage() {
  const venture = await getDefaultVenture();
  const products = await listActiveProducts(venture.id);

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return (
    <Suspense>
      <ProductsView
        products={products.map((product, index) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          category: product.category,
          imageUrl: images[index],
        }))}
      />
    </Suspense>
  );
}
