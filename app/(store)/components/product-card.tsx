import Link from "next/link";
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
    <article className="group flex flex-col">
      <Link
        href={`/products/${slug}`}
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: "var(--so-surface)" }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs so-muted">
            Image coming
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 pt-4">
        <div className="space-y-1">
          <Link
            href={`/products/${slug}`}
            className="so-link block text-sm font-medium text-[color:var(--so-cream)]"
          >
            {name}
          </Link>
          <p className="text-sm so-muted">{formatPrice(priceCents)}</p>
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
    </article>
  );
}
