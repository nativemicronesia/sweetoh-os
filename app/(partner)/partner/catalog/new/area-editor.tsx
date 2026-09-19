"use client";
import { useRef } from "react";

export type Area = { x: number; y: number; width: number; height: number };

/**
 * Drag to move, drag a corner to resize. Values are fractions (0-1) of the
 * square image, the same units the Design Studio uses for print areas.
 */
export function AreaEditor({
  src,
  area,
  onChange,
  checker = false,
  label = "Print area",
}: {
  src: string;
  area: Area;
  onChange: (a: Area) => void;
  checker?: boolean;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: string; startX: number; startY: number; start: Area } | null>(null);

  function begin(mode: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: area };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / r.width;
    const dy = (e.clientY - d.startY) / r.height;
    const s = d.start;
    let { x, y, width, height } = s;
    if (d.mode === "move") {
      x = s.x + dx;
      y = s.y + dy;
    } else {
      if (d.mode.includes("w")) { x = s.x + dx; width = s.width - dx; }
      if (d.mode.includes("e")) width = s.width + dx;
      if (d.mode.includes("n")) { y = s.y + dy; height = s.height - dy; }
      if (d.mode.includes("s")) height = s.height + dy;
    }
    width = Math.max(0.04, Math.min(width, 1));
    height = Math.max(0.04, Math.min(height, 1));
    x = Math.max(0, Math.min(x, 1 - width));
    y = Math.max(0, Math.min(y, 1 - height));
    onChange({ x, y, width, height });
  }
  function end() {
    drag.current = null;
  }

  return (
    <div ref={box} className={`area-editor ${checker ? "area-checker" : ""}`} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <img src={src} alt="" draggable={false} />
      <div
        className="area-rect"
        style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.width * 100}%`, height: `${area.height * 100}%` }}
        onPointerDown={(e) => begin("move", e)}
      >
        <span>{label}</span>
        {["nw", "ne", "sw", "se"].map((c) => (
          <i key={c} className={`area-handle area-${c}`} onPointerDown={(e) => begin(c, e)} />
        ))}
      </div>
    </div>
  );
}
