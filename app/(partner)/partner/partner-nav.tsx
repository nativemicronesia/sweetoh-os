"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Home", href: "/partner", icon: "⌂" },
  { label: "New from photo", href: "/partner/visual-intake", icon: "◉" },
  { label: "Drafts", href: "/partner/drafts", icon: "◻" },
  { label: "Products", href: "/partner/products", icon: "▣" },
  { label: "Orders", href: "/partner/queue", icon: "▦" },
  { label: "Production", href: "/partner/jobs", icon: "◈" },
  { label: "Uploads", href: "/partner/uploads", icon: "↑" },
] as const;

export function PartnerNav() {
  const path = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-2 pt-3">
      {NAV.map((item) => {
        const active =
          path === item.href ||
          (item.href !== "/partner" && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: active ? "var(--so-surface)" : "transparent",
              color: active ? "var(--so-gold)" : "var(--so-cream-dim)",
            }}
          >
            <span className="w-4 text-center text-xs">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
