import Link from "next/link";
import { CartProvider } from "@/lib/cart/cart-context";
import { Mascot } from "./components/mascot";
import { StoreHeader } from "./components/store-header";
import { creatorSideOpen } from "@/lib/domains/creator/access";

// Product/venture data should stay fresh, but force-dynamic reran every
// page from scratch on every click (a real Supabase round-trip per nav,
// worse on a cold Vercel serverless invocation) — that's what made storefront
// navigation feel like it needed several clicks. A 30s revalidation window
// keeps pages served from cache almost all the time while still catching up
// to catalog changes well within a minute.
export const revalidate = 30;

const FOOTER_LINKS = [
  { href: "/collections", label: "Shop" },
  { href: "/custom", label: "Custom orders" },
  { href: "/shipping", label: "Shipping" },
  { href: "/returns", label: "Returns" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div
        className="flex min-h-screen flex-col"
        style={{ background: "var(--so-black)", color: "var(--so-cream)" }}
      >
        <StoreHeader creatorSideOpen={creatorSideOpen()} />

        <main className="flex-1 pt-[6.1rem]">{children}</main>

        <footer className="mt-24 overflow-hidden" style={{ background: "var(--so-ink)", color: "#efe6d4" }}>
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pt-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-sm space-y-4">
              <p className="text-sm leading-relaxed" style={{ color: "#bfb29b" }}>
                Micronesian-owned, made to order in Lacey, Washington. Shop our pieces or
                request something made just for you.
              </p>
              <p className="text-sm" style={{ color: "var(--so-frangipani)" }}>
                Hafa adai · Kaselehlie · Ran allim · Iakwe · Alii
              </p>
            </div>
            <nav aria-label="Shop" className="flex flex-col gap-2 text-sm">
              <p className="so-eyebrow mb-1" style={{ color: "var(--so-frangipani)" }}>Shop</p>
              {FOOTER_LINKS.slice(0, 2).map((item) => (
                <Link key={item.href} href={item.href} className="hover:underline">{item.label}</Link>
              ))}
              <Link href="/create" className="hover:underline">Create (opening soon)</Link>
            </nav>
            <nav aria-label="Help" className="flex flex-col gap-2 text-sm">
              <p className="so-eyebrow mb-1" style={{ color: "var(--so-frangipani)" }}>Help</p>
              {FOOTER_LINKS.slice(2).map((item) => (
                <Link key={item.href} href={item.href} className="hover:underline">{item.label}</Link>
              ))}
            </nav>
          </div>
          <p
            aria-hidden
            className="so-display mt-14 select-none whitespace-nowrap px-3 text-center leading-[0.8]"
            style={{ fontSize: "clamp(2.6rem, 11.2vw, 11rem)", color: "#f6efe0" }}
          >
            Sweet&apos;Oh <em className="font-normal" style={{ color: "var(--so-coral)" }}>Creations</em>
          </p>
          <div className="border-t px-5 py-5 text-center text-xs sm:px-8" style={{ borderColor: "rgba(239,230,212,.14)", color: "#9d917c" }}>
            {`© ${new Date().getFullYear()} Sweet'Oh Creations · sweetohcreations.shop`}
          </div>
        </footer>
      </div>

      <Mascot />
    </CartProvider>
  );
}
