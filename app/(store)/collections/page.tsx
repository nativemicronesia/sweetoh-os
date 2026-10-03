import Link from "next/link";
import { getStorefrontNavCollections } from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { CategoryTiles } from "../components/category-browse";

export default async function CollectionsIndexPage() {
  const venture = await getDefaultVenture();
  const categories = await getStorefrontNavCollections(venture.id);

  return (
    <div className="sx-paper"><div className="sx-wrap space-y-10 py-12 sm:py-16">
      <div>
        <p className="sx-label sx-mono">Shop what&apos;s ready</p>
        <h1 className="sx-h1 mt-3" style={{ fontSize: "clamp(2.4rem, 6vw, 4.6rem)" }}>
          Already made. <span className="sx-em">Yours to take.</span>
        </h1>
        <p className="sx-lede mt-4">
          Browse the pieces we&apos;ve finished, or{" "}
          <Link href="/products" className="so-link">see every product</Link>
          . Want one changed? Every piece can be made yours.
        </p>
      </div>

      <CategoryTiles categories={categories} />
    </div></div>
  );
}
