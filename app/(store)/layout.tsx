import Link from "next/link";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartIcon } from "./components/cart-icon";
import { Mascot } from "./components/mascot";

// Product/venture data is read fresh per request — this is a live storefront,
// not a static marketing page.
export const dynamic = "force-dynamic";

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
              <Link href="/products" className="text-sm text-neutral-600 hover:text-neutral-900">
                All products
              </Link>
              <CartIcon />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

        <footer className="border-t border-neutral-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-neutral-500">
            © {new Date().getFullYear()} Sweet&apos;Oh Creations. Custom designs, printed on
            demand.
          </div>
        </footer>
      </div>

      <Mascot />
    </CartProvider>
  );
}
