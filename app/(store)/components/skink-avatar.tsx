"use client";

import { useEffect, useRef } from "react";
import { SkinkArt, type SkinkMood } from "./skink-art";

/** The animated Skink: eyes follow the pointer (or finger), and the mood follows the conversation. */
export function SkinkAvatar({ size = 160, mood = "idle", perch = false }: { size?: number; mood?: SkinkMood; perch?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = box.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(180, window.innerWidth / 3);
        const dy = (e.clientY - (r.top + r.height * 0.35)) / Math.max(180, window.innerHeight / 3);
        el.style.setProperty("--lx", String(Math.max(-1, Math.min(1, dx))));
        el.style.setProperty("--ly", String(Math.max(-1, Math.min(1, dy))));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={box} style={{ display: "inline-block", lineHeight: 0 }}><SkinkArt size={size} mood={mood} perch={perch} /></div>;
}
