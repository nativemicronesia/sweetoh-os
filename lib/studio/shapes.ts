import { Ellipse, FabricObject, Path, Polygon, Rect, Triangle } from "fabric";
import { heartPathData, polygonPoints, starPoints } from "./shape-geometry";

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
    case "heart":
      return new Path(heartPathData(w, h), style);
    case "line":
      return new Rect({ width: w, height: h, ...style, rx: h / 2, ry: h / 2 });
    default:
      return new Rect({ width: w, height: h, ...style });
  }
}
