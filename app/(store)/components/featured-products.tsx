import {
  getCollectionBySlug,
  getPrimaryProductImageUrl,
  getProductsForCollection,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { NotFoundError } from "@/lib/shared/errors";
import { ProductCard } from "./product-card";

const FEATURED_COLLECTION_SLUG = "featured";

/**
 * Prefers the manual "featured" collection; falls back to the first active
 * products so the homepage is never empty after catalog seed.
 */
export async function FeaturedProducts({ ventureId }: { ventureId: string }) {
  let products: Awaited<ReturnType<typeof listActiveProducts>> = [];

  try {
    const collection = await getCollectionBySlug({
      ventureId,
      slug: FEATURED_COLLECTION_SLUG,
    });
    products = await getProductsForCollection(collection);
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
  }

  if (products.length === 0) {
    products = (await listActiveProducts(ventureId)).slice(0, 8);
  }

  if (products.length === 0) {
    return null;
  }

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Featured</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            slug={product.slug}
            name={product.name}
            priceCents={product.priceCents}
            imageUrl={images[index]}
          />
        ))}
      </div>
    </section>
  );
}
