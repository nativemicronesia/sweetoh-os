import { corner, type Contour, type VNode } from "./vector-path";

export type BooleanOp = "unite" | "subtract" | "intersect" | "exclude";
export const BOOLEAN_OPS: { op: BooleanOp; label: string; hint: string }[] = [
  { op: "unite", label: "Unite", hint: "Merge the shapes into one" },
  { op: "subtract", label: "Subtract", hint: "Cut the top shapes out of the bottom one" },
  { op: "intersect", label: "Intersect", hint: "Keep only where the shapes overlap" },
  { op: "exclude", label: "Exclude", hint: "Keep everything except where they overlap" },
];

type Paper = typeof import("paper");
let paperPromise: Promise<Paper> | null = null;
/** paper.js loads on demand: it is only needed the first time shapes are combined. */
async function loadPaper(): Promise<Paper> {
  paperPromise ??= import("paper/dist/paper-core.js").then((mod) => {
    const paper = ((mod as unknown as { default?: Paper }).default ?? mod) as unknown as Paper;
    paper.setup(new paper.Size(10, 10));
    return paper;
  });
  return paperPromise;
}

function toPaper(paper: Paper, contours: Contour[]) {
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
    const nodes: VNode[] = path.segments.map((s) => {
      const node = { ...corner(s.point.x, s.point.y), inX: s.point.x + s.handleIn.x, inY: s.point.y + s.handleIn.y, outX: s.point.x + s.handleOut.x, outY: s.point.y + s.handleOut.y };
      return node;
    });
    out.push({ nodes, closed: true });
  }
  return out;
}

/** Combine closed outlines; the first input is the base (bottom-most). */
export async function combineContours(op: BooleanOp, inputs: Contour[][]): Promise<Contour[]> {
  if (inputs.length < 2) throw new Error("Select at least two shapes to combine.");
  const paper = await loadPaper();
  const items = inputs.map((contours) => toPaper(paper, contours));
  if (items.some((item) => item.children.length === 0)) throw new Error("Only closed shapes can be combined. Close the open path first.");
  let result: paper.PathItem = items[0];
  for (const next of items.slice(1)) result = result[op](next, { insert: false });
  const contours = fromPaper(result);
  if (!contours.length) throw new Error(op === "intersect" ? "These shapes don’t overlap." : "Nothing is left after combining these shapes.");
  return contours;
}
