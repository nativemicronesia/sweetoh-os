import {
  getPrimaryProductImageUrl,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ProductCard } from "../components/product-card";

export default async function StorefrontPage() {
  const venture = await getDefaultVenture();
  const products = await listActiveProducts(venture.id);
  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-rose-700 px-8 py-16 text-center text-white">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Custom confections, made with love.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-rose-50">
          Sweet&apos;Oh designs and prints one-of-a-kind creations, on demand.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Shop Sweet&apos;Oh</h2>
        {products.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Products are coming soon — check back shortly.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>
    </div>
  );
}
