"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";

export function CartView() {
  const { items, subtotalCents, removeItem, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Cart</h1>
        <p className="text-sm text-neutral-500">Your cart is empty.</p>
        <Link href="/storefront" className="text-sm text-rose-700 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cart</h1>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center gap-4 px-6 py-4">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-neutral-100">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex-1">
              <p className="font-medium text-neutral-900">{item.name}</p>
              <p className="text-sm text-neutral-500">{formatPrice(item.priceCents)}</p>
            </div>

            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(event) =>
                setQuantity(item.productId, Number(event.target.value))
              }
              className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
            />

            <p className="w-20 text-right text-sm font-medium">
              {formatPrice(item.priceCents * item.quantity)}
            </p>

            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-sm text-neutral-400 hover:text-red-700"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-6 py-4">
        <p className="text-sm text-neutral-600">Subtotal</p>
        <p className="text-lg font-semibold">{formatPrice(subtotalCents)}</p>
      </div>

      <Link
        href="/checkout"
        className="block w-full rounded bg-rose-700 px-6 py-3 text-center text-sm font-medium text-white hover:bg-rose-800"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
