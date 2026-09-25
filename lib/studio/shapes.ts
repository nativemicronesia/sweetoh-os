import { Ellipse, FabricObject, Path, Polygon, Rect, Triangle } from "fabric";

export type ShapeKind = "rect" | "rounded" | "circle" | "oval" | "triangle" | "star" | "burst" | "heart" | "hexagon" | "arrow" | "line";

export const SHAPES: { kind: ShapeKind; label: string; w: number; h: number }[] = [
  { kind: "rect", label: "Square", w: 140, h: 140 },
  { kind: "rounded", label: "Rounded", w: 140, h: 140 },
  { kind: "circle", label: "Circle", w: 140, h: 140 },
  { kind: "oval", label: "Oval", w: 170, h: 110 },
  { kind: "triangle", label: "Triangle", w: 150, h: 130 },
  { kind: "star", label: "Star", w: 150, h: 144 },
  { kind: "burst", label: "Burst", w: 150, h: 150 },
  { kind: "heart", label: "Heart", w: 150, h: 134 },
  { kind: "hexagon", label: "Hexagon", w: 150, h: 134 },
  { kind: "arrow", label: "Arrow", w: 180, h: 100 },
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
function polygonPoints(w: number, h: number, sides: number, innerRatio = 1) {
  return Array.from({ length: sides * (innerRatio < 1 ? 2 : 1) }, (_, i) => {
    const radius = innerRatio < 1 && i % 2 ? innerRatio : 1;
    const angle = -Math.PI / 2 + i * Math.PI / sides;
    return { x: w / 2 + Math.cos(angle) * radius * w * 0.48, y: h / 2 + Math.sin(angle) * radius * h * 0.48 };
  });
}

/** A Fabric object for a shape at its base size; placement is applied by the editor. */
export function makeShape(kind: ShapeKind, w: number, h: number, fill: string, stroke?: string, strokeWidth = 0): FabricObject {
  const style = { fill, stroke: strokeWidth ? stroke : undefined, strokeWidth };
  switch (kind) {
    case "rounded":
      return new Rect({ width: w, height: h, ...style, rx: Math.min(w, h) * 0.18, ry: Math.min(w, h) * 0.18 });
    case "circle":
      return new Ellipse({ rx: w / 2, ry: h / 2, ...style });
    case "oval":
      return new Ellipse({ rx: w / 2, ry: h / 2, ...style });
    case "triangle":
      return new Triangle({ width: w, height: h, ...style });
    case "star":
      return new Polygon(starPoints(w, h), style);
    case "burst":
      return new Polygon(polygonPoints(w, h, 16, 0.62), style);
    case "hexagon":
      return new Polygon(polygonPoints(w, h, 6), style);
    case "arrow":
      return new Polygon([{ x: 0, y: h * .32 }, { x: w * .62, y: h * .32 }, { x: w * .62, y: 0 }, { x: w, y: h / 2 }, { x: w * .62, y: h }, { x: w * .62, y: h * .68 }, { x: 0, y: h * .68 }], style);
    case "heart": {
      const sx = w / 100, sy = h / 90;
      const p = (x: number, y: number) => `${(x * sx).toFixed(1)} ${(y * sy).toFixed(1)}`;
      return new Path(
        `M ${p(50, 88)} C ${p(20, 66)} ${p(0, 48)} ${p(0, 28)} C ${p(0, 10)} ${p(14, 0)} ${p(28, 0)} C ${p(39, 0)} ${p(46, 6)} ${p(50, 14)} C ${p(54, 6)} ${p(61, 0)} ${p(72, 0)} C ${p(86, 0)} ${p(100, 10)} ${p(100, 28)} C ${p(100, 48)} ${p(80, 66)} ${p(50, 88)} Z`,
        style,
      );
    }
    case "line":
      return new Rect({ width: w, height: h, ...style, rx: h / 2, ry: h / 2 });
    default:
      return new Rect({ width: w, height: h, ...style });
  }
}
