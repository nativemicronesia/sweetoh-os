export type CheckoutCartItemMetadata = {
  productId: string;
  productName: string;
  priceCentsAtPurchase: number;
  quantity: number;
  color?: string | null;
  size?: string | null;
};
