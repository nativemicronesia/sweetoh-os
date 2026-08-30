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
      className="so-btn-primary w-full"
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
