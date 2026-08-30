import { StaticPage } from "../components/static-page";

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Service">
      <p>
        By placing an order or submitting a custom design request with Sweet&apos;Oh
        Creations, you agree that designs you submit are yours to use commercially for
        production, and that we may refuse requests that infringe others&apos; rights or
        our guidelines.
      </p>
      <p>
        Custom and print-on-demand items are made to order. Production begins after we
        confirm details where required. Prices and turnaround times are shown at checkout
        or in follow-up email.
      </p>
      <p className="text-xs so-muted">
        Placeholder pending legal review.
      </p>
    </StaticPage>
  );
}
