"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isProductCategory } from "@/lib/domains/catalog/categories";
import { AUTOMATIC_COLLECTIONS } from "@/lib/domains/catalog/collections-config";
import { ProductCard } from "../components/product-card";

type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  category: string;
  imageUrl: string | null;
};

/**
 * Client-side category filter over an already-fetched, unfiltered product
 * list — keeps the server page free of `searchParams`, which is what let it
 * stay cacheable (previously every category click re-ran the DB query on
 * the server, on every click, with no caching at all).
 */
export function ProductsView({ products }: { products: ProductListItem[] }) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && isProductCategory(categoryParam) ? categoryParam : null;

  const activeLabel = category
    ? AUTOMATIC_COLLECTIONS.find((item) => item.category === category)?.name
    : null;

  const filtered = category
    ? products.filter((product) => product.category === category)
    : products;

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

      {filtered.length === 0 ? (
        <p className="text-sm so-muted">
          Products are coming soon — or{" "}
          <Link href="/studio" className="so-link text-[color:var(--so-cream)]">
            create your own
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              productId={product.id}
              slug={product.slug}
              name={product.name}
              priceCents={product.priceCents}
              imageUrl={product.imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
