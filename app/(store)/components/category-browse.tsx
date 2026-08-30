import Link from "next/link";
import { getStorefrontNavCollections } from "@/lib/domains/catalog/service";

export async function CategoryBrowse({ ventureId }: { ventureId: string }) {
  const categories = await getStorefrontNavCollections(ventureId);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="so-eyebrow">Shop</p>
          <h2 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-4xl">
            Aisles
          </h2>
        </div>
        <Link href="/collections" className="so-link shrink-0 text-sm so-muted">
          All categories
        </Link>
      </div>

      <div className="mt-10 grid gap-px sm:grid-cols-2 lg:grid-cols-3"
        style={{ background: "var(--so-border)" }}
      >
        {categories.map((item) => (
          <Link
            key={item.slug}
            href={`/collections/${item.slug}`}
            className="group block px-5 py-6 transition-colors"
            style={{ background: "var(--so-dark)" }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="so-display text-lg text-[color:var(--so-cream)] group-hover:text-[color:var(--so-gold)]">
                {item.name}
              </h3>
              <span className="text-xs tabular-nums so-muted">
                {item.activeCount}
              </span>
            </div>
            <p className="mt-2 text-sm so-muted">{item.blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
