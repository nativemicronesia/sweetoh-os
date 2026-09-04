import Link from "next/link";
import {
  AUTOMATIC_COLLECTIONS,
  getPrimaryProductImageUrl,
  isProductCategory,
  listActiveProducts,
  listActiveProductsByCategory,
} from "@/lib/domains/catalog";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ProductCard } from "../components/product-card";

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const { category: categoryParam } = await searchParams;
  const venture = await getDefaultVenture();
  const category =
    categoryParam && isProductCategory(categoryParam) ? categoryParam : null;

  const products = category
    ? await listActiveProductsByCategory({
        ventureId: venture.id,
        category,
      })
    : await listActiveProducts(venture.id);

  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  const activeLabel = category
    ? AUTOMATIC_COLLECTIONS.find((item) => item.category === category)?.name
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">Shop</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          {activeLabel ? activeLabel : "All products"}
        </h1>
        <p className="mt-3 max-w-xl text-sm so-muted">
          {activeLabel
            ? "Everything in this aisle, ready to order."
            : "Every blank and design currently for sale."}{" "}
          <Link href="/collections" className="so-link text-[color:var(--so-cream)]">
            Shop by category
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/products"
          className="border px-3 py-1.5 text-xs transition-colors"
          style={
            !category
              ? { borderColor: "var(--so-gold)", background: "var(--so-gold)", color: "var(--so-ink)" }
              : { borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }
          }
        >
          All
        </Link>
        {AUTOMATIC_COLLECTIONS.map((item) => (
          <Link
            key={item.slug}
            href={`/products?category=${item.category}`}
            className="border px-3 py-1.5 text-xs transition-colors"
            style={
              category === item.category
                ? { borderColor: "var(--so-gold)", background: "var(--so-gold)", color: "var(--so-ink)" }
                : { borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }
            }
          >
            {item.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-sm so-muted">
          Products are coming soon — or{" "}
          <Link href="/studio" className="so-link text-[color:var(--so-cream)]">
            create your own
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
