"use client";

import { useState } from "react";
import { Art, type ArtKind } from "./art";
import { OBJECTS, PrintedObject, type ObjectKind } from "./objects";

const ARTS: { kind: ArtKind; name: string }[] = [
  { kind: "bearings", name: "Bearings" },
  { kind: "tide", name: "Tide" },
  { kind: "plait", name: "Plait" },
];
const SURFACES: ObjectKind[] = ["tee", "mug", "tumbler", "plaque", "sticker"];
const COLORS: Record<ObjectKind, { name: string; value: string }[]> = {
  tee: [{ name: "Cream", value: "#f7f1e4" }, { name: "Black", value: "#1f1b16" }, { name: "Reef", value: "#0d5654" }, { name: "Sun", value: "#f0c419" }],
  mug: [{ name: "White", value: "#f7f1e4" }, { name: "Black", value: "#1f1b16" }, { name: "Reef", value: "#0d5654" }, { name: "Red", value: "#d93d22" }],
  tumbler: [{ name: "Black", value: "#16120d" }, { name: "Reef", value: "#0d5654" }, { name: "Cream", value: "#e9dcc0" }, { name: "Red", value: "#b32f17" }],
  plaque: [], sticker: [],
};

/** A taste of Studio: choose a design, a surface and a colour, and see it fitted to the real thing. */
export function StudioDemo() {
  const [art, setArt] = useState<ArtKind>("bearings");
  const [kind, setKind] = useState<ObjectKind>("tee");
  const [color, setColor] = useState<string | undefined>(undefined);
  const colors = COLORS[kind];
  const pick = (k: ObjectKind) => { setKind(k); setColor(undefined); };
  return (
    <div className="sx-demo sx-card">
      <div className="sx-demo-bar">
        {[0, 1, 2].map((i) => <i key={i} style={{ background: ["#d93d22", "#f0c419", "#1b8ea6"][i] }} />)}
        <span className="sx-mono">Studio · a taste</span>
      </div>
      <div className="sx-demo-body">
        <div className="sx-demo-tools">
          <p className="sx-mono">1 · Design</p>
          <div className="sx-demo-row">
            {ARTS.map((a) => (
              <button key={a.kind} type="button" className="sx-tool" aria-pressed={art === a.kind} aria-label={a.name} onClick={() => setArt(a.kind)}><Art kind={a.kind} mode="print" size={44} /></button>
            ))}
          </div>
          <p className="sx-mono">2 · Surface</p>
          <div className="sx-demo-row">
            {SURFACES.map((k) => (
              <button key={k} type="button" className="sx-chip" aria-pressed={kind === k} onClick={() => pick(k)}>{OBJECTS[k].label}</button>
            ))}
          </div>
          <p className="sx-mono" style={{ visibility: colors.length ? "visible" : "hidden" }}>3 · Color</p>
          <div className="sx-demo-row" style={{ minHeight: 44 }}>
            {colors.map((c) => (
              <button key={c.name} type="button" className="sx-swatch" aria-label={c.name} aria-pressed={(color ?? colors[0].value) === c.value} onClick={() => setColor(c.value)} style={{ background: c.value }} />
            ))}
          </div>
          <p className="sx-demo-note">{OBJECTS[kind].label}: {OBJECTS[kind].note}. In the real Studio, the print area is drawn at true size and checked before anything is made.</p>
        </div>
        <div className="sx-demo-stage" aria-live="polite">
          <svg viewBox="0 0 240 240" role="img" aria-label={`${ARTS.find((a) => a.kind === art)?.name} design on a ${OBJECTS[kind].label.toLowerCase()}`}>
            <PrintedObject key={`${kind}-${art}`} kind={kind} art={art} printed={1} color={color} />
          </svg>
        </div>
      </div>
    </div>
  );
}
