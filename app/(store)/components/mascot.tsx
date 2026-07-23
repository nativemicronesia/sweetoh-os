"use client";

import { useState } from "react";
import { MascotCharacter } from "./mascot-character";
import { MascotPanel } from "./mascot-panel";

/**
 * Site-wide, non-intrusive: idle by default, opens only on click, never
 * pops up unprompted. Mounted once in the (store) layout so it's present on
 * every customer-facing page — deliberately not mounted in the partner
 * layout, which gets its own, separate assistant.
 */
export function Mascot() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && <MascotPanel onClose={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Sweet'Oh AI" : "Ask Sweet'Oh AI"}
        className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--so-gold)" }}
      >
        <MascotCharacter size={36} />
      </button>
    </div>
  );
}
