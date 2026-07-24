import Link from "next/link";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartIcon } from "./components/cart-icon";
import { Mascot } from "./components/mascot";

// Product/venture data is read fresh per request — this is a live storefront,
// not a static marketing page.
export const dynamic = "force-dynamic";

const FOOTER_LINKS = [
  { href: "/create", label: "Create yours" },
  { href: "/products", label: "All products" },
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
      <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold text-neutral-900">
              Sweet&apos;Oh
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/create" className="text-sm text-neutral-600 hover:text-neutral-900">
                Create yours
              </Link>
              <Link href="/products" className="text-sm text-neutral-600 hover:text-neutral-900">
                All products
              </Link>
              <CartIcon />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

        <footer className="border-t border-neutral-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-neutral-500">
              © {new Date().getFullYear()} Sweet&apos;Oh Creations. Custom designs, printed on
              demand.
            </p>
            <nav className="flex flex-wrap gap-3 text-xs text-neutral-500">
              {FOOTER_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-neutral-800">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </footer>
      </div>

      <Mascot />
    </CartProvider>
  );
}
