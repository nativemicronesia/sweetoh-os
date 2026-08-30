import { StaticPage } from "../components/static-page";

export default function ShippingPage() {
  return (
    <StaticPage title="Shipping">
      <p>
        Sweet&apos;Oh products are printed on demand. After your order is confirmed, we
        produce and ship to the address you provide at checkout.
      </p>
      <p>
        Estimates for production and delivery are shared at checkout or by email when your
        order moves into production. International shipping availability depends on the
        product and destination.
      </p>
      <p className="text-xs so-muted">
        Update with your carrier and turnaround once production partners are locked.
      </p>
    </StaticPage>
  );
}
