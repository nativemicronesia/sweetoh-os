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
    <section className="sx-section">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="sx-label sx-mono">Ready to ship</p>
          <h2 className="sx-h2 mt-3">
            Made, and <span className="sx-em">ready.</span>
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
  { label: "Island tees", bg: "var(--sx-reef)", fg: "#f4ecdd" },
  { label: "Tumblers", bg: "var(--sx-vermilion-deep)", fg: "#fff6ea" },
  { label: "For the little ones", bg: "var(--sx-yellow)", fg: "#16120d" },
  { label: "Gifts", bg: "#16120d", fg: "#f4ecdd" },
] as const;

/** Before the shop's first products are published: an honest "on the press" shelf. */
function FirstDrop() {
  return (
    <section className="sx-section">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="sx-label sx-mono">Ready to ship</p>
          <h2 className="sx-h2 mt-3">First pieces <span className="sx-em">landing soon.</span></h2>
          <p className="sx-lede mt-4">We&apos;re photographing the first ready-made pieces now. Don&apos;t want to wait? Bring us an idea and we&apos;ll make yours first.</p>
        </div>
        <Link href="/custom" className="so-btn-primary">Bring us an idea</Link>
      </div>
      <div className="mt-9 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {DROP_TILES.map((t, i) => (
          <div key={t.label} className="sx-drop" style={{ background: t.bg, color: t.fg }}>
            <span className="sx-mono sx-drop-tag">Coming soon</span>
            <span className="sx-h3 relative">{t.label}</span>
            <svg viewBox="0 0 100 100" aria-hidden className="sx-drop-art"><g fill="currentColor" opacity=".16">{Array.from({ length: 12 }, (_, k) => <circle key={k} cx={50 + Math.cos((k / 12) * 6.283 + i) * 34} cy={50 + Math.sin((k / 12) * 6.283 + i) * 34} r={3 + (k % 3) * 2} />)}<circle cx="50" cy="50" r="16" /></g></svg>
          </div>
        ))}
      </div>
    </section>
  );
}
