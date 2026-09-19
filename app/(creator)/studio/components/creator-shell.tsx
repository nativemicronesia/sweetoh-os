"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Coins,
  ExternalLink,
  House,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Palette,
  Printer,
  Settings,
  Sparkles,
  Store,
} from "lucide-react";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import { formatCredits } from "@/lib/domains/creator/plans";

type Nav = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; match: (p: string) => boolean };

const NAV: Nav[] = [
  { href: "/studio", label: "Home", icon: House, match: (p) => p === "/studio" },
  { href: "/studio/skink", label: "Ask Skink", icon: MessageCircle, match: (p) => p.startsWith("/studio/skink") },
  { href: "/studio/catalog", label: "Catalog", icon: LayoutGrid, match: (p) => p.startsWith("/studio/catalog") },
  { href: "/studio/designs", label: "My designs", icon: Palette, match: (p) => p.startsWith("/studio/designs") },
  { href: "/studio/requests", label: "Print with Sweet'Oh", icon: Printer, match: (p) => p.startsWith("/studio/requests") },
];
const NAV_2: Nav[] = [
  { href: "/studio/memory", label: "What Skink knows", icon: Brain, match: (p) => p.startsWith("/studio/memory") },
  { href: "/studio/plans", label: "Plans & credits", icon: Sparkles, match: (p) => p.startsWith("/studio/plans") },
  { href: "/studio/settings", label: "Printify & account", icon: Settings, match: (p) => p.startsWith("/studio/settings") },
];
const TABS: Nav[] = [NAV[0], NAV[1], NAV[2], NAV[3], { href: "/studio/plans", label: "Plan", icon: Sparkles, match: (p) => p.startsWith("/studio/plans") || p.startsWith("/studio/memory") || p.startsWith("/studio/settings") || p.startsWith("/studio/requests") }];

const TITLES: [RegExp, string][] = [
  [/^\/studio\/skink/, "Ask Skink"],
  [/^\/studio\/catalog/, "Catalog"],
  [/^\/studio\/designs/, "My designs"],
  [/^\/studio\/requests/, "Print with Sweet'Oh"],
  [/^\/studio\/memory/, "What Skink knows"],
  [/^\/studio\/plans/, "Plans & credits"],
  [/^\/studio\/settings/, "Printify & account"],
];

function initials(name: string) {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function CreatorShell({
  children,
  name,
  email,
  planName,
  planId,
  balance,
  monthlyCredits,
  signOut,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  planName: string;
  planId: string;
  balance: number;
  monthlyCredits: number;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  // The design editor is full-screen, like Printify's.
  if (path.startsWith("/studio/design") && !path.startsWith("/studio/designs")) {
    return <div className="cs sweetoh-studio pf-root">{children}</div>;
  }

  const pct = Math.max(3, Math.min(100, (balance / Math.max(1, monthlyCredits)) * 100));
  const title = TITLES.find(([re]) => re.test(path))?.[1] ?? "Home";
  const link = (item: Nav) => (
    <Link key={item.href} href={item.href} aria-current={item.match(path) ? "page" : undefined}>
      <item.icon size={19} />
      {item.label}
    </Link>
  );

  return (
    <div className="cs">
      <div className="cs-shell">
        <aside className="cs-side">
          <Link href="/studio" className="cs-brand">
            <MascotCharacter size={38} />
            <span>
              <strong>Sweet&apos;Oh</strong>
              <small>Creator Studio</small>
            </span>
          </Link>
          <nav className="cs-nav" aria-label="Studio">
            {NAV.map(link)}
            <div className="cs-nav-sep" />
            {NAV_2.map(link)}
          </nav>
          <div className="cs-plan-card">
            <div className="cs-plan-name">{planName} plan</div>
            <strong>{formatCredits(balance)} credits</strong>
            <div className="cs-meter" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
            {planId !== "pro" && <Link href="/studio/plans">{planId === "free" ? "Upgrade" : "Go Pro"}</Link>}
          </div>
        </aside>

        <div className="cs-main">
          <header className="cs-top">
            <Link href="/studio" className="cs-mobile-brand">
              <MascotCharacter size={30} /> Sweet&apos;Oh Studio
            </Link>
            <div className="cs-top-title">{title}</div>
            <div className="cs-top-actions">
              <Link href="/studio/plans" className="cs-credits" title="Credits = AI capacity">
                <Coins size={15} /> {formatCredits(balance)}
              </Link>
              <div className="cs-menu" ref={menuRef}>
                <button type="button" className="cs-avatar" aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                  {initials(name)}
                </button>
                {menu && (
                  <div className="cs-menu-pop" role="menu">
                    <div className="cs-menu-head">
                      <strong style={{ display: "block", fontSize: 14 }}>{name}</strong>
                      <span className="cs-muted" style={{ fontSize: 12 }}>{email}</span>
                    </div>
                    <Link href="/studio/memory"><Brain size={16} /> What Skink knows</Link>
                    <Link href="/studio/requests"><Printer size={16} /> Print requests</Link>
                    <Link href="/studio/settings"><Settings size={16} /> Printify & account</Link>
                    <Link href="/"><Store size={16} /> Sweet&apos;Oh shop <ExternalLink size={12} /></Link>
                    <form action={signOut}>
                      <button type="submit"><LogOut size={16} /> Sign out</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="cs-content">{children}</main>
        </div>
      </div>
      <nav className="cs-tabbar" aria-label="Studio">
        {TABS.map((item) => (
          <Link key={item.label} href={item.href} aria-current={item.match(path) ? "page" : undefined}>
            <item.icon size={21} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
