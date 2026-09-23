import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/domains/customers/account";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "Your Sweet'Oh account", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const query = await searchParams;
  const next = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "/custom";
  if (await getCurrentCustomer()) redirect(next);

  return (
    <section className="mx-auto w-full max-w-md px-5 py-16 sm:px-8">
      <p className="so-eyebrow">Sweet&apos;Oh account</p>
      <h1 className="so-display mt-4 text-4xl text-[color:var(--so-cream)]">
        {query.mode === "login" ? "Welcome back." : "Join the shop."}
      </h1>
      <p className="mt-4 so-muted">
        A free account lets you send the shop custom requests and lets Skink check on your orders. No spam — just your requests and orders.
      </p>
      <AccountForms initialMode={query.mode === "login" ? "login" : "signup"} next={next} />
    </section>
  );
}
