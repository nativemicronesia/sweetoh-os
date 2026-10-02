import * as paperModule from "paper/dist/paper-core.js";
import { corner, type Contour, type VNode } from "./vector-path";

export type BooleanOp = "unite" | "subtract" | "intersect" | "exclude";

// paper-core is a CommonJS bundle; depending on the bundler the API sits on .default or on the module.
const paper = ((paperModule as unknown as { default?: typeof import("paper") }).default ?? paperModule) as unknown as typeof import("paper");

let ready = false;
function setup() {
  if (!ready) { paper.setup(new paper.Size(10, 10)); ready = true; }
}

function toPaper(contours: Contour[]) {
  const children = contours
    .filter((c) => c.closed && c.nodes.length >= 2)
    .map((c) => new paper.Path({
      closed: true,
      insert: false,
      segments: c.nodes.map((n) => new paper.Segment(new paper.Point(n.x, n.y), new paper.Point(n.inX - n.x, n.inY - n.y), new paper.Point(n.outX - n.x, n.outY - n.y))),
    }));
  return new paper.CompoundPath({ children, insert: false });
}

function fromPaper(item: paper.PathItem): Contour[] {
  const paths = (item as paper.CompoundPath).children ? ((item as paper.CompoundPath).children as paper.Path[]) : [item as paper.Path];
  const out: Contour[] = [];
  for (const path of paths) {
    if (!path.segments || path.segments.length < 2 || Math.abs(path.area) < 0.5) continue;
    const nodes: VNode[] = path.segments.map((s) => ({ ...corner(s.point.x, s.point.y), inX: s.point.x + s.handleIn.x, inY: s.point.y + s.handleIn.y, outX: s.point.x + s.handleOut.x, outY: s.point.y + s.handleOut.y }));
    out.push({ nodes, closed: true });
  }
  return out;
}

/**
 * The boolean itself, synchronously. paper.js can spin forever on shapes that
 * touch exactly (a circle inscribed in a square), so the editor never calls
 * this on the page thread: see combineContours in ./vector-boolean.ts.
 */
export function computeBoolean(op: BooleanOp, inputs: Contour[][]): Contour[] {
  setup();
  const items = inputs.map(toPaper);
  if (items.some((item) => item.children.length === 0)) throw new Error("Only closed shapes can be combined. Close the open path first.");
  let result: paper.PathItem = items[0];
  for (const next of items.slice(1)) result = result[op](next, { insert: false });
  const contours = fromPaper(result);
  if (!contours.length) throw new Error(op === "intersect" ? "These shapes don’t overlap." : "Nothing is left after combining these shapes.");
  return contours;
}
