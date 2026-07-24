import Link from "next/link";
import { signOutAction } from "../actions/auth";

/** Legacy header nav — sidebar `partner-nav.tsx` is the live navigation. */
const navItems = [
  { href: "/partner", label: "Home" },
  { href: "/partner/visual-intake", label: "New from photo" },
  { href: "/partner/drafts", label: "Drafts" },
  { href: "/partner/products", label: "Products" },
  { href: "/partner/queue", label: "Orders" },
  { href: "/partner/jobs", label: "Production" },
];

export function PartnerNav({ email }: { email: string }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-emerald-800">
            Sweet&apos;Oh Operations
          </p>
          <p className="text-xs text-neutral-500">Partner workspace</p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-neutral-700 hover:text-emerald-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{email}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
