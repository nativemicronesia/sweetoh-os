/**
 * Where SweetOh is made and where it is rooted. A simple plotted chart (longitude across, latitude
 * down, dateline crossed), not a decorative map: Lacey, Washington to the islands, and out to anywhere.
 */
const W = 1000;
const H = 420;
const px = (lon: number) => (((lon + 360) % 360) - 120) / 130 * W;
const py = (lat: number) => ((50 - lat) / 52) * 400 + 6;

const LACEY = { x: px(-122.8), y: py(47) };
const PLACES = [
  { name: "Palau", lon: 134.5, lat: 7.5, side: "left" },
  { name: "Guam", lon: 144.8, lat: 13.4, side: "top" },
  { name: "Pohnpei", lon: 158.2, lat: 6.9, side: "bottom" },
  { name: "Marshall Islands", lon: 171.4, lat: 7.1, side: "top" },
  { name: "Kiribati", lon: 173, lat: 1.4, side: "bottom" },
] as const;

export function PlaceMap({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="A chart from Lacey, Washington across the Pacific to Guam, Palau, Pohnpei, the Marshall Islands and Kiribati." style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}>
      <g stroke="currentColor" strokeOpacity=".16" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={`v${i}`} x1={i * (W / 6)} x2={i * (W / 6)} y1="0" y2={H} />)}
        {[0, 1, 2, 3, 4].map((i) => <line key={`h${i}`} x1="0" x2={W} y1={i * 100 + 6} y2={i * 100 + 6} />)}
      </g>
      {PLACES.map((p, i) => {
        const x = px(p.lon);
        const y = py(p.lat);
        const mx = (LACEY.x + x) / 2;
        const my = Math.min(LACEY.y, y) - 70 - i * 6;
        return <path key={p.name} d={`M${LACEY.x} ${LACEY.y} Q${mx} ${my} ${x} ${y}`} className="sx-place-line" style={{ stroke: "currentColor" }} />;
      })}
      {PLACES.map((p) => {
        const x = px(p.lon);
        const y = py(p.lat);
        const dy = p.side === "top" ? -16 : p.side === "bottom" ? 26 : 5;
        const dx = p.side === "left" ? -14 : 0;
        return (
          <g key={p.name} className="sx-place-pt">
            <circle cx={x} cy={y} r="13" fill="none" stroke="#d93d22" strokeOpacity=".4" />
            <circle cx={x} cy={y} r="6" className="sx-place-dot" />
            <text x={x + dx} y={y + dy} textAnchor={p.side === "left" ? "end" : "middle"} fill="currentColor">{p.name.toUpperCase()}</text>
          </g>
        );
      })}
      <g className="sx-place-pt">
        <circle cx={LACEY.x} cy={LACEY.y} r="14" fill="#f0c419" stroke="currentColor" strokeWidth="2" />
        <circle cx={LACEY.x} cy={LACEY.y} r="5" fill="currentColor" />
        <text x={LACEY.x} y={LACEY.y + 38} textAnchor="middle" fill="currentColor">LACEY, WASHINGTON</text>
      </g>
    </svg>
  );
}
