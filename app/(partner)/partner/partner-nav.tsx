"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SWEETOH_CREATOR_PACK,
  SWEETOH_PARTNER_PACK,
  isNavItemActive,
  type WorkspacePack,
} from "@/lib/domains/workspace/packs";

export function PartnerNav({
  packId = "sweetoh_partner",
}: {
  packId?: WorkspacePack["id"];
}) {
  const path = usePathname();
  const pack =
    packId === "sweetoh_creator" ? SWEETOH_CREATOR_PACK : SWEETOH_PARTNER_PACK;

  return (
    <nav className="flex-1 space-y-0.5 p-2 pt-3">
      {pack.nav.map((item) => {
        const active = isNavItemActive(path, item);
        return (
          <Link
            key={item.id}
            href={item.href}
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
  );
}
