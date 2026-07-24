import Link from "next/link";
import { getOrderByCheckoutSessionId } from "@/lib/domains/commerce/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { NotFoundError } from "@/lib/shared/errors";
import { formatPrice } from "@/lib/shared/format";
import { ClearCartOnMount } from "./clear-cart-on-mount";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Order confirmation</h1>
        <p className="text-sm text-neutral-500">Missing checkout session.</p>
      </div>
    );
  }

  const venture = await getDefaultVenture();

  let result;
  try {
    result = await getOrderByCheckoutSessionId({ ventureId: venture.id, sessionId });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="space-y-4">
          <ClearCartOnMount />
          <h1 className="text-2xl font-semibold">Processing your order...</h1>
          <p className="text-sm text-neutral-500">
            Payment received — your order is being finalized. Refresh this page in a
            few seconds. You&apos;ll also receive a confirmation email.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { order, lineItems } = result;

  return (
    <div className="space-y-6">
      <ClearCartOnMount />

      <div>
        <h1 className="text-2xl font-semibold">Thank you for your order!</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A confirmation email has been sent to {order.customerEmail}.
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {lineItems.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-neutral-500">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">
              {formatPrice(item.priceCentsAtPurchase * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-6 py-4">
        <p className="text-sm text-neutral-600">Total</p>
        <p className="text-lg font-semibold">{formatPrice(order.totalCents)}</p>
      </div>

      <Link href="/products" className="text-sm text-rose-700 hover:underline">
        Continue shopping
      </Link>
    </div>
  );
}
