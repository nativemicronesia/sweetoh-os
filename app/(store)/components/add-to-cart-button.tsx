"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/cart-context";

type AddToCartButtonProps = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        addItem(props);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-800"
    >
      {added ? "Added!" : "Add to cart"}
    </button>
  );
}
