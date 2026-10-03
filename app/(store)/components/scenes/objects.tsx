/**
 * Physical objects SweetOh makes, drawn as flat SVG forms the artwork can be printed onto.
 * Each object exposes its real print zone, so the page can show a design being fitted to
 * a surface (the same artwork, a different physical shape), not just pasted on a picture.
 */
import { useId, type ReactNode } from "react";
import { Art, type ArtKind } from "./art";

export type ObjectKind = "mug" | "tee" | "tumbler" | "plaque" | "sticker";

export const OBJECTS: Record<ObjectKind, { label: string; note: string; zone: { x: number; y: number; size: number } }> = {
  mug: { label: "Mug", note: "wraps the ceramic", zone: { x: 84, y: 82, size: 74 } },
  tee: { label: "Tee", note: "sits on the chest", zone: { x: 88, y: 72, size: 66 } },
  tumbler: { label: "Tumbler", note: "wraps the steel", zone: { x: 92, y: 96, size: 58 } },
  plaque: { label: "Engraving", note: "burned into wood", zone: { x: 72, y: 76, size: 96 } },
  sticker: { label: "Sticker", note: "cut to its own edge", zone: { x: 46, y: 46, size: 148 } },
};

const SHADE = (id: string) => (
  <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stopColor="#000" stopOpacity=".16" />
    <stop offset=".22" stopColor="#000" stopOpacity="0" />
    <stop offset=".42" stopColor="#fff" stopOpacity=".2" />
    <stop offset=".8" stopColor="#000" stopOpacity=".05" />
    <stop offset="1" stopColor="#000" stopOpacity=".24" />
  </linearGradient>
);

type Props = { kind: ObjectKind; art: ArtKind; printed: number; color?: string };

/** An object with the artwork printed on it. `printed` (0 to 1) is how far the print has run. */
export function PrintedObject({ kind, art, printed, color }: Props): ReactNode {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { zone } = OBJECTS[kind];
  const wipe = `wipe-${uid}`;
  const body = `body-${uid}`;
  const shade = `shade-${uid}`;
  const artNode = (
    <g clipPath={`url(#${wipe})`}>
      <g transform={`translate(${zone.x} ${zone.y})`}>
        <Art kind={art} mode="print" size={zone.size} />
      </g>
    </g>
  );
  const wipeClip = (
    <clipPath id={wipe}>
      <rect x="0" y="0" width="240" height="240" style={{ transform: `scaleY(${Math.max(0.001, printed)})`, transformOrigin: "top", transformBox: "fill-box", transition: "transform 1.1s cubic-bezier(.22,1,.36,1)" }} />
    </clipPath>
  );
  const marks = (
    <g stroke="#16120d" strokeWidth="1" opacity={printed < 1 ? 0.75 : 0.0} style={{ transition: "opacity .5s ease .6s" }} fill="none">
      <path d={`M${zone.x - 8} ${zone.y} h6 M${zone.x} ${zone.y - 8} v6`} />
      <path d={`M${zone.x + zone.size + 8} ${zone.y} h-6 M${zone.x + zone.size} ${zone.y - 8} v6`} />
      <path d={`M${zone.x - 8} ${zone.y + zone.size} h6 M${zone.x} ${zone.y + zone.size + 8} v-6`} />
      <path d={`M${zone.x + zone.size + 8} ${zone.y + zone.size} h-6 M${zone.x + zone.size} ${zone.y + zone.size + 8} v-6`} />
    </g>
  );

  if (kind === "mug") {
    const c = color ?? "#f7f1e4";
    return (
      <g>
        <defs>{SHADE(shade)}<clipPath id={body}><path d="M62 62 L62 176 Q62 190 76 190 L164 190 Q178 190 178 176 L178 62 Z" /></clipPath>{wipeClip}</defs>
        <ellipse cx="120" cy="204" rx="74" ry="8" fill="#16120d" opacity=".14" />
        <path d="M178 84 C222 78 226 138 196 154 C190 157 184 158 178 158" fill="none" stroke="#16120d" strokeOpacity=".22" strokeWidth="19" strokeLinecap="round" />
        <path d="M178 84 C222 78 226 138 196 154 C190 157 184 158 178 158" fill="none" stroke={c} strokeWidth="14" strokeLinecap="round" />
        <path d="M62 62 L62 176 Q62 190 76 190 L164 190 Q178 190 178 176 L178 62 Z" fill={c} />
        <ellipse cx="120" cy="62" rx="58" ry="11" fill="#fff" opacity=".7" /><ellipse cx="120" cy="63" rx="52" ry="8" fill="#3a2e20" />
        <g clipPath={`url(#${body})`}>{artNode}<rect x="62" y="62" width="116" height="130" fill={`url(#${shade})`} /></g>
        {marks}
      </g>
    );
  }
  if (kind === "tee") {
    const c = color ?? "#f7f1e4";
    const path = "M84 30 Q120 50 156 30 L206 52 L224 98 L190 110 L184 100 L184 208 L56 208 L56 100 L50 110 L16 98 L34 52 Z";
    return (
      <g>
        <defs>{SHADE(shade)}<clipPath id={body}><path d={path} /></clipPath>{wipeClip}</defs>
        <ellipse cx="120" cy="222" rx="80" ry="7" fill="#16120d" opacity=".12" />
        <path d={path} fill={c} stroke="#16120d" strokeOpacity=".18" strokeWidth="1.5" />
        <path d="M84 30 Q120 52 156 30" fill="none" stroke="#16120d" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round" />
        <g clipPath={`url(#${body})`}>{artNode}<rect x="0" y="0" width="240" height="240" fill={`url(#${shade})`} opacity=".7" /></g>
        {marks}
      </g>
    );
  }
  if (kind === "tumbler") {
    const c = color ?? "#16120d";
    const path = "M76 52 H164 L152 208 Q151 218 141 218 H99 Q89 218 88 208 Z";
    return (
      <g>
        <defs>{SHADE(shade)}<clipPath id={body}><path d={path} /></clipPath>{wipeClip}</defs>
        <ellipse cx="120" cy="226" rx="46" ry="6" fill="#16120d" opacity=".16" />
        <path d="M144 52 L152 8 L160 8" fill="none" stroke="#16120d" strokeOpacity=".5" strokeWidth="5" strokeLinecap="round" />
        <path d={path} fill={c} />
        <rect x="70" y="38" width="100" height="16" rx="6" fill="#e9dcc0" stroke="#16120d" strokeOpacity=".3" />
        <g clipPath={`url(#${body})`}>{artNode}<rect x="76" y="52" width="88" height="170" fill={`url(#${shade})`} /></g>
        {marks}
      </g>
    );
  }
  if (kind === "plaque") {
    return (
      <g>
        <defs>
          <clipPath id={body}><rect x="40" y="50" width="160" height="140" rx="10" /></clipPath>
          <linearGradient id={`wood-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c49a62" /><stop offset="1" stopColor="#a87c46" /></linearGradient>
          {wipeClip}
        </defs>
        <ellipse cx="120" cy="206" rx="86" ry="7" fill="#16120d" opacity=".16" />
        <rect x="40" y="50" width="160" height="140" rx="10" fill={`url(#wood-${uid})`} />
        <g clipPath={`url(#${body})`}>
          <g stroke="#7a5428" strokeOpacity=".25" strokeWidth="1" fill="none">{[70, 88, 106, 124, 142, 160, 178].map((y) => <path key={y} d={`M40 ${y} q40 -5 80 0 t80 0`} />)}</g>
          <g style={{ mixBlendMode: "multiply", filter: "grayscale(1) contrast(1.4) brightness(.45)" }} opacity=".85">{artNode}</g>
        </g>
        {marks}
      </g>
    );
  }
  // sticker
  return (
    <g>
      <defs>{wipeClip}</defs>
      <g transform="rotate(-6 120 120)">
        <circle cx="120" cy="124" r="96" fill="#16120d" opacity=".16" />
        <circle cx="120" cy="120" r="96" fill="#fffdf6" stroke="#16120d" strokeOpacity=".15" />
        {artNode}
      </g>
      {marks}
    </g>
  );
}
