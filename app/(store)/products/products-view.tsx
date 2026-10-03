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
  variantOptions?: import("@/lib/domains/catalog/variants").VariantOptions | null;
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
    <div className="sx-paper"><div className="sx-wrap space-y-10 py-12 sm:py-16">
      <div>
        <p className="sx-label sx-mono">Shop what&apos;s ready</p>
        <h1 className="sx-h1 mt-3" style={{ fontSize: "clamp(2.4rem, 6vw, 4.6rem)" }}>
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
          className="sx-chip"
          aria-current={!category ? "page" : undefined}
          style={!category ? { background: "var(--so-ink)", color: "var(--so-black)" } : undefined}
        >
          All
        </Link>
        {AUTOMATIC_COLLECTIONS.map((item) => (
          <Link
            key={item.slug}
            href={`/products?category=${item.category}`}
            className="sx-chip"
            aria-current={category === item.category ? "page" : undefined}
            style={category === item.category ? { background: "var(--so-ink)", color: "var(--so-black)" } : undefined}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sx-card" style={{ padding: "clamp(1.4rem, 4vw, 2.4rem)", maxWidth: "40rem" }}>
          <p className="sx-mono" style={{ color: "var(--so-gold)" }}>First pieces landing soon</p>
          <h2 className="sx-h3" style={{ marginTop: "0.6rem", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>Nothing on the shelf yet, but we can make yours.</h2>
          <p style={{ marginTop: "0.8rem", color: "var(--so-cream-dim)" }}>Bring us an idea, or look at what we can make.</p>
          <div style={{ marginTop: "1.3rem", display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
            <Link href="/custom" className="so-btn-primary">Bring us an idea</Link>
            <Link href="/make" className="so-btn-ghost">What we make</Link>
          </div>
        </div>
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
              variantOptions={product.variantOptions}
            />
          ))}
        </div>
      )}
    </div></div>
  );
}
