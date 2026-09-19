import Link from "next/link";
import {
  getCollectionBySlug,
  getPrimaryProductImageUrl,
  getProductsForCollection,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { NotFoundError } from "@/lib/shared/errors";
import { ProductCard } from "./product-card";

const FEATURED_COLLECTION_SLUG = "featured";

export async function getFeaturedProductsForHome(ventureId: string) {
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

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return products.map((product, index) => ({
    product,
    imageUrl: images[index] ?? null,
  }));
}

export async function FeaturedProducts({
  ventureId,
  items,
}: {
  ventureId: string;
  items?: Awaited<ReturnType<typeof getFeaturedProductsForHome>>;
}) {
  const resolved = items ?? (await getFeaturedProductsForHome(ventureId));

  if (resolved.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="so-eyebrow">Featured</p>
          <h2 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-4xl">
            Now printing
          </h2>
        </div>
        <Link href="/products" className="so-link shrink-0 text-sm so-muted">
          All products
        </Link>
      </div>
      <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {resolved.map(({ product, imageUrl }) => (
          <ProductCard
            key={product.id}
            productId={product.id}
            slug={product.slug}
            name={product.name}
            priceCents={product.priceCents}
            imageUrl={imageUrl}
            variantOptions={product.variantOptions}
          />
        ))}
      </div>
    </section>
  );
}
