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
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-12 sm:px-8 sm:py-16">
        <p className="so-eyebrow">Checkout</p>
        <h1 className="so-display text-3xl text-[color:var(--so-cream)]">Your cart is empty</h1>
        <Link href="/collections" className="so-btn-primary inline-flex">
          Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
      <div>
        <p className="so-eyebrow">Checkout</p>
        <h1 className="so-display mt-3 text-3xl text-[color:var(--so-cream)] sm:text-4xl">
          Confirm &amp; pay
        </h1>
        <p className="mt-2 text-sm so-muted">
          After payment we print, pack, and ship. Then you wait for the package.
        </p>
      </div>

      {!stripeReady ? (
        <p
          className="border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--so-gold-dim)",
            background: "rgba(201,168,76,0.08)",
            color: "var(--so-cream)",
          }}
        >
          Checkout is not live yet — Stripe keys are not configured. Add STRIPE_SECRET_KEY
          and STRIPE_WEBHOOK_SECRET to enable payment.
        </p>
      ) : null}

      <ul className="divide-y border" style={{ borderColor: "var(--so-border)" }}>
        {items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "var(--so-dark)" }}
          >
            <div>
              <p className="font-medium text-[color:var(--so-cream)]">{item.name}</p>
              <p className="text-sm so-muted">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium text-[color:var(--so-cream)]">
              {formatPrice(item.priceCents * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div
        className="flex items-center justify-between border px-6 py-4"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm so-muted">Total due</p>
        <p className="text-lg font-semibold text-[color:var(--so-cream)]">
          {formatPrice(subtotalCents)}
        </p>
      </div>

      {error ? <p className="text-sm text-[color:var(--so-rose)]">{error}</p> : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={pending || !stripeReady}
        className="so-btn-primary w-full disabled:cursor-not-allowed"
      >
        {pending ? "Redirecting to secure payment…" : "Pay with card"}
      </button>

      <p className="text-center text-xs so-muted">
        Payment is completed on Stripe&apos;s secure checkout page.
      </p>

      <Link href="/cart" className="so-link block text-center text-sm so-muted">
        Back to cart
      </Link>
    </div>
  );
}
