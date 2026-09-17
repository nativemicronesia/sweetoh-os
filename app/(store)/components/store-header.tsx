"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartIcon } from "./cart-icon";

export function StoreHeader() {
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
      className={`fixed inset-x-0 top-0 z-40 transition-[background,border-color,backdrop-filter] duration-300 ${
        solid
          ? "border-b border-[color:var(--so-border)] bg-[color:var(--so-black)]/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="so-display text-xl tracking-tight text-[color:var(--so-cream)] sm:text-2xl"
        >
          Sweet&apos;Oh
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8">
          <Link href="/collections" className="so-link text-sm text-[color:var(--so-mist)]">
            Shop
          </Link>
          <CartIcon />
        </nav>
      </div>
    </header>
  );
}
