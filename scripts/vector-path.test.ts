import assert from "node:assert/strict";
import test from "node:test";
import { contourBounds, contoursToPathData, insertNode, mapContours, moveHandle, nearestOnContours, parsePathData, penNode, removeNode, setNodeSmooth, type Contour } from "../lib/studio/vector-path";
import { shapePathData, type ShapeOutlineKind } from "../lib/studio/shape-geometry";
import { studioLayoutSchema } from "../lib/domains/catalog/studio-layout";
import { studioEditorCommandSchema } from "../lib/studio/editor-commands";

const KINDS: ShapeOutlineKind[] = ["rect", "rounded", "circle", "oval", "triangle", "star", "burst", "heart", "hexagon", "arrow", "line"];

test("every built-in shape has an editable outline that round-trips and fits its box", () => {
  for (const kind of KINDS) {
    const d = shapePathData(kind, 200, 100);
    const contours = parsePathData(d);
    assert.equal(contours.length, 1, kind);
    assert.ok(contours[0].closed, kind);
    const again = parsePathData(contoursToPathData(contours));
    assert.equal(again[0].nodes.length, contours[0].nodes.length, kind);
    const box = contourBounds(contours)!;
    assert.ok(box.width <= 200.5 && box.height <= 100.5 && box.width > 60, `${kind} ${box.width}x${box.height}`);
    assert.match(d, /^[MLQCZ0-9\s.,+-]+$/, kind);
  }
});

test("a circle is four smooth nodes spanning its box", () => {
  const [circle] = parsePathData(shapePathData("circle", 100, 100));
  assert.equal(circle.nodes.length, 4);
  assert.ok(circle.nodes.every((n) => n.smooth));
  const box = contourBounds([circle])!;
  assert.ok(Math.abs(box.width - 100) < 0.5 && Math.abs(box.height - 100) < 0.5);
});

test("a closing line back to the start does not duplicate the first node", () => {
  const [c] = parsePathData("M 0 0 L 10 0 L 10 10 L 0 0 Z");
  assert.equal(c.nodes.length, 3);
  assert.ok(c.closed);
});

test("quadratic curves are stored as cubic nodes", () => {
  const [c] = parsePathData("M 0 0 Q 50 100 100 0");
  assert.equal(c.nodes.length, 2);
  assert.match(contoursToPathData([c]), /C/);
});

test("insert, remove and smooth edit a contour", () => {
  const [c] = parsePathData("M 0 0 L 100 0 L 100 100 L 0 100 Z");
  const hit = nearestOnContours([c], 50, 3)!;
  assert.equal(hit.segment, 0);
  assert.ok(Math.abs(hit.x - 50) < 1 && hit.distance < 4);
  const index = insertNode(c, hit.segment, hit.t);
  assert.equal(c.nodes.length, 5);
  assert.ok(Math.abs(c.nodes[index].x - 50) < 1);
  assert.ok(removeNode(c, index));
  assert.equal(c.nodes.length, 4);
  setNodeSmooth(c, 1, true);
  assert.ok(c.nodes[1].smooth);
  moveHandle(c.nodes[1], "out", c.nodes[1].x + 30, c.nodes[1].y + 20);
  const n = c.nodes[1];
  const ox = n.outX - n.x, oy = n.outY - n.y, ix = n.inX - n.x, iy = n.inY - n.y;
  assert.ok(Math.abs(ox * iy - oy * ix) < 1e-6 && ox * ix + oy * iy < 0, "in handle mirrors the direction of the out handle");
  const triangle: Contour = parsePathData("M 0 0 L 10 0 L 5 10 Z")[0];
  assert.equal(removeNode(triangle, 0), false);
});

test("a dragged pen click makes a smooth node with mirrored handles", () => {
  const n = penNode(10, 10, 30, 10);
  assert.equal(n.inX, -10);
  assert.ok(n.smooth);
  assert.equal(penNode(10, 10, 11, 10).smooth, undefined);
});

test("mapping moves anchors and handles together", () => {
  const moved = mapContours(parsePathData(shapePathData("circle", 100, 100)), (x, y) => [x + 10, y * 2]);
  const box = contourBounds(moved)!;
  assert.ok(Math.abs(box.x - 10) < 0.5 && Math.abs(box.height - 200) < 1);
});

test("path layers validate and reject unsafe path data", () => {
  const layer = (pathData: string) => ({ version: 1, surfaces: [{ id: "design", name: "Design", assetId: null, position: "design", area: { x: 0, y: 0, width: 1, height: 1 }, layers: [{ id: "p1", kind: "path", pathData, fill: "#173e39", x: 0, y: 0, scaleX: 1, scaleY: 1, angle: 0 }] }] });
  assert.ok(studioLayoutSchema.safeParse(layer(shapePathData("heart", 100, 90))).success);
  assert.equal(studioLayoutSchema.safeParse(layer("M 0 0 <script>")).success, false);
  assert.equal(studioLayoutSchema.safeParse(layer("M 0 0 A 5 5 0 0 1 10 10")).success, false);
  assert.ok(studioEditorCommandSchema);
});

import { combineContours, nudged, TOO_COMPLEX } from "../lib/studio/vector-boolean";
import { computeBoolean } from "../lib/studio/vector-boolean-core";

/** Stand-in for the worker: same math, in this process, so tests do not need a browser. */
const inProcess = (op: Parameters<typeof computeBoolean>[0], inputs: Contour[][]) => ({ promise: Promise.resolve().then(() => computeBoolean(op, inputs)), cancel: () => {} });

const box = (x: number, y: number, w: number, h: number) => parsePathData(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`);

test("combining shapes: unite, subtract, intersect, exclude", async () => {
  const a = box(0, 0, 100, 100), b = box(50, 50, 100, 100);
  const area = (cs: Contour[]) => { const r = contourBounds(cs)!; return r.width * r.height; };
  const united = await combineContours("unite", [a, b], inProcess);
  assert.equal(united.length, 1);
  assert.deepEqual([Math.round(contourBounds(united)!.width), Math.round(contourBounds(united)!.height)], [150, 150]);
  const cut = await combineContours("subtract", [a, b], inProcess);
  assert.equal(cut.length, 1);
  assert.equal(contourBounds(cut)!.width, 100);
  assert.ok(cut[0].nodes.length >= 6, "an L-shaped remainder");
  const both = await combineContours("intersect", [a, b], inProcess);
  assert.deepEqual([contourBounds(both)!.x, contourBounds(both)!.width], [50, 50]);
  const either = await combineContours("exclude", [a, b], inProcess);
  assert.equal(either.length, 2);
  assert.ok(area(either) > 0);
  await assert.rejects(() => combineContours("intersect", [box(0, 0, 10, 10), box(100, 100, 10, 10)], inProcess), /overlap/);
  await assert.rejects(() => combineContours("unite", [a], inProcess), /at least two/);
  await assert.rejects(() => combineContours("unite", [a, parsePathData("M 0 0 L 10 10")], inProcess), /closed/);
});

test("shapes that make the boolean hang are cut off, retried once with a nudge, then reported", async () => {
  let calls = 0;
  let cancelled = 0;
  const hangs = () => { calls++; return { promise: new Promise<Contour[]>(() => {}), cancel: () => { cancelled++; } }; };
  await assert.rejects(() => combineContours("unite", [box(0, 0, 10, 10), box(5, 5, 10, 10)], hangs), new RegExp(TOO_COMPLEX.slice(0, 20)));
  assert.equal(calls, 2);
  assert.equal(cancelled, 2);
  // The retry succeeds when the nudged shapes no longer hang.
  let attempt = 0;
  const hangsOnce = (op: Parameters<typeof computeBoolean>[0], inputs: Contour[][]) => (++attempt === 1 ? { promise: new Promise<Contour[]>(() => {}), cancel: () => {} } : inProcess(op, inputs));
  const result = await combineContours("subtract", [box(0, 0, 100, 100), box(50, 50, 100, 100)], hangsOnce);
  assert.ok(result.length >= 1);
  const [base, moved] = nudged([box(0, 0, 10, 10), box(0, 0, 10, 10)]);
  assert.equal(base[0].nodes[0].x, 0);
  assert.ok(moved[0].nodes[0].x > 0);
});
