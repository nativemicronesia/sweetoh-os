"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  blankUrl: string | null;
  designUrl: string | null;
  blankLabel: string;
  designLabel: string;
  /** Called with a PNG blob when the user exports. */
  onExport: (blob: Blob, suggestedName: string) => void | Promise<void>;
  exportLabel?: string;
  /** Partner dark desk vs storefront light chrome. */
  tone?: "light" | "dark";
};

const CANVAS_SIZE = 720;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/**
 * Printify-style placer: blank as the stage, design as a draggable /
 * scalable / rotatable layer. Export flattens to PNG for library or Studio.
 */
export function DesignCanvas({
  blankUrl,
  designUrl,
  blankLabel,
  designLabel,
  onExport,
  exportLabel = "Save composition",
  tone = "light",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [offset, setOffset] = useState({ x: CANVAS_SIZE * 0.25, y: CANVAS_SIZE * 0.25 });
  const [scale, setScale] = useState(0.45);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const imagesRef = useRef<{ blank: HTMLImageElement | null; design: HTMLImageElement | null }>({
    blank: null,
    design: null,
  });

  const muted = tone === "dark" ? "text-[color:var(--so-cream-dim)]" : "text-neutral-600";
  const border =
    tone === "dark"
      ? "border-[color:var(--so-border)] bg-[color:var(--so-dark)]"
      : "border-neutral-200 bg-neutral-50";
  const btnSecondary =
    tone === "dark"
      ? "border-[color:var(--so-border)] text-[color:var(--so-cream-dim)]"
      : "border-neutral-300 text-neutral-700";
  const exportBtn =
    tone === "dark"
      ? { background: "var(--so-gold)", color: "var(--so-black)" }
      : { background: "#171717", color: "#fff" };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const blank = imagesRef.current.blank;
    if (blank) {
      const fit = Math.min(CANVAS_SIZE / blank.width, CANVAS_SIZE / blank.height);
      const w = blank.width * fit;
      const h = blank.height * fit;
      ctx.drawImage(blank, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h);
    }

    const design = imagesRef.current.design;
    if (design) {
      const w = design.width * scale;
      const h = design.height * scale;
      const cx = offset.x + w / 2;
      const cy = offset.y + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(design, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }, [offset.x, offset.y, scale, rotation]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    (async () => {
      try {
        imagesRef.current.blank = blankUrl ? await loadImage(blankUrl) : null;
        imagesRef.current.design = designUrl ? await loadImage(designUrl) : null;
        if (cancelled) return;
        setReady(true);
        redraw();
      } catch {
        if (!cancelled) {
          setError("Couldn't load images for the canvas (signed URLs may have expired).");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blankUrl, designUrl, redraw]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!imagesRef.current.design) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    setDragging(true);
    dragOrigin.current = { x, y, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    setOffset({
      x: dragOrigin.current.ox + (x - dragOrigin.current.x),
      y: dragOrigin.current.oy + (y - dragOrigin.current.y),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  async function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setExporting(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) {
        setError("Export failed.");
        return;
      }
      const suggested = `${blankLabel}-x-${designLabel}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      await onExport(blob, suggested || "composition");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`overflow-hidden rounded-xl border ${border}`}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="mx-auto block w-full max-w-xl touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className={`flex items-center gap-2 text-sm ${muted}`}>
          Size
          <input
            type="range"
            min={0.15}
            max={1.2}
            step={0.01}
            value={scale}
            onChange={(event) => setScale(Number(event.target.value))}
            className="w-36"
          />
        </label>
        <label className={`flex items-center gap-2 text-sm ${muted}`}>
          Rotate
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(event) => setRotation(Number(event.target.value))}
            className="w-36"
          />
          <span className="w-10 tabular-nums text-xs">{rotation}°</span>
        </label>
        <button
          type="button"
          onClick={() => setRotation((prev) => ((prev + 90 + 180) % 360) - 180)}
          className={`rounded-lg border px-3 py-1.5 text-xs ${btnSecondary}`}
        >
          +90°
        </button>
        <button
          type="button"
          onClick={() => {
            setOffset({ x: CANVAS_SIZE * 0.25, y: CANVAS_SIZE * 0.25 });
            setScale(0.45);
            setRotation(0);
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs ${btnSecondary}`}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!ready || !designUrl || exporting}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={exportBtn}
        >
          {exporting ? "Saving…" : exportLabel}
        </button>
      </div>

      {!blankUrl || !designUrl ? (
        <p className={`text-sm ${muted}`}>Pick a blank and a design to start placing.</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <p className={`text-xs ${muted}`}>
        Drag to place. Size and Rotate to fit. Export saves a flat mockup PNG.
      </p>
    </div>
  );
}
