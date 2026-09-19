"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";
import {
  hasVariants,
  unitPriceCents,
  type VariantOptions,
} from "@/lib/domains/catalog/variants";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    priceCents: number;
    variantOptions: VariantOptions | null;
  };
  images: string[];
  colorImages: Record<string, string>;
};

/** Gallery + color/size pickers + add to cart for a storefront product. */
export function ProductBuy({ product, images, colorImages }: Props) {
  const { addItem } = useCart();
  const options = hasVariants(product.variantOptions) ? product.variantOptions : null;
  const colors = options?.colors ?? [];
  const sizes = options?.sizes ?? [];
  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [shown, setShown] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [needSize, setNeedSize] = useState(false);

  const colorImage = color ? colorImages[color] : undefined;
  const main = shown ?? colorImage ?? images[0] ?? null;
  const gallery = [...new Set([colorImage, ...images].filter(Boolean) as string[])];
  const price = unitPriceCents(product.priceCents, options, size);
  const fromPrice = sizes.length
    ? Math.min(...sizes.map((s) => unitPriceCents(product.priceCents, options, s)))
    : product.priceCents;

  function add() {
    if (sizes.length && !size) {
      setNeedSize(true);
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceCents: price,
      imageUrl: colorImage ?? images[0] ?? null,
      color,
      size,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="space-y-3">
        <div className="aspect-[4/5] overflow-hidden" style={{ background: "var(--so-surface)" }}>
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={main} alt={`${product.name}${color ? ` — ${color}` : ""}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm so-muted">Image coming</div>
          )}
        </div>
        {gallery.length > 1 ? (
          <div className="grid grid-cols-5 gap-2">
            {gallery.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setShown(url)}
                aria-label="Show image"
                aria-pressed={main === url}
                className="pdp-thumb"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col justify-center space-y-8 lg:py-8">
        <div>
          <p className="so-eyebrow">Sweet&apos;Oh Creations</p>
          <h1 className="so-display mt-4 text-3xl text-[color:var(--so-cream)] sm:text-5xl">{product.name}</h1>
          <p className="mt-4 text-lg so-muted">
            {size || !sizes.length ? formatPrice(price) : `From ${formatPrice(fromPrice)}`}
          </p>
        </div>

        {colors.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--so-cream)]">
              Color: <strong>{color}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.name}
                  onClick={() => {
                    setColor(c.name);
                    setShown(null);
                  }}
                  className="pdp-swatch"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[color:var(--so-cream)]">
              Size{size ? <>: <strong>{size}</strong></> : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const extra = options?.sizeUpchargeCents[s] ?? 0;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={size === s}
                    onClick={() => {
                      setSize(s);
                      setNeedSize(false);
                    }}
                    className="pdp-size"
                  >
                    {s}
                    {extra ? <small>+{formatPrice(extra)}</small> : null}
                  </button>
                );
              })}
            </div>
            {needSize ? (
              <p role="alert" className="text-sm" style={{ color: "var(--so-rose)" }}>
                Choose a size first.
              </p>
            ) : null}
          </div>
        )}

        {product.description ? (
          <p className="max-w-md whitespace-pre-line text-sm leading-relaxed so-muted sm:text-base">
            {product.description}
          </p>
        ) : null}

        <div className="max-w-sm space-y-4">
          <button type="button" onClick={add} className="so-btn-primary w-full">
            {added ? "Added" : "Add to cart"}
          </button>
          <p className="text-xs leading-relaxed so-muted">
            Printed on demand · ships after press. Made for Micronesia — and wherever you are.
          </p>
        </div>
      </div>
    </div>
  );
}
