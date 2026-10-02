import { Canvas, Circle, Line, Path, Point, Rect, util, type FabricObject } from "fabric";
import {
  contoursToPathData, insertNode, mapContours, moveHandle, moveNode, nearestOnContours, parsePathData, penNode, removeNode, setNodeSmooth,
  type Contour, type VNode,
} from "@/lib/studio/vector-path";

const INK = "#173e39";
const GREEN = "#1f7048";
const WHITE = "#ffffff";

/** Scene units per on-screen pixel, so handles stay the same size at any zoom. */
function unitsPerPx(canvas: Canvas): number {
  const rect = canvas.getElement().getBoundingClientRect();
  return rect.width ? canvas.getWidth() / rect.width : 1;
}

function tag<T extends FabricObject>(object: T): T {
  object.set({ excludeFromExport: true, objectCaching: false, hasControls: false, hasBorders: false, lockScalingX: true, lockScalingY: true, lockRotation: true, hoverCursor: "pointer" });
  return object;
}
const inert = <T extends FabricObject>(object: T): T => tag(object).set({ selectable: false, evented: false });

/** Pen tool: click for corners, drag for curves, click the first point to close, Enter to finish open. */
export class PenSession {
  private nodes: VNode[] = [];
  private dragging = false;
  private anchor: Point | null = null;
  private hover: Point | null = null;
  private overlay: FabricObject[] = [];
  private offs: Array<() => void> = [];
  private done = false;

  constructor(
    private canvas: Canvas,
    private hooks: { onFinish: (contour: { nodes: VNode[]; closed: boolean }) => void; onCancel: () => void; onChange?: (nodes: number) => void },
  ) {
    this.offs.push(
      canvas.on("mouse:down", (event) => this.down(event.scenePoint)),
      canvas.on("mouse:move", (event) => this.move(event.scenePoint)),
      canvas.on("mouse:up", () => { this.dragging = false; }),
      canvas.on("mouse:dblclick", () => this.doubleClick()),
    );
    window.addEventListener("keydown", this.key, true);
    canvas.defaultCursor = "crosshair";
    canvas.hoverCursor = "crosshair";
  }

  private nearFirst(p: Point): boolean {
    return this.nodes.length >= 2 && Math.hypot(p.x - this.nodes[0].x, p.y - this.nodes[0].y) < 10 * unitsPerPx(this.canvas);
  }

  private down(p: Point) {
    if (this.done) return;
    if (this.nearFirst(p)) { this.finish(true); return; }
    this.nodes.push(penNode(p.x, p.y));
    this.anchor = p;
    this.dragging = true;
    this.render();
  }

  private move(p: Point) {
    if (this.done) return;
    if (this.dragging && this.anchor) this.nodes[this.nodes.length - 1] = penNode(this.anchor.x, this.anchor.y, p.x, p.y);
    else this.hover = p;
    this.render();
  }

  private doubleClick() {
    // The two clicks of a double-click each added a node at the same spot.
    const n = this.nodes;
    if (n.length >= 2 && Math.hypot(n[n.length - 1].x - n[n.length - 2].x, n[n.length - 1].y - n[n.length - 2].y) < 4 * unitsPerPx(this.canvas)) n.pop();
    this.finish(false);
  }

  private key = (event: KeyboardEvent) => {
    if (this.done) return;
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); this.finish(false); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.cancel(); }
    else if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); event.stopPropagation(); this.nodes.pop(); this.render(); }
  };

  /** Close or finish the path. Needs at least two points. */
  finish(closed: boolean) {
    if (this.done) return;
    if (this.nodes.length < 2) { this.cancel(); return; }
    const nodes = this.nodes;
    this.destroy();
    this.hooks.onFinish({ nodes, closed: closed && nodes.length >= 3 });
  }

  cancel() {
    if (this.done) return;
    this.destroy();
    this.hooks.onCancel();
  }

  get count() { return this.nodes.length; }

  private clear() {
    for (const object of this.overlay) this.canvas.remove(object);
    this.overlay = [];
  }

  private render() {
    this.clear();
    const upp = unitsPerPx(this.canvas);
    const nodes = this.hover && !this.dragging ? [...this.nodes, penNode(this.hover.x, this.hover.y)] : this.nodes;
    if (nodes.length >= 2) {
      const d = contoursToPathData([{ nodes, closed: false }]);
      this.overlay.push(inert(new Path(d, { fill: "", stroke: INK, strokeWidth: 2 * upp, strokeLineJoin: "round" })));
    }
    const near = this.hover ? this.nearFirst(this.hover) : false;
    this.nodes.forEach((node, index) => {
      if (node.outX !== node.x || node.outY !== node.y) {
        for (const [hx, hy] of [[node.outX, node.outY], [node.inX, node.inY]]) {
          this.overlay.push(inert(new Line([node.x, node.y, hx, hy], { stroke: INK, strokeWidth: 1 * upp })));
          this.overlay.push(inert(new Circle({ left: hx, top: hy, radius: 3.5 * upp, originX: "center", originY: "center", fill: WHITE, stroke: INK, strokeWidth: 1.2 * upp })));
        }
      }
      const first = index === 0;
      this.overlay.push(inert(new Rect({ left: node.x, top: node.y, width: (first && near ? 12 : 8) * upp, height: (first && near ? 12 : 8) * upp, originX: "center", originY: "center", fill: first && near ? GREEN : WHITE, stroke: first ? GREEN : INK, strokeWidth: 1.5 * upp })));
    });
    for (const object of this.overlay) this.canvas.add(object);
    this.canvas.requestRenderAll();
    this.hooks.onChange?.(this.nodes.length);
  }

  destroy() {
    if (this.done) return;
    this.done = true;
    for (const off of this.offs) off();
    window.removeEventListener("keydown", this.key, true);
    this.clear();
    this.canvas.defaultCursor = "default";
    this.canvas.hoverCursor = "move";
    this.canvas.requestRenderAll();
  }
}

export type NodeSelection = { contour: number; node: number } | null;

/** Edit the points of a vector path: drag anchors and handles, click the outline to add a point. */
export class NodeEditSession {
  private contours: Contour[];
  private selected: NodeSelection = null;
  private overlay: FabricObject[] = [];
  private anchors = new Map<FabricObject, { contour: number; node: number }>();
  private handles = new Map<FabricObject, { contour: number; node: number; which: "in" | "out" }>();
  private lines: Array<{ line: Line; contour: number; node: number; which: "in" | "out" }> = [];
  private offs: Array<() => void> = [];
  private gesture = false;
  private done = false;

  constructor(
    private canvas: Canvas,
    private target: Path,
    private hooks: {
      /** Called once at the start of each edit gesture, before anything changes. */
      onBegin: () => void;
      /** The edited outline, as path data in scene coordinates. */
      onChange: (pathData: string, final: boolean) => void;
      onSelect: (selection: { smooth: boolean; removable: boolean } | null) => void;
      onExit: () => void;
    },
  ) {
    // Bake scale and rotation into the points so editing happens in scene coordinates.
    const matrix = target.calcTransformMatrix();
    const offset = target.pathOffset;
    const local = parsePathData(target.path.map((command) => command.join(" ")).join(" "));
    this.contours = mapContours(local, (x, y) => {
      const p = util.transformPoint(new Point(x - offset.x, y - offset.y), matrix);
      return [p.x, p.y];
    });
    canvas.discardActiveObject();
    target.set({ evented: false, selectable: false });
    this.applyToTarget();
    this.build();
    this.offs.push(
      canvas.on("mouse:down", (event) => this.pointerDown(event.target, event.scenePoint)),
      canvas.on("object:moving", (event) => this.moving(event.target)),
      canvas.on("mouse:up", () => this.release()),
    );
    window.addEventListener("keydown", this.key, true);
  }

  get pathData() { return contoursToPathData(this.contours); }

  private applyToTarget() {
    const t = this.target;
    t.set({ scaleX: 1, scaleY: 1, angle: 0, flipX: false, flipY: false, skewX: 0, skewY: 0 });
    t._setPath(this.pathData, true);
    t.setCoords();
    t.dirty = true;
  }

  private emit(final: boolean) {
    this.applyToTarget();
    this.hooks.onChange(this.pathData, final);
    this.canvas.requestRenderAll();
  }

  private begin() {
    if (this.gesture) return;
    this.gesture = true;
    this.hooks.onBegin();
  }

  private release() {
    if (!this.gesture) return;
    this.gesture = false;
    this.emit(true);
  }

  private clear() {
    for (const object of this.overlay) this.canvas.remove(object);
    this.overlay = [];
    this.anchors.clear();
    this.handles.clear();
    this.lines = [];
  }

  private build() {
    this.clear();
    const upp = unitsPerPx(this.canvas);
    const add = (object: FabricObject) => { this.overlay.push(object); this.canvas.add(object); };
    this.contours.forEach((contour, ci) => {
      contour.nodes.forEach((node, ni) => {
        for (const which of ["in", "out"] as const) {
          const hx = which === "in" ? node.inX : node.outX, hy = which === "in" ? node.inY : node.outY;
          if (Math.abs(hx - node.x) < 1e-6 && Math.abs(hy - node.y) < 1e-6) continue;
          const line = inert(new Line([node.x, node.y, hx, hy], { stroke: INK, strokeWidth: 1 * upp }));
          this.lines.push({ line, contour: ci, node: ni, which });
          add(line);
        }
      });
      contour.nodes.forEach((node, ni) => {
        for (const which of ["in", "out"] as const) {
          const hx = which === "in" ? node.inX : node.outX, hy = which === "in" ? node.inY : node.outY;
          if (Math.abs(hx - node.x) < 1e-6 && Math.abs(hy - node.y) < 1e-6) continue;
          const dot = tag(new Circle({ left: hx, top: hy, radius: 4 * upp, originX: "center", originY: "center", fill: WHITE, stroke: INK, strokeWidth: 1.4 * upp }));
          this.handles.set(dot, { contour: ci, node: ni, which });
          add(dot);
        }
      });
      contour.nodes.forEach((node, ni) => {
        const picked = this.selected?.contour === ci && this.selected.node === ni;
        const size = (picked ? 11 : 9) * upp;
        const anchor = tag(node.smooth
          ? new Circle({ left: node.x, top: node.y, radius: size / 2, originX: "center", originY: "center", fill: picked ? GREEN : WHITE, stroke: picked ? GREEN : INK, strokeWidth: 1.6 * upp })
          : new Rect({ left: node.x, top: node.y, width: size, height: size, originX: "center", originY: "center", fill: picked ? GREEN : WHITE, stroke: picked ? GREEN : INK, strokeWidth: 1.6 * upp }));
        this.anchors.set(anchor, { contour: ci, node: ni });
        add(anchor);
      });
    });
    this.canvas.requestRenderAll();
  }

  /** Highlight the selected point without rebuilding the overlay. */
  private restyle() {
    const upp = unitsPerPx(this.canvas);
    for (const [object, ref] of this.anchors) {
      const picked = this.selected?.contour === ref.contour && this.selected.node === ref.node;
      object.set({ fill: picked ? GREEN : WHITE, stroke: picked ? GREEN : INK, strokeWidth: 1.6 * upp });
    }
    this.canvas.requestRenderAll();
  }

  private report() {
    const s = this.selected;
    if (!s) { this.hooks.onSelect(null); return; }
    const c = this.contours[s.contour];
    this.hooks.onSelect({ smooth: Boolean(c.nodes[s.node].smooth), removable: c.nodes.length > (c.closed ? 3 : 2) });
  }

  private pointerDown(target: FabricObject | undefined, p: Point) {
    if (this.done) return;
    if (target && this.anchors.has(target)) {
      // Select in place: rebuilding here would replace the object the drag is about to move.
      this.selected = { ...this.anchors.get(target)! };
      this.restyle();
      this.report();
      return;
    }
    if (target) return;
    const hit = nearestOnContours(this.contours, p.x, p.y);
    if (hit && hit.distance < 8 * unitsPerPx(this.canvas)) {
      this.begin();
      const index = insertNode(this.contours[hit.contour], hit.segment, hit.t);
      this.selected = { contour: hit.contour, node: index };
      this.build();
      this.report();
      this.gesture = false;
      this.emit(true);
      return;
    }
    this.selected = null;
    this.build();
    this.report();
  }

  private moving(target: FabricObject) {
    if (this.done) return;
    const anchor = this.anchors.get(target);
    const handle = this.handles.get(target);
    if (!anchor && !handle) return;
    this.begin();
    const x = target.left, y = target.top;
    if (anchor) {
      moveNode(this.contours[anchor.contour].nodes[anchor.node], x, y);
    } else if (handle) {
      moveHandle(this.contours[handle.contour].nodes[handle.node], handle.which, x, y);
    }
    this.syncOverlay();
    this.emit(false);
  }

  /** Reposition handles and their lines from the model while a drag is in progress. */
  private syncOverlay() {
    for (const [object, ref] of this.handles) {
      const node = this.contours[ref.contour].nodes[ref.node];
      if (object === this.canvas.getActiveObject()) continue;
      object.set({ left: ref.which === "in" ? node.inX : node.outX, top: ref.which === "in" ? node.inY : node.outY });
      object.setCoords();
    }
    for (const [object, ref] of this.anchors) {
      const node = this.contours[ref.contour].nodes[ref.node];
      if (object === this.canvas.getActiveObject()) continue;
      object.set({ left: node.x, top: node.y });
      object.setCoords();
    }
    for (const { line, contour, node, which } of this.lines) {
      const n = this.contours[contour].nodes[node];
      line.set({ x1: n.x, y1: n.y, x2: which === "in" ? n.inX : n.outX, y2: which === "in" ? n.inY : n.outY });
      line.setCoords();
    }
  }

  /** Switch the selected point between smooth and corner. */
  toggleSmooth() {
    const s = this.selected;
    if (!s) return;
    this.begin();
    const c = this.contours[s.contour];
    setNodeSmooth(c, s.node, !c.nodes[s.node].smooth);
    this.build();
    this.report();
    this.gesture = false;
    this.emit(true);
  }

  removeSelected() {
    const s = this.selected;
    if (!s) return;
    this.begin();
    if (removeNode(this.contours[s.contour], s.node)) {
      this.selected = null;
      this.build();
      this.report();
      this.gesture = false;
      this.emit(true);
    } else this.gesture = false;
  }

  private key = (event: KeyboardEvent) => {
    if (this.done) return;
    if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.finish(); }
    else if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); event.stopPropagation(); this.removeSelected(); }
  };

  finish() {
    if (this.done) return;
    this.destroy();
    this.hooks.onExit();
  }

  destroy() {
    if (this.done) return;
    this.done = true;
    for (const off of this.offs) off();
    window.removeEventListener("keydown", this.key, true);
    this.clear();
    this.target.set({ evented: true, selectable: true });
    this.canvas.requestRenderAll();
  }
}
