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
      className="flex w-56 shrink-0 flex-col border-r"
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
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--so-border)" }}
      >
        <p className="truncate text-xs font-medium" style={{ color: "var(--so-cream)" }}>
          {displayName}
        </p>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          {roleLabel}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 pt-3">
        {pack.nav.map((item) => {
          const active = isNavItemActive(path, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.note}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: active ? "var(--so-surface)" : "transparent",
                color: active ? "var(--so-gold)" : "var(--so-cream-dim)",
              }}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="border-t p-3"
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
