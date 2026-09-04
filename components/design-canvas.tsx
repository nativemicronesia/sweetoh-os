"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CanvasTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  canvasSize: number;
};

export type CanvasPrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  blankUrl: string | null;
  designUrl: string | null;
  blankLabel: string;
  designLabel: string;
  /** Called with a PNG blob when the user exports, plus the placement used. */
  onExport: (
    blob: Blob,
    suggestedName: string,
    transform: CanvasTransform,
  ) => void | Promise<void>;
  exportLabel?: string;
  /** Partner dark desk vs storefront light chrome. */
  tone?: "light" | "dark";
  /** Reopen a previously-saved composition at this exact placement. */
  initialTransform?: Pick<CanvasTransform, "offsetX" | "offsetY" | "scale" | "rotation"> | null;
  /**
   * This blank's saved print-safe rectangle (fractions 0-1 of the canvas).
   * A fresh composition (no initialTransform) auto-fits the design inside
   * it; always drawn as a guide when present.
   */
  printArea?: CanvasPrintArea | null;
  /** Lets the partner draw/save a new print area for this blank. */
  onSavePrintArea?: (area: CanvasPrintArea) => void | Promise<void>;
};

const CANVAS_SIZE = 720;
const DEFAULT_OFFSET = { x: CANVAS_SIZE * 0.25, y: CANVAS_SIZE * 0.25 };
const DEFAULT_SCALE = 0.45;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/** Contain-fit `w x h` inside a `boxW x boxH` box, centered. */
function fitInsideBox(
  w: number,
  h: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const fit = Math.min(boxW / w, boxH / h);
  const fw = w * fit;
  const fh = h * fit;
  return {
    scale: fit,
    offsetX: boxX + (boxW - fw) / 2,
    offsetY: boxY + (boxH - fh) / 2,
  };
}

/**
 * Printify-style placer: blank as the stage, design as a draggable /
 * scalable / rotatable layer. Export flattens to PNG for library or Studio,
 * and reports the placement so it can be persisted and reopened later.
 */
export function DesignCanvas({
  blankUrl,
  designUrl,
  blankLabel,
  designLabel,
  onExport,
  exportLabel = "Save composition",
  tone = "light",
  initialTransform = null,
  printArea = null,
  onSavePrintArea,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [offset, setOffset] = useState(
    initialTransform
      ? { x: initialTransform.offsetX, y: initialTransform.offsetY }
      : DEFAULT_OFFSET,
  );
  const [scale, setScale] = useState(initialTransform?.scale ?? DEFAULT_SCALE);
  const [rotation, setRotation] = useState(initialTransform?.rotation ?? 0);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const imagesRef = useRef<{ blank: HTMLImageElement | null; design: HTMLImageElement | null }>({
    blank: null,
    design: null,
  });

  // Print-area editing (independent of design placement).
  const [editingArea, setEditingArea] = useState(false);
  const [areaDraft, setAreaDraft] = useState<CanvasPrintArea | null>(printArea);
  const [savingArea, setSavingArea] = useState(false);
  const areaDragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setAreaDraft(printArea);
  }, [printArea]);

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

    // Print-area guide — dashed outline, drawn last so it stays visible.
    if (areaDraft) {
      ctx.save();
      ctx.strokeStyle = editingArea ? "#e11d48" : "rgba(201,168,76,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(
        areaDraft.x * CANVAS_SIZE,
        areaDraft.y * CANVAS_SIZE,
        areaDraft.width * CANVAS_SIZE,
        areaDraft.height * CANVAS_SIZE,
      );
      ctx.restore();
    }
  }, [offset.x, offset.y, scale, rotation, areaDraft, editingArea]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    (async () => {
      try {
        imagesRef.current.blank = blankUrl ? await loadImage(blankUrl) : null;
        imagesRef.current.design = designUrl ? await loadImage(designUrl) : null;
        if (cancelled) return;

        // Fresh composition (no saved transform) on a blank with a known
        // print area: auto-fit the design there instead of the generic
        // centered default.
        const design = imagesRef.current.design;
        if (!initialTransform && printArea && design) {
          const fitted = fitInsideBox(
            design.width,
            design.height,
            printArea.x * CANVAS_SIZE,
            printArea.y * CANVAS_SIZE,
            printArea.width * CANVAS_SIZE,
            printArea.height * CANVAS_SIZE,
          );
          setScale(fitted.scale);
          setOffset({ x: fitted.offsetX, y: fitted.offsetY });
          setRotation(0);
        }

        setReady(true);
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      } catch {
        if (!cancelled) {
          setError("Couldn't load images for the canvas (signed URLs may have expired).");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run only when the images themselves change — placement defaults
    // shouldn't reset on every prop identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blankUrl, designUrl]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (editingArea) {
      areaDragStart.current = { x: point.x / CANVAS_SIZE, y: point.y / CANVAS_SIZE };
      setAreaDraft({ x: areaDragStart.current.x, y: areaDragStart.current.y, width: 0, height: 0 });
      return;
    }

    if (!imagesRef.current.design) return;
    setDragging(true);
    dragOrigin.current = { x: point.x, y: point.y, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);

    if (editingArea) {
      if (!areaDragStart.current) return;
      const start = areaDragStart.current;
      const cur = { x: point.x / CANVAS_SIZE, y: point.y / CANVAS_SIZE };
      setAreaDraft({
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        width: Math.abs(cur.x - start.x),
        height: Math.abs(cur.y - start.y),
      });
      return;
    }

    if (!dragging) return;
    setOffset({
      x: dragOrigin.current.ox + (point.x - dragOrigin.current.x),
      y: dragOrigin.current.oy + (point.y - dragOrigin.current.y),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    setDragging(false);
    areaDragStart.current = null;
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
      await onExport(blob, suggested || "composition", {
        offsetX: offset.x,
        offsetY: offset.y,
        scale,
        rotation,
        canvasSize: CANVAS_SIZE,
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveArea() {
    if (!areaDraft || !onSavePrintArea) return;
    if (areaDraft.width < 0.02 || areaDraft.height < 0.02) {
      setError("Drag out a print area first — that box is too small.");
      return;
    }
    setSavingArea(true);
    setError(null);
    try {
      await onSavePrintArea(areaDraft);
      setEditingArea(false);
    } catch {
      setError("Couldn't save the print area.");
    } finally {
      setSavingArea(false);
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
            disabled={editingArea}
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
            disabled={editingArea}
            onChange={(event) => setRotation(Number(event.target.value))}
            className="w-36"
          />
          <span className="w-10 tabular-nums text-xs">{rotation}°</span>
        </label>
        <button
          type="button"
          disabled={editingArea}
          onClick={() => setRotation((prev) => ((prev + 90 + 180) % 360) - 180)}
          className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${btnSecondary}`}
        >
          +90°
        </button>
        <button
          type="button"
          disabled={editingArea}
          onClick={() => {
            if (printArea && imagesRef.current.design) {
              const fitted = fitInsideBox(
                imagesRef.current.design.width,
                imagesRef.current.design.height,
                printArea.x * CANVAS_SIZE,
                printArea.y * CANVAS_SIZE,
                printArea.width * CANVAS_SIZE,
                printArea.height * CANVAS_SIZE,
              );
              setScale(fitted.scale);
              setOffset({ x: fitted.offsetX, y: fitted.offsetY });
            } else {
              setOffset(DEFAULT_OFFSET);
              setScale(DEFAULT_SCALE);
            }
            setRotation(0);
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${btnSecondary}`}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!ready || !designUrl || exporting || editingArea}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={exportBtn}
        >
          {exporting ? "Saving…" : exportLabel}
        </button>
      </div>

      {onSavePrintArea ? (
        <div
          className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${btnSecondary}`}
        >
          <button
            type="button"
            onClick={() => setEditingArea((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={
              editingArea
                ? { background: "#e11d48", color: "#fff", borderColor: "#e11d48" }
                : undefined
            }
          >
            {editingArea ? "Cancel" : printArea ? "Redo print area" : "Set print area"}
          </button>
          {editingArea ? (
            <>
              <span className={`text-xs ${muted}`}>
                Drag on the canvas to mark where the print sits on this blank.
              </span>
              <button
                type="button"
                onClick={handleSaveArea}
                disabled={savingArea}
                className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={exportBtn}
              >
                {savingArea ? "Saving…" : "Save print area"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

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
