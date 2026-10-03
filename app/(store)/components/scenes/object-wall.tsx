"use client";

import { useState } from "react";
import { Art, type ArtKind } from "./art";
import { OBJECTS, PrintedObject, type ObjectKind } from "./objects";

const ARTS: { kind: ArtKind; name: string }[] = [
  { kind: "bearings", name: "Bearings" },
  { kind: "tide", name: "Tide" },
  { kind: "plait", name: "Plait" },
];
const SHELF: ObjectKind[] = ["tee", "mug", "tumbler", "plaque", "sticker"];

/** One design, many physical things. Pick the design; every object on the shelf takes it. */
export function ObjectWall({ dark = false }: { dark?: boolean }) {
  const [art, setArt] = useState<ArtKind>("bearings");
  const [lit, setLit] = useState<ObjectKind | null>(null);
  return (
    <div>
      <div role="group" aria-label="Choose a design" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
        <span className="sx-mono" style={{ opacity: 0.8, marginRight: "0.4rem" }}>One design</span>
        {ARTS.map((a) => (
          <button
            key={a.kind}
            type="button"
            aria-pressed={art === a.kind}
            onClick={() => setArt(a.kind)}
            className="sx-chip"
            style={dark ? { color: art === a.kind ? "#16120d" : "#f4ecdd", borderColor: "#f4ecdd", background: art === a.kind ? "#f4ecdd" : "transparent", gap: "0.5rem" } : { gap: "0.5rem" }}
          >
            <Art kind={a.kind} mode="print" size={20} />
            {a.name}
          </button>
        ))}
      </div>
      <ul className="sx-shelf" style={{ listStyle: "none", padding: 0, margin: "1.6rem 0 0" }}>
        {SHELF.map((kind, i) => (
          <li key={kind} style={{ ["--i" as string]: i }}>
            <button
              type="button"
              className="sx-shelf-item"
              data-lit={lit === kind ? "true" : "false"}
              onMouseEnter={() => setLit(kind)}
              onMouseLeave={() => setLit(null)}
              onFocus={() => setLit(kind)}
              onBlur={() => setLit(null)}
              onClick={() => setLit(lit === kind ? null : kind)}
              aria-label={`${OBJECTS[kind].label}: ${OBJECTS[kind].note}`}
            >
              <svg viewBox="0 0 240 240" aria-hidden>
                <PrintedObject kind={kind} art={art} printed={1} />
              </svg>
              <span className="sx-mono">{OBJECTS[kind].label}</span>
              <span className="sx-shelf-note">{OBJECTS[kind].note}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
