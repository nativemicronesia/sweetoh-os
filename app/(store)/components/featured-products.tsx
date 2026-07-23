import {
  getCollectionBySlug,
  getPrimaryProductImageUrl,
  getProductsForCollection,
} from "@/lib/domains/catalog/service";
import { NotFoundError } from "@/lib/shared/errors";
import { ProductCard } from "./product-card";

const FEATURED_COLLECTION_SLUG = "featured";

/**
 * Renders nothing if no "featured" collection exists yet — curating one is a
 * manual step for now (no admin UI for it), not a blocker for shipping the
 * homepage. See lib/domains/catalog/service.ts's collection/collectionProduct
 * tables for how to create one.
 */
export async function FeaturedProducts({ ventureId }: { ventureId: string }) {
  let collection: Awaited<ReturnType<typeof getCollectionBySlug>>;
  try {
    collection = await getCollectionBySlug({ ventureId, slug: FEATURED_COLLECTION_SLUG });
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }

  const products = await getProductsForCollection(collection);
  if (products.length === 0) return null;

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
