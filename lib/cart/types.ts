export type CartLineItem = {
  /** productId plus color/size — one line per variant. */
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  color?: string | null;
  size?: string | null;
  quantity: number;
};

export function cartLineId(productId: string, color?: string | null, size?: string | null) {
  return [productId, color ?? "", size ?? ""].join("|");
}
