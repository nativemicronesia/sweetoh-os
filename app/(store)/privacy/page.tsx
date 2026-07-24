import { StaticPage } from "../components/static-page";

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <p>
        Sweet&apos;Oh Creations (“we”) collects contact details and order information you
        provide so we can fulfill custom and print-on-demand products and respond to
        requests.
      </p>
      <p>
        Payment processing is handled by Stripe. We do not store full card numbers on our
        servers. We may use email providers to send order and request updates.
      </p>
      <p className="text-xs text-neutral-400">
        Placeholder pending legal review — replace before public marketing launch if
        required in your jurisdiction.
      </p>
    </StaticPage>
  );
}
