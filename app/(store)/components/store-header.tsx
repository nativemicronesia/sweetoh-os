"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { CartIcon } from "./cart-icon";

/** The five ways in. Plain words; the same list drives the bar and the full-screen menu. */
export const DOORS = [
  { href: "/design", label: "Studio", hint: "Design" },
  { href: "/custom", label: "Bring an idea", hint: "Request" },
  { href: "/collections", label: "Shop", hint: "Ready" },
  { href: "/make", label: "What we make", hint: "Range" },
] as const;

export function StoreHeader({ creatorSideOpen = false }: { creatorSideOpen?: boolean }) {
  void creatorSideOpen;
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const solid = !isHome || scrolled;
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <>
      <header className="sx-header" data-solid={solid ? "true" : "false"}>
        <div className="sx-wrap sx-header-inner">
          <Link href="/" className="sx-logo" aria-label="Sweet'Oh Creations, home">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
              <circle cx="15" cy="15" r="14" fill="#16120d" />
              <g fill="#d93d22"><path d="M15 15 L15 3 A12 12 0 0 1 24.5 7.5 Z" /><path d="M15 15 L27 15 A12 12 0 0 1 22.5 24.5 Z" fill="#f0c419" /><path d="M15 15 L15 27 A12 12 0 0 1 5.5 22.5 Z" /><path d="M15 15 L3 15 A12 12 0 0 1 7.5 5.5 Z" fill="#1b8ea6" /></g>
              <circle cx="15" cy="15" r="4.2" fill="#f4ecdd" />
            </svg>
            <span>Sweet&apos;Oh</span>
          </Link>
          <nav className="sx-nav" aria-label="Main">
            {DOORS.map((d) => <Link key={d.href} href={d.href} aria-current={current(d.href)}>{d.label}</Link>)}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <CartIcon />
            <button type="button" className="sx-burger" aria-label="Open menu" aria-expanded={open} aria-controls="sx-menu" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <div id="sx-menu" className="sx-menu" data-open={open ? "true" : "false"} role="dialog" aria-modal="true" aria-label="Menu" {...(open ? {} : { inert: true })}>
        <button type="button" className="sx-burger sx-menu-close" aria-label="Close menu" onClick={() => setOpen(false)} style={{ background: "transparent", borderColor: "#f4ecdd", color: "#f4ecdd" }}>
          <X size={20} />
        </button>
        <p className="sx-mono" style={{ color: "#f0c419", marginBottom: "0.75rem" }}>Where to?</p>
        {DOORS.map((d) => (
          <Link key={d.href} href={d.href} className="sx-menu-link" onClick={() => setOpen(false)}>
            {d.label}<small>{d.hint}</small>
          </Link>
        ))}
        <Link href="/cart" className="sx-menu-link" onClick={() => setOpen(false)}>Cart<small>Bag</small></Link>
        <Link href="/account" className="sx-menu-link" onClick={() => setOpen(false)}>Account<small>You</small></Link>
        <p style={{ marginTop: "auto", paddingTop: "2rem", color: "#cfc4ad", fontSize: "0.9rem" }}>Made in Lacey, Washington. Shipped to anywhere you are.</p>
      </div>
    </>
  );
}
