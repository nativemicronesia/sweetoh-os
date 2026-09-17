import Link from "next/link";
import { getStorefrontNavCollections } from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";

export default async function CollectionsIndexPage() {
  const venture = await getDefaultVenture();
  const categories = await getStorefrontNavCollections(venture.id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">Shop</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          Categories
        </h1>
        <p className="mt-3 max-w-xl text-sm so-muted">
          Browse everything Sweet&apos;Oh prints — or{" "}
          <Link href="/products" className="so-link">Browse products</Link>
          .
        </p>
      </div>

      <div
        className="grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{ background: "var(--so-border)" }}
      >
        {categories.map((item) => (
          <Link
            key={item.slug}
            href={`/collections/${item.slug}`}
            className="group block px-6 py-8 transition-colors"
            style={{ background: "var(--so-dark)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="so-display text-xl text-[color:var(--so-cream)] group-hover:text-[color:var(--so-gold)]">
                {item.name}
              </h2>
              <span className="text-xs tabular-nums so-muted">
                {item.activeCount}
              </span>
            </div>
            <p className="mt-3 text-sm so-muted">{item.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
