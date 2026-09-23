"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { CartIcon } from "./cart-icon";

const ANNOUNCEMENTS = [
  "Made to order in Lacey, Washington",
  "Micronesian-owned",
  "Custom orders open — names, logos, family reunions",
  "Hafa adai",
  "Kaselehlie",
  "Ran allim",
  "Iakwe",
  "Alii",
  "Something for every age",
];

/** Thin lagoon bar above the nav — scrolls, pauses on hover. */
function AnnouncementBar() {
  const items = ANNOUNCEMENTS.map((text) => (
    <span key={text} className="flex items-center gap-10 whitespace-nowrap">
      {text}
      <span aria-hidden style={{ color: "var(--so-frangipani)" }}>✿</span>
    </span>
  ));
  return (
    <div className="so-marquee so-marquee-slow py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase" style={{ background: "var(--so-lagoon)", color: "#f3efe4" }} aria-label="Sweet'Oh Creations — made to order in Lacey, Washington. Micronesian-owned. Custom orders open.">
      <div className="so-marquee-track" aria-hidden>{items}</div>
      <div className="so-marquee-track" aria-hidden>{items}</div>
    </div>
  );
}

export function StoreHeader({ creatorSideOpen = false }: { creatorSideOpen?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const solid = !isHome || scrolled;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[45] transition-[background,border-color,backdrop-filter] duration-300 ${
        solid
          ? "border-b border-[color:var(--so-border)] bg-[color:var(--so-black)]/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <AnnouncementBar />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="so-display flex items-baseline gap-1 text-[1.05rem] tracking-tight text-[color:var(--so-cream)] sm:gap-1.5 sm:text-2xl" aria-label="Sweet'Oh Creations — home">
          Sweet&apos;Oh
          <span className="font-normal italic" style={{ color: "var(--so-hibiscus)" }}>Creations</span>
        </Link>
        <nav className="flex items-center gap-3.5 text-[13px] sm:gap-8 sm:text-sm">
          <Link href="/collections" className="so-link text-[13px] sm:text-sm text-[color:var(--so-mist)]">
            Shop
          </Link>
          <Link href="/create" className="so-link inline-flex items-center gap-1 text-[13px] sm:text-sm text-[color:var(--so-mist)]">
            Create
            {!creatorSideOpen && <Lock size={12} aria-label="(opening soon)" />}
          </Link>
          <CartIcon />
        </nav>
      </div>
    </header>
  );
}
