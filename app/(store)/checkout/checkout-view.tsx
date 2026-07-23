"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createCheckoutSessionAction } from "./actions";
import { useCart } from "@/lib/cart/cart-context";
import { formatPrice } from "@/lib/shared/format";

type CheckoutViewProps = {
  stripeReady: boolean;
};

export function CheckoutView({ stripeReady }: CheckoutViewProps) {
  const { items, subtotalCents } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction(
        items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      );

      if (result?.error) {
        setError(result.error);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-neutral-500">Your cart is empty.</p>
        <Link href="/storefront" className="text-sm text-rose-700 hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {!stripeReady ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Checkout is not live yet — Stripe keys are not configured for this
          deployment. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable
          payment.
        </p>
      ) : null}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium text-neutral-900">{item.name}</p>
              <p className="text-sm text-neutral-500">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">
              {formatPrice(item.priceCents * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-6 py-4">
        <p className="text-sm text-neutral-600">Total due</p>
        <p className="text-lg font-semibold">{formatPrice(subtotalCents)}</p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={pending || !stripeReady}
        className="w-full rounded bg-rose-700 px-6 py-3 text-sm font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Redirecting to secure payment..." : "Pay with card"}
      </button>

      <p className="text-center text-xs text-neutral-500">
        Payment is completed on Stripe&apos;s secure checkout page.
      </p>

      <Link href="/cart" className="block text-center text-sm text-neutral-500 hover:underline">
        Back to cart
      </Link>
    </div>
  );
}
