/**
 * Editable vector outlines. A path is a list of contours; each contour is a
 * list of nodes with an anchor and optional in/out handles, in absolute
 * coordinates. This is the one model the pen tool, point editing, shape
 * conversion and boolean operations share. Pure math, no canvas.
 */
export type VNode = { x: number; y: number; inX: number; inY: number; outX: number; outY: number; smooth?: boolean };
export type Contour = { nodes: VNode[]; closed: boolean };

const EPS = 1e-6;
const f = (n: number) => Math.round(n * 100) / 100;

export const corner = (x: number, y: number): VNode => ({ x, y, inX: x, inY: y, outX: x, outY: y });
const hasOut = (n: VNode) => Math.abs(n.outX - n.x) > EPS || Math.abs(n.outY - n.y) > EPS;
const hasIn = (n: VNode) => Math.abs(n.inX - n.x) > EPS || Math.abs(n.inY - n.y) > EPS;

/** Straight if neither end has a handle on this side. */
function straight(a: VNode, b: VNode) {
  return !hasOut(a) && !hasIn(b);
}

/** Parses absolute M L Q C Z path data (what Studio stores) into contours. */
export function parsePathData(d: string): Contour[] {
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const contours: Contour[] = [];
  let current: Contour | null = null;
  let i = 0;
  const num = () => Number(tokens[i++]);
  const start = () => { if (current && current.nodes.length) contours.push(current); current = null; };
  let cmd = "";
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^[MLQCZ]$/i.test(token)) { cmd = token.toUpperCase(); i++; if (cmd === "Z") { if (current) { (current as Contour).closed = true; start(); } continue; } }
    if (cmd === "M") {
      start();
      const x = num(), y = num();
      current = { nodes: [corner(x, y)], closed: false };
      cmd = "L";
    } else if (cmd === "L") {
      const x = num(), y = num();
      if (!current) current = { nodes: [], closed: false };
      current.nodes.push(corner(x, y));
    } else if (cmd === "Q" && current) {
      const qx = num(), qy = num(), x = num(), y = num();
      const prev = current.nodes[current.nodes.length - 1];
      prev.outX = prev.x + (2 / 3) * (qx - prev.x); prev.outY = prev.y + (2 / 3) * (qy - prev.y);
      current.nodes.push({ x, y, inX: x + (2 / 3) * (qx - x), inY: y + (2 / 3) * (qy - y), outX: x, outY: y });
    } else if (cmd === "C" && current) {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
      const prev = current.nodes[current.nodes.length - 1];
      prev.outX = x1; prev.outY = y1;
      current.nodes.push({ x, y, inX: x2, inY: y2, outX: x, outY: y });
    } else { i++; }
  }
  start();
  for (const c of contours) {
    const first = c.nodes[0], last = c.nodes[c.nodes.length - 1];
    // A closing line back onto the start point is the same node, not a new one.
    if (c.closed && c.nodes.length > 1 && Math.abs(first.x - last.x) < EPS && Math.abs(first.y - last.y) < EPS) {
      first.inX = last.inX; first.inY = last.inY;
      c.nodes.pop();
    }
    for (const n of c.nodes) n.smooth = isSmooth(n);
  }
  return contours;
}

function isSmooth(n: VNode) {
  if (!hasIn(n) || !hasOut(n)) return false;
  const ax = n.x - n.inX, ay = n.y - n.inY, bx = n.outX - n.x, by = n.outY - n.y;
  const cross = ax * by - ay * bx;
  return Math.abs(cross) <= 1e-3 * Math.hypot(ax, ay) * Math.hypot(bx, by) && ax * bx + ay * by > 0;
}

export function contoursToPathData(contours: Contour[]): string {
  const parts: string[] = [];
  for (const c of contours) {
    if (!c.nodes.length) continue;
    const seg = (a: VNode, b: VNode) => straight(a, b) ? ` L ${f(b.x)} ${f(b.y)}` : ` C ${f(a.outX)} ${f(a.outY)} ${f(b.inX)} ${f(b.inY)} ${f(b.x)} ${f(b.y)}`;
    let d = `M ${f(c.nodes[0].x)} ${f(c.nodes[0].y)}`;
    for (let i = 1; i < c.nodes.length; i++) d += seg(c.nodes[i - 1], c.nodes[i]);
    if (c.closed) {
      const last = c.nodes[c.nodes.length - 1];
      if (!straight(last, c.nodes[0])) d += seg(last, c.nodes[0]);
      d += " Z";
    }
    parts.push(d);
  }
  return parts.join(" ");
}

export function mapContours(contours: Contour[], fn: (x: number, y: number) => [number, number]): Contour[] {
  return contours.map((c) => ({
    closed: c.closed,
    nodes: c.nodes.map((n) => {
      const [x, y] = fn(n.x, n.y), [inX, inY] = fn(n.inX, n.inY), [outX, outY] = fn(n.outX, n.outY);
      return { x, y, inX, inY, outX, outY, smooth: n.smooth };
    }),
  }));
}

function bez(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

/** Segment i runs from node i to node i+1 (wrapping on closed contours). */
export function segmentCount(c: Contour) {
  return c.closed ? c.nodes.length : Math.max(0, c.nodes.length - 1);
}

/** Splits a segment at t: returns the updated end nodes and the node inserted between them. */
export function splitSegment(a: VNode, b: VNode, t: number): { a: VNode; mid: VNode; b: VNode } {
  const lerp = (p: number, q: number) => p + (q - p) * t;
  const p0 = [a.x, a.y], p1 = [a.outX, a.outY], p2 = [b.inX, b.inY], p3 = [b.x, b.y];
  const q0 = [lerp(p0[0], p1[0]), lerp(p0[1], p1[1])], q1 = [lerp(p1[0], p2[0]), lerp(p1[1], p2[1])], q2 = [lerp(p2[0], p3[0]), lerp(p2[1], p3[1])];
  const r0 = [lerp(q0[0], q1[0]), lerp(q0[1], q1[1])], r1 = [lerp(q1[0], q2[0]), lerp(q1[1], q2[1])];
  const m = [lerp(r0[0], r1[0]), lerp(r0[1], r1[1])];
  const straightSeg = straight(a, b);
  return {
    a: { ...a, outX: straightSeg ? a.x : q0[0], outY: straightSeg ? a.y : q0[1] },
    mid: straightSeg
      ? { x: m[0], y: m[1], inX: m[0], inY: m[1], outX: m[0], outY: m[1], smooth: false }
      : { x: m[0], y: m[1], inX: r0[0], inY: r0[1], outX: r1[0], outY: r1[1], smooth: true },
    b: { ...b, inX: straightSeg ? b.x : q2[0], inY: straightSeg ? b.y : q2[1] },
  };
}

export type Nearest = { contour: number; segment: number; t: number; x: number; y: number; distance: number };

/** The closest point on any segment, by sampling each curve. */
export function nearestOnContours(contours: Contour[], x: number, y: number): Nearest | null {
  let best: Nearest | null = null;
  contours.forEach((c, ci) => {
    for (let s = 0; s < segmentCount(c); s++) {
      const a = c.nodes[s], b = c.nodes[(s + 1) % c.nodes.length];
      const steps = straight(a, b) ? 1 : 32;
      for (let k = 0; k < steps; k++) {
        // For a straight segment, project onto it exactly; for curves, sample and refine by the sample spacing.
        if (steps === 1) {
          const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len));
          const px = a.x + dx * t, py = a.y + dy * t, distance = Math.hypot(px - x, py - y);
          if (!best || distance < best.distance) best = { contour: ci, segment: s, t, x: px, y: py, distance };
        } else {
          const t = k / steps;
          const px = bez(a.x, a.outX, b.inX, b.x, t), py = bez(a.y, a.outY, b.inY, b.y, t), distance = Math.hypot(px - x, py - y);
          if (!best || distance < best.distance) best = { contour: ci, segment: s, t, x: px, y: py, distance };
        }
      }
    }
  });
  return best;
}

/** Insert a node on a segment at t; returns the new node's index. */
export function insertNode(c: Contour, segment: number, t: number): number {
  const ai = segment, bi = (segment + 1) % c.nodes.length;
  const { a, mid, b } = splitSegment(c.nodes[ai], c.nodes[bi], Math.min(0.98, Math.max(0.02, t)));
  c.nodes[ai] = a;
  c.nodes[bi] = b;
  c.nodes.splice(ai + 1, 0, mid);
  return ai + 1;
}

/** Remove a node, keeping the curve through its neighbours. Returns false when too few nodes would remain. */
export function removeNode(c: Contour, index: number): boolean {
  if (c.nodes.length <= (c.closed ? 3 : 2)) return false;
  c.nodes.splice(index, 1);
  return true;
}

/** Make a node smooth (handles aligned) or a corner (handles retracted). */
export function setNodeSmooth(c: Contour, index: number, smooth: boolean) {
  const n = c.nodes[index];
  if (!smooth) { n.inX = n.x; n.inY = n.y; n.outX = n.x; n.outY = n.y; n.smooth = false; return; }
  const prev = c.nodes[(index - 1 + c.nodes.length) % c.nodes.length], next = c.nodes[(index + 1) % c.nodes.length];
  let dx = next.x - prev.x, dy = next.y - prev.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const reach = Math.min(Math.hypot(next.x - n.x, next.y - n.y), Math.hypot(prev.x - n.x, prev.y - n.y)) / 3 || 10;
  n.inX = n.x - dx * reach; n.inY = n.y - dy * reach;
  n.outX = n.x + dx * reach; n.outY = n.y + dy * reach;
  n.smooth = true;
}

/** Move one handle; on a smooth node the opposite handle mirrors its direction and keeps its length. */
export function moveHandle(n: VNode, which: "in" | "out", x: number, y: number) {
  if (which === "in") { n.inX = x; n.inY = y; } else { n.outX = x; n.outY = y; }
  if (!n.smooth) return;
  const [mx, my, ox, oy] = which === "in" ? [n.inX, n.inY, n.outX, n.outY] : [n.outX, n.outY, n.inX, n.inY];
  const keep = Math.hypot(ox - n.x, oy - n.y) || Math.hypot(mx - n.x, my - n.y);
  const dx = n.x - mx, dy = n.y - my, len = Math.hypot(dx, dy) || 1;
  const rx = n.x + (dx / len) * keep, ry = n.y + (dy / len) * keep;
  if (which === "in") { n.outX = rx; n.outY = ry; } else { n.inX = rx; n.inY = ry; }
}

export function moveNode(n: VNode, x: number, y: number) {
  const dx = x - n.x, dy = y - n.y;
  n.x = x; n.y = y; n.inX += dx; n.inY += dy; n.outX += dx; n.outY += dy;
}

/** Exact bounds of a set of contours (curves sampled finely). */
export function contourBounds(contours: Contour[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const take = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const c of contours) {
    for (const n of c.nodes) take(n.x, n.y);
    for (let s = 0; s < segmentCount(c); s++) {
      const a = c.nodes[s], b = c.nodes[(s + 1) % c.nodes.length];
      if (straight(a, b)) continue;
      for (let k = 1; k < 40; k++) { const t = k / 40; take(bez(a.x, a.outX, b.inX, b.x, t), bez(a.y, a.outY, b.inY, b.y, t)); }
    }
  }
  return x0 === Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Pen-tool nodes from clicks and drags: a drag sets a symmetric out handle. */
export function penNode(x: number, y: number, dragX?: number, dragY?: number): VNode {
  if (dragX === undefined || dragY === undefined || Math.hypot(dragX - x, dragY - y) < 3) return corner(x, y);
  return { x, y, outX: dragX, outY: dragY, inX: 2 * x - dragX, inY: 2 * y - dragY, smooth: true };
}
