import Link from "next/link";
import { getStorefrontNavCollections } from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { CategoryTiles } from "../components/category-browse";

export default async function CollectionsIndexPage() {
  const venture = await getDefaultVenture();
  const categories = await getStorefrontNavCollections(venture.id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">Shop</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          Find your <em className="font-normal" style={{ color: "var(--so-hibiscus)" }}>piece</em>.
        </h1>
        <p className="mt-3 max-w-xl text-sm so-muted">
          Browse everything Sweet&apos;Oh prints — or{" "}
          <Link href="/products" className="so-link">Browse products</Link>
          .
        </p>
      </div>

      <CategoryTiles categories={categories} />
    </div>
  );
}
