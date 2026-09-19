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
        className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #133f28, #2e8b4f)", boxShadow: "0 10px 30px rgba(19,63,40,.35)" }}
      >
        <MascotCharacter size={34} />
        {open ? "Close" : "Ask Skink"}
      </button>
    </div>
  );
}
