import { formatPrice } from "@/lib/shared/format";
import { AddToCartButton } from "./add-to-cart-button";

type ProductCardProps = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
};

export function ProductCard({
  productId,
  slug,
  name,
  priceCents,
  imageUrl,
}: ProductCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="aspect-square bg-neutral-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
            No image yet
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">{name}</p>
          <p className="text-sm text-neutral-600">{formatPrice(priceCents)}</p>
        </div>
        <div className="mt-auto">
          <AddToCartButton
            productId={productId}
            slug={slug}
            name={name}
            priceCents={priceCents}
            imageUrl={imageUrl}
          />
        </div>
      </div>
    </div>
  );
}
