"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/** Brings a block in once as it scrolls into view. Without script, or with reduced motion, it is simply there. */
export function Reveal({ children, as: Tag = "div", delay = 0, className }: { children: ReactNode; as?: ElementType; delay?: number; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("sx-motion");
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.in = "true"; io.unobserve(entry.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} data-sx-reveal="" data-in="false" className={className} style={{ ["--sx-delay" as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
