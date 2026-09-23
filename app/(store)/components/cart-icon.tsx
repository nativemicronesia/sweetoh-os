"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";

export function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="so-link relative text-[13px] sm:text-sm text-[color:var(--so-mist)]"
    >
      Cart
      {itemCount > 0 ? (
        <span
          className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-[10px] font-semibold tabular-nums"
          style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
