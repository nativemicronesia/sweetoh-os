"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";

export function CartView() {
  const { items, subtotalCents, removeItem, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-12 sm:px-8 sm:py-16">
        <p className="so-eyebrow">Cart</p>
        <h1 className="so-display text-3xl text-[color:var(--so-cream)] sm:text-4xl">
          Your cart is empty
        </h1>
        <Link href="/collections" className="so-btn-primary inline-flex">
          Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">Cart</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-4xl">
          Ready to print
        </h1>
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-wrap items-center gap-4 border-t py-5"
            style={{ borderColor: "var(--so-border)" }}
          >
            <div
              className="h-20 w-20 flex-shrink-0 overflow-hidden"
              style={{ background: "var(--so-surface)" }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-[10rem] flex-1">
              <p className="font-medium text-[color:var(--so-cream)]">{item.name}</p>
              <p className="text-sm so-muted">{formatPrice(item.priceCents)}</p>
            </div>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(event) =>
                setQuantity(item.productId, Number(event.target.value))
              }
              className="w-16 border bg-transparent px-2 py-1 text-sm text-[color:var(--so-cream)]"
              style={{ borderColor: "var(--so-border)" }}
            />

            <p className="w-20 text-right text-sm font-medium text-[color:var(--so-cream)]">
              {formatPrice(item.priceCents * item.quantity)}
            </p>

            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-sm so-muted hover:text-[color:var(--so-gold)]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div
        className="flex items-center justify-between border px-6 py-4"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm so-muted">Subtotal</p>
        <p className="text-lg font-semibold text-[color:var(--so-cream)]">
          {formatPrice(subtotalCents)}
        </p>
      </div>

      <Link href="/checkout" className="so-btn-primary block w-full text-center">
        Proceed to checkout
      </Link>
    </div>
  );
}
