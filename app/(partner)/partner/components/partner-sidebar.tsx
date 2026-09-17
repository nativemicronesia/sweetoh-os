"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SWEETOH_CREATOR_PACK,
  SWEETOH_PARTNER_PACK,
  isNavItemActive,
  type WorkspacePack,
} from "@/lib/domains/workspace/packs";

/**
 * Command-center left nav. Role-aware via the resolved WorkspacePack — the
 * partner/owner desk carries Products and Settings, a creator's does not.
 * Lives in the layout so it never remounts on navigation.
 */
export function PartnerSidebar({
  packId,
  displayName,
  roleLabel,
  signOut,
}: {
  packId: WorkspacePack["id"];
  displayName: string;
  roleLabel: string;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const pack =
    packId === "sweetoh_creator" ? SWEETOH_CREATOR_PACK : SWEETOH_PARTNER_PACK;

  return (
    <aside
      className="studio-sidebar flex w-full shrink-0 flex-col border-b md:w-52 md:border-b-0 md:border-r"
      style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
    >
      <div
        className="flex h-14 items-center gap-2 border-b px-4"
        style={{ borderColor: "var(--so-border)" }}
      >
        <span
          className="text-lg font-semibold tracking-tight"
          style={{ color: "var(--so-gold)" }}
        >
          Sweet&apos;Oh
        </span>
        <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          studio
        </span>
      </div>

      <div
        className="hidden border-b px-4 py-3 md:block"
        style={{ borderColor: "var(--so-border)" }}
      >
        <p className="truncate text-xs font-medium" style={{ color: "var(--so-cream)" }}>
          {displayName}
        </p>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          {roleLabel}
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-2 md:block md:flex-1 md:space-y-0.5 md:overflow-y-auto md:pt-3">
        {packId !== "sweetoh_creator" && <Link href="/partner/builder" className="studio-primary">＋ Create product</Link>}
        {pack.nav.filter(item => ["overview", "library", "orders"].includes(item.id)).map(item => (
          <Link key={item.id} href={item.href} aria-current={isNavItemActive(path, item) ? "page" : undefined}
            className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm"
            style={{ background: isNavItemActive(path, item) ? "var(--so-surface)" : "transparent", color: isNavItemActive(path, item) ? "var(--so-gold)" : "var(--so-cream-dim)" }}>
            {item.id === "overview" ? "My products" : item.id === "library" ? "Artwork" : "Orders"}
          </Link>
        ))}
        <details className="studio-more-nav">
          <summary>More</summary>
          <div>{pack.nav.filter(item => !["overview", "library", "orders"].includes(item.id)).map(item => (
            <Link key={item.id} href={item.href} aria-current={isNavItemActive(path, item) ? "page" : undefined} className="block rounded-lg px-3 py-2 text-sm">{item.label}</Link>
          ))}</div>
        </details>
      </nav>

      <div
        className="absolute right-3 top-2 p-1 md:static md:border-t md:p-3"
        style={{ borderColor: "var(--so-border)" }}
      >
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border px-3 py-1.5 text-left text-xs"
            style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
