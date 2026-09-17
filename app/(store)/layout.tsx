import Link from "next/link";
import { CartProvider } from "@/lib/cart/cart-context";
import { Mascot } from "./components/mascot";
import { StoreHeader } from "./components/store-header";

// Product/venture data should stay fresh, but force-dynamic reran every
// page from scratch on every click (a real Supabase round-trip per nav,
// worse on a cold Vercel serverless invocation) — that's what made storefront
// navigation feel like it needed several clicks. A 30s revalidation window
// keeps pages served from cache almost all the time while still catching up
// to catalog changes well within a minute.
export const revalidate = 30;

const FOOTER_LINKS = [
  { href: "/collections", label: "Shop" },
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
        <StoreHeader />

        <main className="flex-1 pt-[4.25rem]">{children}</main>

        <footer
          className="mt-auto border-t"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-sm space-y-3">
              <p className="so-display text-2xl text-[color:var(--so-cream)]">Sweet&apos;Oh</p>
              <p className="text-sm leading-relaxed so-muted">
                Micronesian print-on-demand. Shop a design or create your own — then wait for
                the package.
              </p>
              <p className="text-xs so-muted">sweetohcreations.shop</p>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm so-muted">
              {FOOTER_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="so-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div
            className="border-t px-5 py-4 text-center text-xs so-muted sm:px-8"
            style={{ borderColor: "var(--so-border)" }}
          >
            © {new Date().getFullYear()} Sweet&apos;Oh Creations
          </div>
        </footer>
      </div>

      <Mascot />
    </CartProvider>
  );
}
