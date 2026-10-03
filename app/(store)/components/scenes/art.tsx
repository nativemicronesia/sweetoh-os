/**
 * Original SweetOh artwork for the storefront. Each piece is geometry first: the same
 * shapes are drawn as a pencil sketch (the idea) and as finished print (the design),
 * so the page can show one thing becoming another. These are deliberately original,
 * abstract forms (bearings, tide, plait): not borrowed traditional or sacred designs.
 */
import { useId, type ReactNode } from "react";

export type ArtKind = "bearings" | "tide" | "plait";
export type ArtMode = "sketch" | "print";

type Shape = { d: string; fill: string };

const INK = "#16120d";
const VERMILION = "#d93d22";
const REEF = "#0d5654";
const CYAN = "#1b8ea6";
const YELLOW = "#f0c419";
const MAGENTA = "#c63a79";
const PAPER = "#f4ecdd";

const polar = (cx: number, cy: number, r: number, a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
const n = (v: number) => Math.round(v * 10) / 10;

/** Small, repeatable wobble so the sketch reads as hand-drawn, not vector-perfect. */
function wobble(seed: number, amount = 1.3) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amount;
}

function bearings(): Shape[] {
  const shapes: Shape[] = [];
  const spokes = 24;
  const colors = [VERMILION, INK, REEF, VERMILION, INK, CYAN];
  for (let i = 0; i < spokes; i++) {
    const a0 = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 0.72) / spokes) * Math.PI * 2 - Math.PI / 2;
    const outer = i % 2 === 0 ? 92 : 62;
    const [x0, y0] = polar(100, 100, 24, a0);
    const [x1, y1] = polar(100, 100, outer, a0);
    const [x2, y2] = polar(100, 100, outer, a1);
    const [x3, y3] = polar(100, 100, 24, a1);
    shapes.push({ d: `M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)} L${n(x2)} ${n(y2)} L${n(x3)} ${n(y3)} Z`, fill: colors[i % colors.length] });
  }
  shapes.push({ d: "M100 82 a18 18 0 1 0 0.01 0 Z", fill: YELLOW });
  for (let i = 0; i < 12; i++) {
    const [x, y] = polar(100, 100, 98, (i / 12) * Math.PI * 2);
    shapes.push({ d: `M${n(x)} ${n(y - 2.4)} a2.4 2.4 0 1 0 0.01 0 Z`, fill: INK });
  }
  return shapes;
}

function tide(): Shape[] {
  const colors = [PAPER, CYAN, REEF, YELLOW, VERMILION, INK];
  const shapes: Shape[] = [{ d: "M0 0 H200 V200 H0 Z", fill: colors[0] }];
  for (let i = 0; i < 6; i++) {
    const y = 38 + i * 26;
    const amp = 11 - i * 0.6;
    let d = `M0 ${y}`;
    for (let x = 0; x < 200; x += 50) d += ` Q${x + 25} ${n(y - amp * (i % 2 ? -1 : 1))} ${x + 50} ${y}`;
    d += " V200 H0 Z";
    shapes.push({ d, fill: colors[(i + 1) % colors.length] });
  }
  return shapes;
}

function plait(): Shape[] {
  const colors = [VERMILION, INK, REEF, YELLOW, CYAN, MAGENTA];
  const shapes: Shape[] = [{ d: "M0 0 H200 V200 H0 Z", fill: PAPER }];
  const cell = 40;
  for (let row = -1; row < 6; row++) {
    for (let col = -1; col < 6; col++) {
      const cx = col * cell + (row % 2 ? cell / 2 : 0) + 20;
      const cy = row * (cell / 2) + 20;
      const pick = (row * 3 + col * 5 + 60) % colors.length;
      shapes.push({ d: `M${cx} ${cy - 20} L${cx + 20} ${cy} L${cx} ${cy + 20} L${cx - 20} ${cy} Z`, fill: colors[pick] });
      shapes.push({ d: `M${cx} ${cy - 9} L${cx + 9} ${cy} L${cx} ${cy + 9} L${cx - 9} ${cy} Z`, fill: PAPER });
    }
  }
  return shapes;
}

const BUILD: Record<ArtKind, () => Shape[]> = { bearings, tide, plait };

/** Clip shape of each artwork inside its 200 × 200 box. */
export const ART_CLIP: Record<ArtKind, string> = {
  bearings: "M100 100 m-100 0 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0",
  tide: "M100 100 m-100 0 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0",
  plait: "M10 0 H190 a10 10 0 0 1 10 10 V190 a10 10 0 0 1 -10 10 H10 a10 10 0 0 1 -10 -10 V10 A10 10 0 0 1 10 0 Z",
};

/** One artwork, as sketch (outlines drawn on) or finished print (colour fills). */
export function Art({ kind, mode, size = 200, drawn = 1, className }: { kind: ArtKind; mode: ArtMode; size?: number; drawn?: number; className?: string }): ReactNode {
  const shapes = BUILD[kind]();
  const id = `art-${kind}-${mode}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (mode === "print") {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden>
        <defs><clipPath id={id}><path d={ART_CLIP[kind]} /></clipPath></defs>
        <g clipPath={`url(#${id})`}>{shapes.map((s, i) => <path key={i} d={s.d} fill={s.fill} />)}</g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <defs><clipPath id={id}><path d={ART_CLIP[kind]} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        {shapes.slice(1).map((s, i) => (
          <path key={i} d={s.d} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawn, transform: `translate(${n(wobble(i, 0.9))}px, ${n(wobble(i + 77, 0.9))}px)` }} />
        ))}
      </g>
      <path d={ART_CLIP[kind]} pathLength={1} strokeWidth="1.6" style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawn }} />
    </svg>
  );
}
