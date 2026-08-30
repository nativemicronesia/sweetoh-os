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
      <div className="mx-auto w-full max-w-6xl space-y-4 px-5 py-16 sm:px-8">
        <h1 className="so-display text-3xl text-[color:var(--so-cream)]">
          Order confirmation
        </h1>
        <p className="text-sm so-muted">Missing checkout session.</p>
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
        <div className="mx-auto w-full max-w-6xl space-y-4 px-5 py-16 sm:px-8">
          <ClearCartOnMount />
          <p className="so-eyebrow">Order</p>
          <h1 className="so-display text-3xl text-[color:var(--so-cream)] sm:text-4xl">
            Your piece is in motion
          </h1>
          <p className="max-w-md text-sm so-muted">
            Payment received — we&apos;re finalizing the order. Refresh in a moment. You&apos;ll
            also get a confirmation email. Then: wait for the package.
          </p>
        </div>
      );
    }
    throw error;
  }

  const { order, lineItems } = result;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-16 sm:px-8">
      <ClearCartOnMount />

      <div className="max-w-xl space-y-4">
        <p className="so-eyebrow">Ordered</p>
        <h1 className="so-display text-3xl text-[color:var(--so-cream)] sm:text-5xl">
          Your piece is in motion.
        </h1>
        <p className="text-base leading-relaxed so-muted">
          We print on demand, pack with care, and ship to you. Confirmation is on its way to{" "}
          <span className="text-[color:var(--so-cream)]">{order.customerEmail}</span>. Now —
          wait for the package.
        </p>
      </div>

      <ul className="divide-y border" style={{ borderColor: "var(--so-border)" }}>
        {lineItems.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "var(--so-dark)" }}
          >
            <div>
              <p className="font-medium text-[color:var(--so-cream)]">{item.productName}</p>
              <p className="text-sm so-muted">Qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium text-[color:var(--so-cream)]">
              {formatPrice(item.priceCentsAtPurchase * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div
        className="flex items-center justify-between border px-6 py-4"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm so-muted">Total</p>
        <p className="text-lg font-semibold text-[color:var(--so-cream)]">
          {formatPrice(order.totalCents)}
        </p>
      </div>

      <Link href="/collections" className="so-btn-ghost inline-flex">
        Continue shopping
      </Link>
    </div>
  );
}
