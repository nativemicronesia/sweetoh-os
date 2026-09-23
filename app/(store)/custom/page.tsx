import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/domains/customers/account";
import {
  CUSTOM_PRODUCT_TYPES,
  CUSTOM_REQUEST_MAX_PHOTOS,
  listCustomerRequests,
  STATUS_LABEL,
  type CustomRequestStatus,
} from "@/lib/domains/customers/custom-requests";
import { customerSignOutAction } from "../account/actions";
import { CustomRequestForm } from "./custom-request-form";

export const metadata: Metadata = {
  title: "Custom orders — Sweet'Oh Creations",
  description: "Something made just for you: your design, names, a logo, or a batch for your team, family or event. Send the shop a request.",
};

const IDEAS = ["Family reunion shirts", "Team or church event", "Your logo on tumblers", "A name or date on a gift", "Your own artwork on a hoodie"];

export default async function CustomPage({ searchParams }: { searchParams: Promise<{ sent?: string; welcome?: string }> }) {
  const [shopper, query] = await Promise.all([getCurrentCustomer(), searchParams]);
  const requests = shopper ? await listCustomerRequests(shopper) : [];

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <p className="so-eyebrow">Custom orders</p>
      <h1 className="so-display mt-4 text-4xl text-[color:var(--so-cream)] sm:text-5xl">Made just for you.</h1>
      <p className="mt-5 max-w-xl so-muted">
        Your design, names, a logo, or a batch for your team, family or event. Tell the shop what you have in mind — they&apos;ll review it and email you back. Nothing is made or charged until you both agree.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {IDEAS.map((idea) => (
          <span key={idea} className="rounded-full border px-3 py-1.5 text-xs so-muted" style={{ borderColor: "var(--so-border)" }}>{idea}</span>
        ))}
      </div>

      {!shopper ? (
        <div className="mt-10 rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}>
          <h2 className="so-display text-2xl text-[color:var(--so-cream)]">Create a free account to send a request</h2>
          <p className="mt-3 so-muted">So the shop knows who to email back, and you can see your requests here anytime.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/account?next=/custom" className="so-btn-primary">Create account</Link>
            <Link href="/account?mode=login&next=/custom" className="so-btn-ghost">Sign in</Link>
          </div>
        </div>
      ) : (
        <>
          {query.sent && (
            <p className="mt-8 rounded-xl border p-4 text-[color:var(--so-cream)]" style={{ borderColor: "var(--so-gold)" }}>
              Sent! The shop will email you at <strong>{shopper.email}</strong>. Ask Skink (bottom corner) for an update anytime — once you've confirmed your email.
            </p>
          )}
          {query.welcome && !query.sent && (
            <p className="mt-8 rounded-xl border p-4 text-[color:var(--so-cream)]" style={{ borderColor: "var(--so-border)" }}>
              Welcome, {shopper.name?.split(" ")[0] ?? "friend"}! Tell the shop what you&apos;d like below.
            </p>
          )}
          <CustomRequestForm productTypes={[...CUSTOM_PRODUCT_TYPES]} maxPhotos={CUSTOM_REQUEST_MAX_PHOTOS} defaultPhone={shopper.phone ?? ""} />

          {requests.length > 0 && (
            <div className="mt-14">
              <h2 className="so-display text-2xl text-[color:var(--so-cream)]">Your requests</h2>
              <ul className="mt-4 divide-y" style={{ borderColor: "var(--so-border)" }}>
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3" style={{ borderColor: "var(--so-border)" }}>
                    <span className="text-[color:var(--so-cream)]">
                      {r.productType}{r.quantity > 1 ? ` × ${r.quantity}` : ""} <span className="so-muted">· {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </span>
                    <span className="text-sm so-muted">{STATUS_LABEL[r.status as CustomRequestStatus] ?? r.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form action={customerSignOutAction} className="mt-12 text-sm so-muted">
            Signed in as {shopper.email} ·{" "}
            <button type="submit" className="so-link">Sign out</button>
          </form>
        </>
      )}
    </section>
  );
}
