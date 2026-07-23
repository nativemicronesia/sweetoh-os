import { listActiveProducts } from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { CreateView } from "./create-view";

export default async function CreatePage() {
  const venture = await getDefaultVenture();
  const products = await listActiveProducts(venture.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Design something with Sweet&apos;Oh AI</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pick what you&apos;re putting it on, then describe it, speak it, or show us a
          reference photo.
        </p>
      </div>
      <CreateView
        products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))}
      />
    </div>
  );
}
