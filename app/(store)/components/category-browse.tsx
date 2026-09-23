import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getStorefrontNavCollections } from "@/lib/domains/catalog/service";

/** Each aisle gets its own island color — fixed by slug so the shop always looks the same. */
export const CATEGORY_STYLE: Record<string, { bg: string; fg: string; ink: string }> = {
  apparel: { bg: "var(--so-lagoon)", fg: "#fbf6ea", ink: "rgba(255,255,255,.14)" },
  kids: { bg: "var(--so-sun)", fg: "var(--so-ink)", ink: "rgba(36,29,20,.10)" },
  home: { bg: "var(--so-sand)", fg: "var(--so-ink)", ink: "rgba(36,29,20,.08)" },
  drinkware: { bg: "var(--so-coral)", fg: "#fff8f1", ink: "rgba(255,255,255,.16)" },
  accessories: { bg: "var(--so-palm)", fg: "#f3f0e2", ink: "rgba(255,255,255,.12)" },
  custom: { bg: "var(--so-reef)", fg: "#eef4f7", ink: "rgba(255,255,255,.14)" },
};
const DEFAULT_STYLE = { bg: "var(--so-dark)", fg: "var(--so-cream)", ink: "rgba(36,29,20,.08)" };

export function CategoryTiles({ categories }: { categories: Awaited<ReturnType<typeof getStorefrontNavCollections>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {categories.map((item) => {
        const style = CATEGORY_STYLE[item.slug] ?? DEFAULT_STYLE;
        return (
          <Link
            key={item.slug}
            href={`/collections/${item.slug}`}
            className="so-lift group relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-[1.25rem] p-4 sm:min-h-[12.5rem] sm:rounded-[1.5rem] sm:p-6"
            style={{ background: style.bg, color: style.fg }}
          >
            <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: style.ink }} />
            <div className="relative flex items-start justify-between gap-3">
              <span className="so-tag text-[10px] sm:text-[0.7rem]" style={{ background: "rgba(255,255,255,.22)", color: style.fg }}>
                {item.activeCount > 0 ? `${item.activeCount} ${item.activeCount === 1 ? "piece" : "pieces"}` : "Made to order"}
              </span>
              <ArrowUpRight className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={22} />
            </div>
            <div className="relative">
              <h3 className="so-display text-2xl sm:text-4xl">{item.name}</h3>
              <p className="mt-2 hidden max-w-[18rem] text-sm opacity-85 sm:block">{item.blurb}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export async function CategoryBrowse({ ventureId }: { ventureId: string }) {
  const categories = await getStorefrontNavCollections(ventureId);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="so-eyebrow">Shop by aisle</p>
          <h2 className="so-display mt-3 text-4xl text-[color:var(--so-cream)] sm:text-5xl">
            Find your <em className="font-normal" style={{ color: "var(--so-lagoon)" }}>piece</em>.
          </h2>
        </div>
        <Link href="/collections" className="so-link shrink-0 text-sm so-muted">All categories</Link>
      </div>
      <div className="mt-10">
        <CategoryTiles categories={categories} />
      </div>
    </section>
  );
}
