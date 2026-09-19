"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { cartLineId, type CartLineItem } from "./types";

const STORAGE_KEY = "sweetoh-cart";

type Listener = () => void;

function loadItems(): CartLineItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLineItem[]) : [];
    // Carts saved before variants existed have no lineId.
    return parsed.map((line) => ({
      ...line,
      lineId: line.lineId ?? cartLineId(line.productId, line.color, line.size),
    }));
  } catch {
    return [];
  }
}

const EMPTY_CART: CartLineItem[] = [];

function createCartStore() {
  let items = loadItems();
  const listeners = new Set<Listener>();

  function emit() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    listeners.forEach((listener) => listener());
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return items;
    },
    getServerSnapshot(): CartLineItem[] {
      // Must be the same reference every call, or React loops re-rendering.
      return EMPTY_CART;
    },
    addItem(item: Omit<CartLineItem, "quantity" | "lineId">, quantity = 1) {
      const lineId = cartLineId(item.productId, item.color, item.size);
      const existing = items.find((line) => line.lineId === lineId);

      items = existing
        ? items.map((line) =>
            line.lineId === lineId
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          )
        : [...items, { ...item, lineId, quantity }];

      emit();
    },
    removeItem(lineId: string) {
      items = items.filter((line) => line.lineId !== lineId);
      emit();
    },
    setQuantity(lineId: string, quantity: number) {
      items =
        quantity <= 0
          ? items.filter((line) => line.lineId !== lineId)
          : items.map((line) =>
              line.lineId === lineId ? { ...line, quantity } : line,
            );
      emit();
    },
    clearCart() {
      items = [];
      emit();
    },
  };
}

const cartStore = createCartStore();

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  subtotalCents: number;
  addItem: (item: Omit<CartLineItem, "quantity" | "lineId">, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((total, line) => total + line.quantity, 0);
    const subtotalCents = items.reduce(
      (total, line) => total + line.priceCents * line.quantity,
      0,
    );

    return {
      items,
      itemCount,
      subtotalCents,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      setQuantity: cartStore.setQuantity,
      clearCart: cartStore.clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
