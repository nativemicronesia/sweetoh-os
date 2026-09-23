"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ExternalLink,
  House,
  ImageIcon,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import {
  SWEETOH_CREATOR_PACK,
  isNavItemActive,
  type WorkspacePack,
} from "@/lib/domains/workspace/packs";
import { StudioChat } from "./studio-chat";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  match: (path: string) => boolean;
};

const PARTNER_NAV: NavItem[] = [
  { href: "/partner", label: "Home", icon: House, match: (p) => p === "/partner" },
  {
    href: "/partner/catalog",
    label: "Catalog",
    icon: BookOpen,
    match: (p) => /^\/partner\/(catalog|builder|canvas)/.test(p),
  },
  {
    href: "/partner/products",
    label: "My products",
    icon: Package,
    match: (p) => /^\/partner\/(products|review|drafts)/.test(p),
  },
  {
    href: "/partner/orders",
    label: "Orders",
    icon: ShoppingBag,
    match: (p) => /^\/partner\/(orders|queue|jobs)/.test(p),
  },
  {
    href: "/partner/custom-requests",
    label: "Custom requests",
    icon: MessageSquareText,
    match: (p) => p.startsWith("/partner/custom-requests"),
  },
  // Creator requests (/partner/creator-requests) returns to the nav when the creator side opens.
  {
    href: "/partner/library",
    label: "My files",
    icon: ImageIcon,
    match: (p) => p.startsWith("/partner/library"),
  },
];

const SETTINGS_NAV: NavItem = {
  href: "/partner/settings",
  label: "Settings",
  icon: Settings,
  match: (p) => p.startsWith("/partner/settings"),
};

function creatorNav(): NavItem[] {
  return SWEETOH_CREATOR_PACK.nav.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.id === "overview" ? House : LayoutGrid,
    match: (p) => isNavItemActive(p, item),
  }));
}

function initials(name: string) {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "S") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Printify-style back office frame: top bar with the store and account,
 * icon sidebar, and the Sweet'Oh assistant as a slide-over. Lives in the
 * layout so it never remounts between pages.
 */
export function PartnerFrame({
  packId,
  displayName,
  roleLabel,
  storeName,
  signOut,
  children,
}: {
  packId: WorkspacePack["id"];
  displayName: string;
  roleLabel: string;
  storeName: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const nav = packId === "sweetoh_creator" ? creatorNav() : PARTNER_NAV;
  const editor = path === "/partner/canvas";

  useEffect(() => setMenuOpen(false), [path]);

  // The product editor is full screen with its own top bar, like Printify's.
  if (editor) return <div className="sweetoh-studio pf-root pf-editor-root">{children}</div>;

  const link = (item: NavItem) => {
    const Icon = item.icon;
    const active = item.match(path);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className="pf-nav-link"
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="sweetoh-studio pf-root">
      <header className="pf-topbar">
        <button
          className="pf-icon-btn pf-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link href="/partner" className="pf-logo">
          Sweet&apos;Oh
        </Link>
        <span className="pf-store">
          <span className="pf-store-dot" aria-hidden="true" />
          {storeName}
        </span>
        <div className="pf-topbar-actions">
          <Link href="/" target="_blank" className="pf-btn pf-btn-ghost pf-hide-sm">
            View store <ExternalLink size={14} />
          </Link>
          <button
            className="pf-btn pf-btn-soft"
            aria-expanded={assistantOpen}
            onClick={() => setAssistantOpen(!assistantOpen)}
          >
            <Sparkles size={15} />
            <span className="pf-hide-sm">Sweet&apos;Oh AI</span>
          </button>
          <details className="pf-account">
            <summary aria-label="Account menu" className="pf-avatar">
              {initials(displayName)}
            </summary>
            <div className="pf-account-menu">
              <p className="pf-account-name">{displayName}</p>
              <p className="pf-account-role">{roleLabel}</p>
              <Link href="/partner/settings">
                <Settings size={16} /> Settings
              </Link>
              <Link href="/" target="_blank">
                <ExternalLink size={16} /> View store
              </Link>
              <form action={signOut}>
                <button type="submit">
                  <LogOut size={16} /> Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>

      <div className="pf-body">
        <aside className="pf-sidebar" data-open={menuOpen}>
          <nav aria-label="Main">{nav.map(link)}</nav>
          <div className="pf-sidebar-bottom">
            {packId !== "sweetoh_creator" && link(SETTINGS_NAV)}
            <div className="pf-local-card">
              <strong>Local production</strong>
              <span>Every order is printed and fulfilled by your shop.</span>
            </div>
          </div>
        </aside>
        {menuOpen && (
          <button
            className="pf-scrim"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <main className={editor ? "pf-content pf-content-editor" : "pf-content"}>
          <div className="pf-content-inner">{children}</div>
        </main>

        <aside className="pf-assistant" hidden={!assistantOpen} aria-label="Sweet'Oh AI">
          <div className="pf-assistant-head">
            <strong>
              <Sparkles size={16} /> Sweet&apos;Oh AI
            </strong>
            <button
              className="pf-icon-btn"
              aria-label="Close Sweet'Oh AI"
              onClick={() => setAssistantOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <StudioChat panel />
        </aside>
      </div>
    </div>
  );
}
