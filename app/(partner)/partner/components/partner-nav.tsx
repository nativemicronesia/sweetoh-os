import Link from "next/link";
import { signOutAction } from "../actions/auth";

const navItems = [
  { href: "/partner", label: "Home" },
  { href: "/partner/queue?stage=new", label: "New Orders" },
  { href: "/partner/queue?stage=in_production", label: "In Production" },
  { href: "/partner/queue?stage=ready_to_ship", label: "Ready To Ship" },
  { href: "/partner/queue?stage=completed", label: "Completed" },
  { href: "/partner/uploads", label: "Design Uploads" },
  { href: "/partner/production-queue", label: "Production Queue" },
  { href: "/partner/drafts", label: "My Drafts" },
  { href: "/partner/intelligence", label: "Product Intelligence" },
  { href: "/partner/visual-intake", label: "Visual Intake" },
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
