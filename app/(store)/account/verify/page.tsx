import Link from "next/link";
import type { Metadata } from "next";
import { confirmCustomerEmail } from "@/lib/domains/customers/verify";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string }> }) {
  const { token, sent } = await searchParams;
  const ok = token ? await confirmCustomerEmail(token) : false;

  return (
    <section className="mx-auto w-full max-w-md px-5 py-20 sm:px-8">
      <p className="so-eyebrow">Sweet&apos;Oh account</p>
      <h1 className="so-display mt-4 text-4xl text-[color:var(--so-cream)]">
        {sent ? "Check your email." : ok ? "Email confirmed." : "That link didn't work."}
      </h1>
      <p className="mt-4 so-muted">
        {sent
          ? "We sent a new confirmation link. It works for 3 days."
          : ok
            ? "Skink can now show you your orders — just ask “track my order”."
            : "It may have expired or already been used. Sign in and ask Skink to send a new one."}
      </p>
      <Link href="/collections" className="so-btn-primary mt-8">Back to the shop</Link>
    </section>
  );
}
