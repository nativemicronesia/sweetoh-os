import { StaticPage } from "../components/static-page";

export default function ReturnsPage() {
  return (
    <StaticPage title="Returns">
      <p>
        Because most Sweet&apos;Oh items are custom or printed on demand, returns are
        limited. If your order arrives damaged or incorrect, contact us promptly with your
        order details and photos and we will make it right.
      </p>
      <p>
        Design preview approvals and custom requests are confirmed before production when
        the flow requires it — please review carefully before paying.
      </p>
      <p className="text-xs text-neutral-400">
        Placeholder pending legal / ops review.
      </p>
    </StaticPage>
  );
}
