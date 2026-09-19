import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AUTOMATIC_COLLECTIONS,
  getCollectionBySlug,
  getPrimaryProductImageUrl,
  getProductsForCollection,
  isProductCategory,
  listActiveProductsByCategory,
} from "@/lib/domains/catalog";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { NotFoundError } from "@/lib/shared/errors";
import { ProductCard } from "../../components/product-card";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const venture = await getDefaultVenture();
  const aisle = AUTOMATIC_COLLECTIONS.find((item) => item.slug === slug);

  let title = aisle?.name ?? slug;
  let blurb = aisle?.blurb ?? "Products in this category.";
  let products: Awaited<ReturnType<typeof listActiveProductsByCategory>> = [];

  try {
    const collection = await getCollectionBySlug({
      ventureId: venture.id,
      slug,
    });
    title = collection.name;
    blurb = collection.description?.trim() || blurb;
    products = await getProductsForCollection(collection);
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      throw error;
    }
    if (aisle && isProductCategory(aisle.category)) {
      products = await listActiveProductsByCategory({
        ventureId: venture.id,
        category: aisle.category,
      });
    } else if (isProductCategory(slug)) {
      products = await listActiveProductsByCategory({
        ventureId: venture.id,
        category: slug,
      });
    } else {
      notFound();
    }
  }

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">
          <Link href="/collections" className="so-link">
            Categories
          </Link>
        </p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm so-muted">{blurb}</p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm so-muted">
          Nothing in this aisle yet.{" "}
          <Link href="/products" className="so-link">Browse products</Link>{" "}
          or{" "}
          <Link href="/products" className="so-link text-[color:var(--so-cream)]">
            browse all products
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              productId={product.id}
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              imageUrl={images[index]}
              variantOptions={product.variantOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
