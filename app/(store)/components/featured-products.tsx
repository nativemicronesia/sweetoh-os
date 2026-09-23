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
    return <FirstDrop />;
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="so-eyebrow">Fresh off the press</p>
          <h2 className="so-display mt-3 text-4xl text-[color:var(--so-cream)] sm:text-5xl">
            Now <em className="font-normal" style={{ color: "var(--so-lagoon)" }}>printing</em>
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

const DROP_TILES = [
  { label: "Island tees", bg: "var(--so-lagoon)", fg: "#fbf6ea", ink: "rgba(255,255,255,.14)" },
  { label: "Tumblers", bg: "var(--so-coral)", fg: "#fff8f1", ink: "rgba(255,255,255,.16)" },
  { label: "For the little ones", bg: "var(--so-sun)", fg: "var(--so-ink)", ink: "rgba(36,29,20,.1)" },
  { label: "Gifts", bg: "var(--so-reef)", fg: "#eef4f7", ink: "rgba(255,255,255,.14)" },
] as const;

/** Before the shop's first products are published: an honest "on the press" shelf. */
function FirstDrop() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="so-eyebrow">The first drop</p>
          <h2 className="so-display mt-3 text-4xl text-[color:var(--so-cream)] sm:text-5xl">
            On the <em className="font-normal" style={{ color: "var(--so-lagoon)" }}>press</em> now.
          </h2>
          <p className="mt-4 max-w-md so-muted">Our first pieces are being photographed and listed. Want something now? We&apos;ll make it for you.</p>
        </div>
        <Link href="/custom" className="so-btn-primary">Request a custom order</Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DROP_TILES.map((t, i) => (
          <div key={t.label} className="relative flex aspect-[4/5] items-end overflow-hidden rounded-[1.4rem] p-5" style={{ background: t.bg, color: t.fg }}>
            <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: t.ink }} />
            <span className="so-tag absolute left-4 top-4" style={{ background: "rgba(255,255,255,.24)", color: t.fg, transform: `rotate(${i % 2 ? 3 : -3}deg)` }}>Coming soon</span>
            <span className="so-display relative text-2xl sm:text-3xl">{t.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
