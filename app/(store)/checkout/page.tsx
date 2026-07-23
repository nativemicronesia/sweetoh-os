import { isStripeCheckoutReady } from "@/lib/config/env";
import { CheckoutView } from "./checkout-view";

export default function CheckoutPage() {
  return <CheckoutView stripeReady={isStripeCheckoutReady()} />;
}
