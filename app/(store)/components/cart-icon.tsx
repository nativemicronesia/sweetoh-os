"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";

export function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
      className="relative inline-flex h-11 items-center gap-2 rounded-[3px] border-[1.5px] px-3.5 text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5"
      style={{ borderColor: "var(--so-ink)", background: itemCount > 0 ? "var(--so-ink)" : "var(--so-surface)", color: itemCount > 0 ? "var(--so-black)" : "var(--so-cream)" }}
    >
      <ShoppingBag size={17} aria-hidden />
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums" style={{ background: "var(--sx-vermilion)", color: "#fff" }}>
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
