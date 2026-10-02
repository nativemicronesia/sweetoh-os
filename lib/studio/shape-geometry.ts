/** Fabric-free outlines for Studio's built-in shapes, shared by the shape factory and the vector tools. */
export type ShapeOutlineKind = "rect" | "rounded" | "circle" | "oval" | "triangle" | "star" | "burst" | "heart" | "hexagon" | "arrow" | "line";

export function starPoints(w: number, h: number) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: w / 2 + Math.cos(a) * r * w, y: h * 0.53 + Math.sin(a) * r * h * 1.05 });
  }
  return pts;
}

export function polygonPoints(w: number, h: number, sides: number, innerRatio = 1) {
  return Array.from({ length: sides * (innerRatio < 1 ? 2 : 1) }, (_, i) => {
    const radius = innerRatio < 1 && i % 2 ? innerRatio : 1;
    const angle = -Math.PI / 2 + i * Math.PI / sides;
    return { x: w / 2 + Math.cos(angle) * radius * w * 0.48, y: h / 2 + Math.sin(angle) * radius * h * 0.48 };
  });
}

export function heartPathData(w: number, h: number): string {
  const sx = w / 100, sy = h / 90;
  const p = (x: number, y: number) => `${(x * sx).toFixed(1)} ${(y * sy).toFixed(1)}`;
  return `M ${p(50, 88)} C ${p(20, 66)} ${p(0, 48)} ${p(0, 28)} C ${p(0, 10)} ${p(14, 0)} ${p(28, 0)} C ${p(39, 0)} ${p(46, 6)} ${p(50, 14)} C ${p(54, 6)} ${p(61, 0)} ${p(72, 0)} C ${p(86, 0)} ${p(100, 10)} ${p(100, 28)} C ${p(100, 48)} ${p(80, 66)} ${p(50, 88)} Z`;
}

const KAPPA = 0.5522847498;

/** A shape as an editable outline in its own coordinates (0,0 to w,h), as path data. */
export function shapePathData(kind: ShapeOutlineKind, w: number, h: number): string {
  const f = (n: number) => Math.round(n * 100) / 100;
  const poly = (pts: { x: number; y: number }[]) => `M ${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(" L ")} Z`;
  const rounded = (r: number) => {
    const k = r * (1 - KAPPA);
    return `M ${f(r)} 0 L ${f(w - r)} 0 C ${f(w - k)} 0 ${f(w)} ${f(k)} ${f(w)} ${f(r)} L ${f(w)} ${f(h - r)} C ${f(w)} ${f(h - k)} ${f(w - k)} ${f(h)} ${f(w - r)} ${f(h)} L ${f(r)} ${f(h)} C ${f(k)} ${f(h)} 0 ${f(h - k)} 0 ${f(h - r)} L 0 ${f(r)} C 0 ${f(k)} ${f(k)} 0 ${f(r)} 0 Z`;
  };
  switch (kind) {
    case "rounded": return rounded(Math.min(w, h) * 0.18);
    case "line": return rounded(h / 2);
    case "circle":
    case "oval": {
      const rx = w / 2, ry = h / 2, kx = rx * KAPPA, ky = ry * KAPPA;
      return `M ${f(rx)} 0 C ${f(rx + kx)} 0 ${f(w)} ${f(ry - ky)} ${f(w)} ${f(ry)} C ${f(w)} ${f(ry + ky)} ${f(rx + kx)} ${f(h)} ${f(rx)} ${f(h)} C ${f(rx - kx)} ${f(h)} 0 ${f(ry + ky)} 0 ${f(ry)} C 0 ${f(ry - ky)} ${f(rx - kx)} 0 ${f(rx)} 0 Z`;
    }
    case "triangle": return poly([{ x: w / 2, y: 0 }, { x: w, y: h }, { x: 0, y: h }]);
    case "star": return poly(starPoints(w, h));
    case "burst": return poly(polygonPoints(w, h, 16, 0.62));
    case "hexagon": return poly(polygonPoints(w, h, 6));
    case "arrow": return poly([{ x: 0, y: h * 0.32 }, { x: w * 0.62, y: h * 0.32 }, { x: w * 0.62, y: 0 }, { x: w, y: h / 2 }, { x: w * 0.62, y: h }, { x: w * 0.62, y: h * 0.68 }, { x: 0, y: h * 0.68 }]);
    case "heart": return heartPathData(w, h);
    default: return poly([{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]);
  }
}
