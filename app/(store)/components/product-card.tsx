import Link from "next/link";
import { formatPrice } from "@/lib/shared/format";
import { AddToCartButton } from "./add-to-cart-button";
import { hasVariants, type VariantOptions } from "@/lib/domains/catalog/variants";

type ProductCardProps = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  variantOptions?: VariantOptions | null;
};

export function ProductCard({
  productId,
  slug,
  name,
  priceCents,
  imageUrl,
  variantOptions,
}: ProductCardProps) {
  const options = hasVariants(variantOptions) ? variantOptions : null;
  return (
    <article className="group flex flex-col">
      <Link
        href={`/products/${slug}`}
        className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem]"
        style={{ background: "var(--so-dark)" }}
      >
        <span className="so-tag absolute left-3 top-3 z-10 -rotate-2" style={{ background: "var(--so-frangipani)", color: "var(--so-ink)" }}>
          Made to order
        </span>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="relative flex h-full w-full items-end p-4" style={{ background: "var(--so-sand)" }}>
            <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(36,29,20,.07)" }} />
            <span className="so-display relative text-xl text-[color:var(--so-cream)]">{name}</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 pt-4">
        <div className="space-y-1">
          <Link
            href={`/products/${slug}`}
            className="so-display block text-lg leading-snug text-[color:var(--so-cream)] hover:text-[color:var(--so-hibiscus)]"
          >
            {name}
          </Link>
          <p className="text-sm font-semibold text-[color:var(--so-cream)]">{formatPrice(priceCents)}</p>
          {options?.colors.length ? (
            <div className="flex flex-wrap items-center gap-1 pt-1" aria-label={`${options.colors.length} colors`}>
              {options.colors.slice(0, 8).map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.15)" }}
                />
              ))}
              {options.colors.length > 8 ? (
                <span className="text-xs so-muted">+{options.colors.length - 8}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-auto">
          {options ? (
            // Color and size are chosen on the product page.
            <Link href={`/products/${slug}`} className="so-btn-primary block w-full text-center">
              Choose options
            </Link>
          ) : (
            <AddToCartButton
              productId={productId}
              slug={slug}
              name={name}
              priceCents={priceCents}
              imageUrl={imageUrl}
            />
          )}
        </div>
      </div>
    </article>
  );
}
