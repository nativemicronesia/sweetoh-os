import { Ellipse, FabricObject, Path, Polygon, Rect, Triangle } from "fabric";

export type ShapeKind = "rect" | "rounded" | "circle" | "triangle" | "star" | "heart" | "line";

export const SHAPES: { kind: ShapeKind; label: string; w: number; h: number }[] = [
  { kind: "rect", label: "Square", w: 140, h: 140 },
  { kind: "rounded", label: "Rounded", w: 140, h: 140 },
  { kind: "circle", label: "Circle", w: 140, h: 140 },
  { kind: "triangle", label: "Triangle", w: 150, h: 130 },
  { kind: "star", label: "Star", w: 150, h: 144 },
  { kind: "heart", label: "Heart", w: 150, h: 134 },
  { kind: "line", label: "Line", w: 220, h: 8 },
];

function starPoints(w: number, h: number) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: w / 2 + Math.cos(a) * r * w, y: h * 0.53 + Math.sin(a) * r * h * 1.05 });
  }
  return pts;
}

/** A Fabric object for a shape at its base size; placement is applied by the editor. */
export function makeShape(kind: ShapeKind, w: number, h: number, fill: string): FabricObject {
  switch (kind) {
    case "rounded":
      return new Rect({ width: w, height: h, fill, rx: Math.min(w, h) * 0.18, ry: Math.min(w, h) * 0.18 });
    case "circle":
      return new Ellipse({ rx: w / 2, ry: h / 2, fill });
    case "triangle":
      return new Triangle({ width: w, height: h, fill });
    case "star":
      return new Polygon(starPoints(w, h), { fill });
    case "heart": {
      const sx = w / 100, sy = h / 90;
      const p = (x: number, y: number) => `${(x * sx).toFixed(1)} ${(y * sy).toFixed(1)}`;
      return new Path(
        `M ${p(50, 88)} C ${p(20, 66)} ${p(0, 48)} ${p(0, 28)} C ${p(0, 10)} ${p(14, 0)} ${p(28, 0)} C ${p(39, 0)} ${p(46, 6)} ${p(50, 14)} C ${p(54, 6)} ${p(61, 0)} ${p(72, 0)} C ${p(86, 0)} ${p(100, 10)} ${p(100, 28)} C ${p(100, 48)} ${p(80, 66)} ${p(50, 88)} Z`,
        { fill },
      );
    }
    case "line":
      return new Rect({ width: w, height: h, fill, rx: h / 2, ry: h / 2 });
    default:
      return new Rect({ width: w, height: h, fill });
  }
}
