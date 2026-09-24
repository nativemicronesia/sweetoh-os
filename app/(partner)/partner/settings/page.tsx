import Link from "next/link";
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  KeyRound,
  ScanLine,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { ChangePasswordForm } from "./password-form";
import {
  getDefaultVenture,
  requirePartnerWorkspace,
} from "@/lib/domains/identity/service";

const TOOLS = [
  {
    href: "/partner/create",
    label: "Create with AI",
    note: "Describe a product or snap a photo and let Sweet’Oh draft it.",
    icon: Sparkles,
  },
  {
    href: "/partner/review",
    label: "Listing reviews",
    note: "Approve or send back products waiting for review.",
    icon: ClipboardCheck,
  },
  {
    href: "/partner/visual-intake",
    label: "Photo intake",
    note: "Turn photos of products you’ve made into listings.",
    icon: ScanLine,
  },
  {
    href: "/partner/activity",
    label: "Activity",
    note: "Everything that’s happened in your workspace.",
    icon: Activity,
  },
];

/**
 * Store and account overview. Read-only by design: account, billing and
 * email settings belong to the auth/Stripe/Resend work done separately.
 */
export default async function PartnerSettingsPage() {
  const [session, venture] = await Promise.all([
    requirePartnerWorkspace(),
    getDefaultVenture().catch(() => null),
  ]);
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const payments = stripeKey.startsWith("sk_live")
    ? { label: "Live", tone: "ok" }
    : stripeKey
      ? { label: "Test mode", tone: "warn" }
      : { label: "Not connected", tone: "warn" };

  return (
    <div className="settings">
      <header className="studio-page-heading">
        <div>
          <h1>Settings</h1>
          <p>Your store, your account, and extra tools.</p>
        </div>
      </header>

      <section className="settings-card">
        <h2>
          <Store size={18} /> Store
        </h2>
        <dl>
          <div>
            <dt>Store name</dt>
            <dd>{venture?.name ?? "Sweet’Oh"}</dd>
          </div>
          <div>
            <dt>Storefront</dt>
            <dd>
              <Link href="/" target="_blank" className="settings-link">
                View your store <ExternalLink size={14} />
              </Link>
            </dd>
          </div>
          <div>
            <dt>Production</dt>
            <dd>Printed and fulfilled locally by your shop</dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>
          <CreditCard size={18} /> Payments
        </h2>
        <dl>
          <div>
            <dt>Checkout</dt>
            <dd>
              <span className="settings-pill" data-tone={payments.tone}>
                {payments.label}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>
          <User size={18} /> Account
        </h2>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{session.appUser.name ?? "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{session.appUser.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd className="capitalize">{session.role}</dd>
          </div>
        </dl>
      </section>

      <section className="settings-card">
        <h2>
          <KeyRound size={18} /> Password
        </h2>
        <p className="pw-help">You sign in with {session.appUser.email}. Forgot it? Use “Forgot your password?” on the sign-in page.</p>
        <ChangePasswordForm />
      </section>

      <section className="settings-card">
        <h2>More tools</h2>
        <ul className="settings-tools">
          {TOOLS.map(({ href, label, note, icon: Icon }) => (
            <li key={href}>
              <Link href={href}>
                <span className="settings-tool-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
                <ChevronRight size={18} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
