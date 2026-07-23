import {
  getPrimaryProductImageUrl,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ProductCard } from "../components/product-card";

export default async function ProductsPage() {
  const venture = await getDefaultVenture();
  const products = await listActiveProducts(venture.id);
  const images = await Promise.all(
    products.map((item) => getPrimaryProductImageUrl(item.id)),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">All Sweet&apos;Oh products</h1>
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
    </div>
  );
}
