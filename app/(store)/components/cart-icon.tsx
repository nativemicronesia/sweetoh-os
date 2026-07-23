"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";

export function CartIcon() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative text-sm font-medium text-neutral-700 hover:text-rose-700"
    >
      Cart
      {itemCount > 0 ? (
        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-700 px-1.5 text-xs font-semibold text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
