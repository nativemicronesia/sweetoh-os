import { PACIFIC } from "./pacific-data";

/**
 * Real geography (Natural Earth, public domain): the Pacific from Asia to Washington state, and a
 * close-up of Micronesia with every nation's coastline drawn to scale. Lacey, Washington is where
 * it's made; the islands are where it's rooted.
 */
const NATIONS = ["palau", "fsm", "guam", "cnmi", "marshall", "nauru", "kiribati"] as const;

export function PlaceMap({ className }: { className?: string }) {
  const { wide, close } = PACIFIC;
  const [zx0, zy0, zx1, zy1] = wide.zoom;
  const [lx, ly] = wide.lacey;
  const mid = [(zx0 + zx1) / 2, zy0];
  const islands = (paths: Record<string, string>, w: number, halo: number) =>
    NATIONS.map((n) => (
      <g key={n}>
        <path d={paths[n]} fill="none" stroke="#d93d22" strokeOpacity=".28" strokeWidth={halo} strokeLinejoin="round" />
        <path d={paths[n]} fill="#d93d22" stroke="#d93d22" strokeWidth={w} strokeLinejoin="round" />
      </g>
    ));
  return (
    <figure className={className} style={{ margin: 0, position: "relative" }}>
      <div className="sx-map-scroll" tabIndex={0} role="region" aria-label="Map of Micronesia, scrolls sideways on small screens">
      <svg viewBox={`0 0 ${close.width} ${close.height}`} role="img" aria-label="Map of Micronesia: Palau, the Federated States of Micronesia, Guam, the Northern Mariana Islands, the Marshall Islands, Nauru and Kiribati, drawn from real coastlines." style={{ width: "100%", height: "auto", display: "block", background: "color-mix(in srgb, #1b8ea6 9%, var(--so-black))", border: "1.5px solid currentColor" }}>
        <path d={close.grat} fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth="1" />
        <path d={close.land} fill="#e9dcc0" stroke="currentColor" strokeOpacity=".55" strokeWidth="1" strokeLinejoin="round" />
        {islands(close.nations, 3.2, 12)}
        {close.labels.map((l) => <text key={l.text} x={l.x} y={l.y} textAnchor={l.anchor} className="sx-map-label sx-map-nation" fill="currentColor">{l.text}</text>)}
        {close.places.map((p) => (
          <g key={p.name}>
            <circle cx={p.x} cy={p.y} r="4" fill="#f0c419" stroke="currentColor" strokeWidth="1.6" />
            <text x={p.x + (p.side === "e" ? 10 : 0)} y={p.y + (p.side === "n" ? -11 : p.side === "s" ? 20 : 4)} textAnchor={p.side === "e" ? "start" : "middle"} className="sx-map-place" fill="currentColor">{p.name}</text>
          </g>
        ))}
        <g transform="translate(24 24)" className="sx-map-label"><text fill="currentColor">MICRONESIA · DRAWN FROM REAL COASTLINES</text></g>
      </svg>
      </div>
      <div className="sx-map-inset">
        <svg viewBox={`0 0 ${wide.width} ${wide.height}`} role="img" aria-label="Locator: the Pacific from Asia to Washington state, with Lacey, Washington and Micronesia marked." style={{ width: "100%", height: "auto", display: "block" }}>
          <rect width={wide.width} height={wide.height} fill="var(--so-black)" />
          <path d={wide.grat} fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="1.5" />
          <path d={wide.land} fill="#e9dcc0" stroke="currentColor" strokeOpacity=".6" strokeWidth="2" strokeLinejoin="round" />
          {islands(wide.nations, 5, 16)}
          <rect x={zx0} y={zy0} width={zx1 - zx0} height={zy1 - zy0} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="9 8" />
          <path d={`M${lx} ${ly} Q${(lx + mid[0]) / 2} ${ly - 130} ${mid[0]} ${mid[1]}`} fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="4 11" strokeLinecap="round" />
          <circle cx={lx} cy={ly} r="18" fill="#f0c419" stroke="currentColor" strokeWidth="4" />
          <text x={lx - 22} y={ly + 56} textAnchor="end" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "0.08em" }} className="sx-map-label" fill="currentColor">LACEY, WA</text>
        </svg>
      </div>
    </figure>
  );
}
