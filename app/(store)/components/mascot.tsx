"use client";

import { useState } from "react";
import { SkinkAvatar } from "./skink-avatar";
import { MascotPanel } from "./mascot-panel";

/**
 * Site-wide and non-intrusive: Skink waits in the corner, never pops up on its own, and opens only when
 * clicked. Mounted once in the (store) layout so it's on every customer-facing page; deliberately not in
 * the partner layout, which has its own assistant.
 */
export function Mascot() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <MascotPanel onClose={() => setOpen(false)} />}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Ask Skink" className="sx-skink-fab">
          <span className="sx-skink-hello" aria-hidden>Ask me</span>
          <SkinkAvatar size={92} perch />
        </button>
      )}
    </>
  );
}
