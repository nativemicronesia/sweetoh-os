"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Canvas,
  StaticCanvas,
  FabricImage,
  FabricObject,
  IText,
  Rect,
  Path,
} from "fabric";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeft,
  Blend,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Grid3x3,
  Lightbulb,
  Scissors,
  Shapes,
  WandSparkles,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Crop,
  Download,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Maximize,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Redo2,
  LockKeyhole,
  UnlockKeyhole,
  EyeOff,
  Upload,
  X,
} from "lucide-react";
import {
  uploadCanvasArtworkAction,
  generateArtworkAction,
  uploadSurfaceAction,
} from "../actions/builder";
import {
  saveCanvasCompositionAction,
  saveBlankSurfacesAction,
} from "../actions/library";
import {
  defaultArea,
  regionsFor,
  type StudioLayout,
  type StudioLayer,
  type StudioSurface,
} from "@/lib/domains/catalog/studio-layout";
import type { CatalogSource, VariantOptions } from "@/lib/domains/catalog/variants";
import { analyzePhoto, printAreaInBox, tintGarment } from "@/lib/studio/tint";
import { PRODUCT_FONTS, ensureFont, fontFamily } from "@/lib/studio/fonts";
import { SHAPES, makeShape, type ShapeKind } from "@/lib/studio/shapes";
import { makePatternRect } from "@/lib/studio/pattern";
import { getMockupRenderer } from "@/lib/studio/mockup";
import {
  addInspirationAction,
  editDesignAction,
  generateDesignAction,
  listInspirationAction,
  removeBackgroundAction,
} from "../actions/capabilities";
import { regionPath } from "@/lib/studio/print-regions";
import { ProductSetup } from "./product-setup";
import { CropDialog, type CropPixels } from "./crop-dialog";

type Area = StudioSurface["area"];
type Surface = StudioLayout["surfaces"][number];
type LegacyTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  text?: { value: string; x: number; y: number; size: number; color: string };
};
export type CanvasBlankOption = {
  id: string;
  name: string;
  imageUrl: string | null;
  printArea: (Area & { surfaces?: StudioSurface[] }) | null;
  variantOptions?: VariantOptions | null;
  catalogSource?: CatalogSource | null;
};
export type CanvasDesignOption = { id: string; name: string; previewUrl: string | null };
export type SavedDesignOption = { id: string; name: string; previewUrl: string | null };
type Props = {
  blanks: CanvasBlankOption[];
  designs: CanvasDesignOption[];
  initialDesignId: string | null;
  initialBlankId?: string | null;
  initialTransform?: LegacyTransform | null;
  initialStudio?: StudioLayout | null;
  surfaceImages?: Record<string, string>;
  savedDesigns?: SavedDesignOption[];
};
type Selected =
  | null
  | {
      kind: "image" | "text" | "shape" | "pattern";
      name: string;
      opacity: number;
      flipX: boolean;
      flipY: boolean;
      assetId?: string;
      printRegionId?: string;
      fill?: string;
      tile?: number;
      gap?: number;
      brick?: boolean;
      cropped?: boolean;
      left: number;
      top: number;
      width: number;
      height: number;
      angle: number;
      dpi: number | null;
      text?: string;
      font?: string;
      fontSize?: number;
      color?: string;
      bold?: boolean;
    };
type Panel = "files" | "text" | "shapes" | "ai" | "inspiration" | "layers" | null;
type InspirationItem = { id: string; name: string; previewUrl: string };
type Mockup = { color: string; hex: string; url: string };
type PreviewData = { views: { name: string; url: string }[]; colors: Mockup[] };

const SIZE = 720;
const DPI = 300;
const INK = "#1f7048";
const TEXT_COLORS = ["#101828", "#ffffff", "#c8102e", "#f2a900", "#1f7048", "#2a4ea6", "#e7407c", "#7c5cc4"];
const POSITION_LABEL: Record<string, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
  neck: "Neck label",
};

function isWhite(hex: string | null) {
  return !hex || /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex);
}
function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function ProductEditor({
  blanks,
  designs,
  initialDesignId,
  initialBlankId,
  initialTransform,
  initialStudio,
  surfaceImages = {},
  savedDesigns = [],
}: Props) {
  const blank = blanks.find((b) => b.id === initialBlankId) ?? blanks[0];
  const colors = blank?.variantOptions?.colors ?? [];
  const sizes = blank?.variantOptions?.sizes ?? [];
  const specs = blank?.catalogSource?.printAreas ?? [];
  const catalogPhotos = blank?.catalogSource?.images ?? [];

  const urls = useRef<Record<string, string>>({
    ...surfaceImages,
    ...Object.fromEntries(designs.filter((d) => d.previewUrl).map((d) => [d.id, d.previewUrl!])),
  });
  const initial = useRef<StudioLayout>(
    initialStudio ?? {
      version: 1,
      surfaces: (
        blank?.printArea?.surfaces ?? [
          { id: "front", name: "Front", position: "front", assetId: null, area: blank?.printArea ?? defaultArea },
        ]
      ).map((s) => ({ ...s, layers: [] })),
    },
  );
  const doc = useRef<StudioLayout>(structuredClone(initial.current));
  const [surfaces, setSurfaces] = useState(doc.current.surfaces);
  const [surfaceId, setSurfaceId] = useState(surfaces[0].id);
  const currentId = useRef(surfaceId);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const editor = useRef<Canvas | null>(null);
  const guide = useRef<Rect | null>(null);
  const meta = useRef(new WeakMap<FabricObject, StudioLayer>());
  const history = useRef<StudioLayout[]>([]);
  const future = useRef<StudioLayout[]>([]);
  const tinted = useRef(new Map<string, Promise<string | null>>());
  const patternRevision = useRef(0);
  const mockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorRef = useRef<string | null>(colors[0]?.hex ?? null);
  const booted = useRef(false);
  const dirty = useRef(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const [library, setLibrary] = useState(designs);
  const [colorName, setColorName] = useState<string | null>(colors[0]?.name ?? null);
  const [panel, setPanel] = useState<Panel>(null);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState(blank?.name ?? "My product");
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [selected, setSelected] = useState<Selected>(null);
  const [redoCount, setRedoCount] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [search, setSearch] = useState("");
  const [brief, setBrief] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [activeRegionId, setActiveRegionState] = useState<string | null>(null);
  const activeRegionRef = useRef<string | null>(null);
  const setActiveRegionId = (id: string | null) => { activeRegionRef.current = id; setActiveRegionState(id); };
  const [setupSaved, setSetupSaved] = useState(false);
  const [outside, setOutside] = useState(false);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewPick, setPreviewPick] = useState<{ kind: "view" | "color"; index: number }>({ kind: "view", index: 0 });
  const [viewThumbs, setViewThumbs] = useState<Record<string, string>>({});
  const [inspiration, setInspiration] = useState<InspirationItem[] | null>(null);
  const [reference, setReference] = useState<InspirationItem | null>(null);
  const [aiMode, setAiMode] = useState<"design" | "pattern">("design");
  const [editPrompt, setEditPrompt] = useState("");
  const [cropping, setCropping] = useState<{ src: string; initial?: CropPixels } | null>(null);
  const inspirationInput = useRef<HTMLInputElement>(null);
  const [photoScores, setPhotoScores] = useState<Record<string, number>>({});
  const [viewPicker, setViewPicker] = useState<{ mode: "add" | "replace"; position: string } | null>(null);

  const surface = () => doc.current.surfaces.find((s) => s.id === currentId.current)!;
  const spec = (s: Surface = surface()) => {
    const region = regionsFor(s).find(r => s.id === currentId.current && r.id === activeRegionRef.current) ?? regionsFor(s).find(r => r.bounds.x === s.area.x && r.bounds.y === s.area.y && r.bounds.width === s.area.width && r.bounds.height === s.area.height) ?? regionsFor(s)[0];
    if (region?.dimensions) {
      const d = region.dimensions, factor = d.unit === "cm" ? DPI / 2.54 : DPI;
      return { position: s.position ?? s.id, width: Math.round(d.width * factor), height: Math.round(d.height * factor) };
    }
    if (s.printRegions !== undefined) return undefined;
    return specs.find(a => a.position === s.position) ?? (s.id === doc.current.surfaces[0].id ? specs.find(a => a.position === "front") : undefined);
  };
  function printClip(s: Surface, layer?: StudioLayer) {
    const regions = regionsFor(s).filter(r => !layer?.printRegionId || r.id === layer.printRegionId);
    return new Path(regions.map(r => regionPath(r)).join(" ") || "M 0 0 Z", { absolutePositioned: true, fill: "black", strokeWidth: 0 });
  }
  /** Printed inches per canvas pixel for the current view, when the real print size is known. */
  const inchesPerPx = (s: Surface = surface(), axis: "x" | "y" = "x") => {
    const sp = spec(s);
    return sp ? (axis === "x" ? sp.width / s.area.width : sp.height / s.area.height) / DPI / SIZE : null;
  };
  const locked = Boolean(busy) || !ready;
  const canDesign = () => { if (regionsFor(surface()).length) return true; setSetupOpen(true); return false; };

  /* ---------- document <-> canvas ---------- */

  function capture() {
    const canvas = editor.current;
    if (!canvas) return;
    const s = surface();
    s.layers = canvas
      .getObjects()
      .filter((o) => meta.current.has(o))
      .map((o) => {
        const base = meta.current.get(o)!;
        return {
          ...base,
          x: o.left,
          y: o.top,
          scaleX: o.scaleX,
          scaleY: o.scaleY,
          angle: o.angle,
          opacity: o.opacity < 1 ? round(o.opacity, 3) : undefined,
          flipX: o.flipX || undefined,
          flipY: o.flipY || undefined,
          ...(o instanceof IText
            ? {
                text: o.text,
                color: String(o.fill),
                fontSize: o.fontSize,
                bold: o.fontWeight === "bold" || o.fontWeight === 700,
              }
            : {}),
          ...(base.kind === "shape" && typeof o.fill === "string" ? { fill: o.fill } : {}),
        } as StudioLayer;
      });
    setLayers([...s.layers]);
    checkOutside();
    scheduleMockups();
  }
  function checkpoint() {
    capture();
    future.current = []; setRedoCount(0);
    history.current = [...history.current.slice(-39), structuredClone(doc.current)];
    setUndoCount(history.current.length);
    dirty.current = true;
  }
  function checkOutside() {
    const canvas = editor.current;
    if (!canvas) return;
    const regions = regionsFor(surface());
    const ctx = document.createElement("canvas").getContext("2d")!;
    setOutside(canvas.getObjects().filter(o => meta.current.has(o) && o.visible).some(o => {
      const regionId = meta.current.get(o)?.printRegionId;
      const paths = regions.filter(r => !regionId || r.id === regionId).map(r => new Path2D(regionPath(r)));
      const b = o.getBoundingRect();
      return [0, .25, .5, .75, 1].some(x => [0, .25, .5, .75, 1].some(y =>
        !paths.some(p => ctx.isPointInPath(p, b.left + b.width * x, b.top + b.height * y))));
    }));
  }

  function readSelection() {
    const o = editor.current?.getActiveObject();
    if (!o || o === guide.current || !meta.current.has(o)) {
      setSelected(null);
      return;
    }
    const base = meta.current.get(o)!;
    const assigned = surface().printRegions?.find(r => r.id === base.printRegionId);
    if (assigned) { surface().area = assigned.bounds; setActiveRegionId(assigned.id); }
    const a = surface().area;
    const ipp = inchesPerPx();
    const unitY = inchesPerPx(surface(), "y") ?? 1 / (a.width * SIZE) * 100;
    const unit = ipp ?? 1 / (a.width * SIZE) * 100; // inches, or % of print width
    const br = o.getBoundingRect();
    const text = o instanceof IText;
    const assetId = base.kind === "image" || base.kind === "pattern" ? base.assetId : undefined;
    setSelected({
      kind: base.kind,
      name: text ? (o as IText).text.slice(0, 40) : (library.find((d) => d.id === assetId)?.name ?? (base.kind === "shape" ? "Shape" : "Artwork")),
      opacity: o.opacity,
      flipX: o.flipX,
      flipY: o.flipY,
      assetId,
      printRegionId: base.printRegionId,
      fill: base.kind === "shape" && typeof o.fill === "string" ? o.fill : undefined,
      tile: base.kind === "pattern" ? base.tile : undefined,
      gap: base.kind === "pattern" ? base.gap : undefined,
      brick: base.kind === "pattern" ? base.brick : undefined,
      cropped: base.kind === "image" && Boolean(base.crop),
      left: round((br.left - a.x * SIZE) * unit),
      top: round((br.top - a.y * SIZE) * unitY),
      width: round(o.getScaledWidth() * unit),
      height: round(o.getScaledHeight() * unitY),
      angle: Math.round(o.angle),
      dpi: base.kind === "image" && ipp ? Math.round(Math.min(1 / (o.scaleX * ipp), 1 / (o.scaleY * (inchesPerPx(surface(), "y") ?? ipp)))) : null,
      ...(text
        ? {
            text: (o as IText).text,
            font: base.kind === "text" ? (base.font ?? "inter") : "inter",
            fontSize: (o as IText).fontSize,
            color: String((o as IText).fill),
            bold: (o as IText).fontWeight === "bold" || (o as IText).fontWeight === 700,
          }
        : {}),
    });
  }

  async function makeLayer(layer: StudioLayer) {
    let obj: FabricObject;
    if (layer.kind === "image") {
      obj = await FabricImage.fromURL(urls.current[layer.assetId], { crossOrigin: "anonymous" });
      if (layer.crop) obj.set({ cropX: layer.crop.x, cropY: layer.crop.y, width: layer.crop.width, height: layer.crop.height });
    } else if (layer.kind === "shape") {
      obj = makeShape(layer.shape, layer.width, layer.height, layer.fill);
    } else if (layer.kind === "pattern") {
      obj = await makePatternRect(urls.current[layer.assetId], layer);
      obj.set({ lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
    } else {
      const bold = layer.bold ?? true;
      await ensureFont(layer.font, bold);
      obj = new IText(layer.text, {
        fontSize: layer.fontSize,
        fill: layer.color,
        fontFamily: fontFamily(layer.font),
        fontWeight: bold ? "bold" : "normal",
      });
    }
    obj.set({
      left: layer.x,
      top: layer.y,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      angle: layer.angle,
      opacity: layer.opacity ?? 1,
      flipX: layer.flipX ?? false,
      flipY: layer.flipY ?? false,
      cornerColor: "#ffffff",
      cornerStrokeColor: INK,
      cornerStyle: "circle",
      cornerSize: 11,
      transparentCorners: false,
      borderColor: INK,
      borderScaleFactor: 1.5,
      padding: 4,
    });
    meta.current.set(obj, layer);
    return obj;
  }

  function photoFor(s: Surface) {
    return (s.assetId ? urls.current[s.assetId] : null) ?? s.imageUrl ?? blank?.imageUrl ?? null;
  }
  /** The view photo cleaned and recolored to a garment color; null keeps the original. */
  function recolored(src: string, hex: string | null, area: Area) {
    if (!hex) return Promise.resolve(src);
    const target = isWhite(hex) ? "#ffffff" : hex!;
    const key = `${src}|${target}`;
    if (!tinted.current.has(key))
      tinted.current.set(
        key,
        tintGarment(src, target, { x: area.x + area.width / 2, y: area.y + area.height / 2 })
          .then((r) => r?.url ?? null)
          .catch(() => null),
      );
    return tinted.current.get(key)!;
  }

  async function paint(canvas: StaticCanvas, s: Surface, withGuide = false, hex: string | null = colorRef.current) {
    canvas.clear();
    canvas.backgroundColor = "#f4f5f7";
    const original = photoFor(s);
    if (!original) throw new Error("This view’s photo is unavailable. Choose another photo.");
    const source = (await recolored(original, hex, s.area)) ?? original;
    const image = await FabricImage.fromURL(source, { crossOrigin: "anonymous" });
    if (withGuide && canvas !== editor.current) return;
    const ratio = Math.min(SIZE / image.width, SIZE / image.height);
    image.set({
      left: (SIZE - image.width * ratio) / 2,
      top: (SIZE - image.height * ratio) / 2,
      scaleX: ratio,
      scaleY: ratio,
    });
    canvas.backgroundImage = image;
    for (const layer of s.layers) {
      const object = await makeLayer(layer);
      object.set({ visible: !layer.hidden, selectable: !layer.locked, evented: !layer.locked });
      if (withGuide && canvas !== editor.current) return;
      if (!withGuide) object.clipPath = printClip(s, layer);
      canvas.add(object);
    }
    if (withGuide) {
      const a = s.area;
      const rect = new Rect({
        left: a.x * SIZE,
        top: a.y * SIZE,
        width: a.width * SIZE,
        height: a.height * SIZE,
        fill: "rgba(31,112,72,0.04)",
        stroke: INK,
        strokeWidth: 1.2,
        strokeDashArray: [6, 5],
        strokeUniform: true,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        lockRotation: true,
        cornerColor: "#ffffff",
        cornerStrokeColor: INK,
        cornerStyle: "circle",
        transparentCorners: false,
        borderColor: INK,
      });
      guide.current = rect;
      if (s.printRegions === undefined) canvas.add(rect);
      else for (const region of regionsFor(s)) canvas.add(new Path(regionPath(region), {
        fill: "rgba(31,112,72,0.025)", stroke: INK, strokeWidth: 1.2, strokeDashArray: [6, 5],
        selectable: false, evented: false, excludeFromExport: true,
      }));
    }
    canvas.renderAll();
  }

  async function loadSurface(id: string) {
    setReady(false);
    setError("");
    currentId.current = id;
    setSurfaceId(id);
    setSelected(null);
    const canvas = editor.current!;
    try {
      const next = doc.current.surfaces.find(s => s.id === id)!;
      const region = next.printRegions?.find(r => r.bounds.x === next.area.x && r.bounds.y === next.area.y && r.bounds.width === next.area.width && r.bounds.height === next.area.height) ?? next.printRegions?.[0];
      setActiveRegionId(region?.id ?? null);
      if (region) next.area = region.bounds;
      await paint(canvas, next, true);
      if (editor.current !== canvas) return;
      setLayers([...surface().layers]);
      setReady(true);
      checkOutside();
      scheduleMockups(0);
    } catch (e) {
      if (editor.current === canvas) setError(e instanceof Error ? e.message : "Couldn’t load this view.");
    }
  }

  // Rank catalog photos (clean, flat, full product first) when the picker opens.
  useEffect(() => {
    if (!viewPicker || Object.keys(photoScores).length) return;
    let live = true;
    (async () => {
      const scores: Record<string, number> = {};
      for (const src of catalogPhotos.slice(0, 20)) {
        scores[src] = (await analyzePhoto(src).catch(() => ({ score: -3 }))).score;
        if (!live) return;
      }
      setPhotoScores(scores);
    })();
    return () => {
      live = false;
    };
    // catalogPhotos is fixed for this blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPicker, photoScores]);

  // View tabs show each view's cleaned photo in the current color.
  useEffect(() => {
    let live = true;
    (async () => {
      const next: Record<string, string> = {};
      for (const s of surfaces) {
        const src = photoFor(s);
        if (src) next[s.id] = (await recolored(src, colorRef.current, s.area)) ?? src;
      }
      if (live) setViewThumbs(next);
    })();
    return () => {
      live = false;
    };
    // Recolored photos are cached; re-run when views or the color change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaces, colorName]);

  /* ---------- live color mockups ---------- */

  const renderMockups = useCallback(async () => {
    const s = doc.current.surfaces.find((x) => x.id === currentId.current);
    if (!s) return;
    const list = colors.length ? colors.slice(0, 12) : [{ name: "", hex: "#ffffff" }];
    const out: Mockup[] = [];
    for (const c of list) {
      const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
      try {
        await paint(canvas, s, false, c.hex);
        out.push({ color: c.name, hex: c.hex, url: canvas.toDataURL({ format: "jpeg", quality: 0.8, multiplier: 0.3 }) });
      } catch {
        // Skip a color that can't render; the rest still show.
      } finally {
        await canvas.dispose();
      }
    }
    setMockups(out);
    // paint/colors are stable for the life of this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function scheduleMockups(delay = 700) {
    if (mockTimer.current) clearTimeout(mockTimer.current);
    mockTimer.current = setTimeout(() => void renderMockups(), delay);
  }

  /* ---------- canvas lifecycle ---------- */

  useEffect(() => {
    let disposed = false;
    const element = document.createElement("canvas");
    host.current!.appendChild(element);
    const canvas = new Canvas(element, {
      width: SIZE,
      height: SIZE,
      preserveObjectStacking: true,
      selection: false,
    });
    editor.current = canvas;
    canvas.on("selection:created", readSelection);
    canvas.on("selection:updated", readSelection);
    canvas.on("selection:cleared", readSelection);
    canvas.on("before:transform", () => checkpoint());
    canvas.on("text:editing:entered", () => checkpoint());
    canvas.on("object:modified", () => {
      capture();
      readSelection();
      dirty.current = true;
    });
    canvas.on("object:moving", () => readSelection());
    canvas.on("object:scaling", () => readSelection());
    canvas.on("object:rotating", () => readSelection());
    canvas.on("text:changed", () => {
      capture();
      readSelection();
      dirty.current = true;
    });
    (async () => {
      try {
        if (!booted.current && !initialStudio && initialDesignId && urls.current[initialDesignId]) {
          const img = await FabricImage.fromURL(urls.current[initialDesignId], { crossOrigin: "anonymous" });
          if (disposed) return;
          const a = doc.current.surfaces[0].area;
          const scale = initialTransform?.scale ?? Math.min((a.width * SIZE) / img.width, (a.height * SIZE) / img.height);
          doc.current.surfaces[0].layers.push({
            id: crypto.randomUUID(),
            kind: "image",
            assetId: initialDesignId,
            x: initialTransform?.offsetX ?? a.x * SIZE + (a.width * SIZE - img.width * scale) / 2,
            y: initialTransform?.offsetY ?? a.y * SIZE + (a.height * SIZE - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            angle: initialTransform?.rotation ?? 0,
          });
        }
        if (!booted.current && !initialStudio && initialTransform?.text?.value) {
          const t = initialTransform.text;
          doc.current.surfaces[0].layers.push({
            id: crypto.randomUUID(),
            kind: "text",
            text: t.value,
            x: t.x - t.value.length * t.size * 0.25,
            y: t.y - t.size / 2,
            fontSize: t.size,
            color: t.color,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
          });
        }
        booted.current = true;
        if (!disposed) await loadSurface(currentId.current);
      } catch {
        if (!disposed) setError("Couldn’t load your design. Refresh to try again.");
      }
    })();
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      disposed = true;
      if (editor.current === canvas) editor.current = null;
      window.removeEventListener("beforeunload", leave);
      if (mockTimer.current) clearTimeout(mockTimer.current);
      void canvas.dispose();
    };
    // The editor owns its document; uploads update its library without remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the canvas to the stage, then apply zoom.
  useEffect(() => {
    const el = stage.current;
    const canvas = editor.current;
    if (!el || !canvas) return;
    const fit = () => {
      const box = el.getBoundingClientRect();
      const side = Math.max(240, Math.min(box.width - 48, box.height - 48));
      const px = Math.round(side * zoom);
      canvas.setDimensions({ width: `${px}px`, height: `${px}px` }, { cssOnly: true });
      canvas.calcOffset();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);

  // Keyboard: delete, undo, nudge — never while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      const o = editor.current?.getActiveObject();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void redo(); else void undo();
        return;
      }
      if (!o || !meta.current.has(o) || (o instanceof IText && o.isEditing)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        changeSelected((obj) =>
          obj.set({
            left: obj.left + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
            top: obj.top + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
          }),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- adding & editing ---------- */

  async function addArtwork(id: string) {
    if (!canDesign()) return;
    if (locked) return;
    setBusy("Adding artwork…");
    setError("");
    checkpoint();
    try {
      const image = await FabricImage.fromURL(urls.current[id], { crossOrigin: "anonymous" });
      const a = surface().area;
      const scale = Math.min((a.width * SIZE) / image.width, (a.height * SIZE) / image.height) * 0.9;
      const layer: StudioLayer = {
        id: crypto.randomUUID(),
        printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
        kind: "image",
        assetId: id,
        x: a.x * SIZE + (a.width * SIZE - image.width * scale) / 2,
        y: a.y * SIZE + (a.height * SIZE - image.height * scale) / 3,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
      };
      const obj = await makeLayer(layer);
      editor.current!.add(obj);
      bringGuideToTop();
      editor.current!.setActiveObject(obj);
      editor.current!.requestRenderAll();
      capture();
      readSelection();
    } catch {
      setError("Couldn’t add this artwork. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  async function upload(file: File | undefined, ai = false) {
    if (!file && !ai) return;
    setBusy(ai ? "Creating artwork with AI…" : "Uploading…");
    setError("");
    try {
      const form = new FormData();
      if (file) form.set("artwork", file);
      const result = ai ? await generateArtworkAction(brief) : await uploadCanvasArtworkAction(form);
      if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Couldn’t upload artwork.");
      urls.current[result.assetId] = result.previewUrl;
      setLibrary((items) => [
        { id: result.assetId!, name: result.name || file?.name || "New artwork", previewUrl: result.previewUrl! },
        ...items,
      ]);
      setBusy(null);
      await addArtwork(result.assetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add artwork.");
    } finally {
      setBusy(null);
    }
  }
  async function addText(preset: { text: string; size: number; font?: string; bold?: boolean } = { text: "Your text", size: 48 }) {
    if (!canDesign()) return;
    if (locked) return;
    checkpoint();
    const a = surface().area;
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
      kind: "text",
      text: preset.text,
      x: a.x * SIZE + 10,
      y: a.y * SIZE + (a.height * SIZE) / 3,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      fontSize: preset.size,
      color: isWhite(colorRef.current) ? "#101828" : "#ffffff",
      font: preset.font ?? "inter",
      bold: preset.bold ?? true,
    };
    const obj = await makeLayer(layer);
    // Start inside the print area: shrink long text to fit its width.
    const maxW = a.width * SIZE * 0.9;
    if (obj.getScaledWidth() > maxW) obj.scale(maxW / obj.width);
    editor.current!.add(obj);
    alignSelected("hcenter", obj);
    bringGuideToTop();
    editor.current!.setActiveObject(obj);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function bringGuideToTop() {
    if (!editor.current) return;
    for (const object of editor.current.getObjects()) if (object.excludeFromExport) editor.current.bringObjectToFront(object);
  }
  function changeSelected(change: (obj: FabricObject) => void, record = true) {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    if (record) checkpoint();
    change(o);
    o.setCoords();
    capture();
    editor.current!.requestRenderAll();
    readSelection();
  }
  function alignSelected(to: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom", target?: FabricObject) {
    const apply = (o: FabricObject) => {
      const a = surface().area;
      const br = o.getBoundingRect();
      const [l, t, w, h] = [a.x * SIZE, a.y * SIZE, a.width * SIZE, a.height * SIZE];
      const dx = to === "left" ? l - br.left : to === "hcenter" ? l + (w - br.width) / 2 - br.left : to === "right" ? l + w - br.width - br.left : 0;
      const dy = to === "top" ? t - br.top : to === "vcenter" ? t + (h - br.height) / 2 - br.top : to === "bottom" ? t + h - br.height - br.top : 0;
      o.set({ left: o.left + dx, top: o.top + dy });
      o.setCoords();
    };
    if (target) apply(target);
    else changeSelected(apply);
  }
  function fitSelected() {
    changeSelected((o) => {
      const a = surface().area;
      const s = Math.min((a.width * SIZE) / o.width, (a.height * SIZE) / o.height);
      o.set({ scaleX: s, scaleY: s, angle: 0 });
      o.setCoords();
      alignSelected("hcenter", o);
      alignSelected("top", o);
    });
  }
  /** Numeric edits from the properties panel, in inches (or % of print width). */
  function setGeometry(field: "left" | "top" | "width" | "height" | "angle", value: number) {
    if (!Number.isFinite(value)) return;
    changeSelected((o) => {
      const a = surface().area;
      const ipp = inchesPerPx(surface(), field === "top" || field === "height" ? "y" : "x");
      const toPx = (v: number) => (ipp ? v / ipp : (v / 100) * a.width * SIZE);
      if (field === "angle") o.rotate(value);
      else if (field === "width" || field === "height") {
        const px = toPx(value);
        const s = field === "width" ? px / o.width : px / o.height;
        if (s > 0) o.set({ scaleX: s, scaleY: s });
      } else {
        const br = o.getBoundingRect();
        const target = (field === "left" ? a.x : a.y) * SIZE + toPx(value);
        o.set(field === "left" ? { left: o.left + target - br.left } : { top: o.top + target - br.top });
      }
    });
  }
  async function setFont(key: string) {
    const o = editor.current?.getActiveObject();
    if (!(o instanceof IText)) return;
    const bold = o.fontWeight === "bold" || o.fontWeight === 700;
    await ensureFont(key, bold);
    changeSelected((obj) => {
      obj.set({ fontFamily: fontFamily(key) });
      const base = meta.current.get(obj);
      if (base?.kind === "text") meta.current.set(obj, { ...base, font: key });
    });
  }
  async function duplicate() {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    checkpoint();
    const source = surface().layers.find((l) => l.id === meta.current.get(o)?.id)!;
    const copy = await makeLayer({ ...source, id: crypto.randomUUID(), x: source.x + 16, y: source.y + 16 });
    editor.current!.add(copy);
    bringGuideToTop();
    editor.current!.setActiveObject(copy);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  /* ---------- Canva-style tools ---------- */

  async function addShape(kind: ShapeKind) {
    if (!canDesign()) return;
    if (locked) return;
    checkpoint();
    const def = SHAPES.find((x) => x.kind === kind)!;
    const a = surface().area;
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
      kind: "shape",
      shape: kind,
      fill: isWhite(colorRef.current) ? "#1f7048" : "#ffffff",
      width: def.w,
      height: def.h,
      x: a.x * SIZE + (a.width * SIZE - def.w) / 2,
      y: a.y * SIZE + (a.height * SIZE - def.h) / 3,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    };
    const obj = await makeLayer(layer);
    const maxW = a.width * SIZE * 0.8;
    if (obj.getScaledWidth() > maxW) obj.scale(maxW / obj.width);
    editor.current!.add(obj);
    alignSelected("hcenter", obj);
    bringGuideToTop();
    editor.current!.setActiveObject(obj);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function setFill(hex: string, record = true) {
    changeSelected((o) => o.set({ fill: hex }), record);
  }
  function setOpacity(v: number) {
    changeSelected((o) => o.set({ opacity: v }), false);
  }
  function flip(axis: "x" | "y") {
    changeSelected((o) => o.set(axis === "x" ? { flipX: !o.flipX } : { flipY: !o.flipY }));
  }
  function openCrop() {
    const o = editor.current?.getActiveObject();
    const base = o && meta.current.get(o);
    if (!(o instanceof FabricImage) || base?.kind !== "image") return;
    setCropping({ src: urls.current[base.assetId], initial: base.crop });
  }
  function applyCrop(px: CropPixels | null) {
    changeSelected((o) => {
      const img = o as FabricImage;
      const base = meta.current.get(o);
      if (base?.kind !== "image") return;
      const el = img.getElement() as HTMLImageElement;
      const window = px ?? { x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight };
      const shown = img.getScaledWidth();
      img.set({ cropX: window.x, cropY: window.y, width: window.width, height: window.height });
      img.scale(shown / window.width);
      meta.current.set(o, { ...base, crop: px ?? undefined });
    });
    setCropping(null);
  }
  /** Swap the selected artwork for a new file, keeping its size and place. */
  async function replaceArtwork(assetId: string, url: string, name: string) {
    urls.current[assetId] = url;
    setLibrary((items) => [{ id: assetId, name, previewUrl: url }, ...items]);
    const o = editor.current?.getActiveObject();
    const base = o && meta.current.get(o);
    if (!(o instanceof FabricImage) || base?.kind !== "image") return;
    checkpoint();
    const shown = o.getScaledWidth();
    await o.setSrc(url, { crossOrigin: "anonymous" });
    o.set({ cropX: 0, cropY: 0 });
    o.scale(shown / o.width);
    meta.current.set(o, { ...base, assetId, crop: undefined });
    o.setCoords();
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  async function removeBg() {
    if (!selected?.assetId) return;
    setBusy("Removing background…");
    setError("");
    try {
      const r = await removeBackgroundAction(selected.assetId);
      if (!r.ok) throw new Error(r.error);
      await replaceArtwork(r.assetId, r.previewUrl, r.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t remove the background.");
    } finally {
      setBusy(null);
    }
  }
  async function aiEdit() {
    if (!selected?.assetId || editPrompt.trim().length < 4) return;
    setBusy("Editing with AI…");
    setError("");
    try {
      const r = await editDesignAction(selected.assetId, editPrompt);
      if (!r.ok) throw new Error(r.error);
      await replaceArtwork(r.assetId, r.previewUrl, r.name);
      setEditPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t edit this design.");
    } finally {
      setBusy(null);
    }
  }
  /** Fill the print area with a repeat of one motif (the selected artwork, or a file). */
  async function makePattern(assetId?: string) {
    const o = editor.current?.getActiveObject();
    const base = o && meta.current.get(o);
    const source = assetId ?? (base?.kind === "image" ? base.assetId : undefined);
    if (!source || locked || !canDesign()) return;
    checkpoint();
    const a = surface().area;
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
      kind: "pattern",
      assetId: source,
      tile: 0.22,
      gap: 0.15,
      brick: true,
      width: a.width * SIZE,
      height: a.height * SIZE,
      x: a.x * SIZE,
      y: a.y * SIZE,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    };
    setBusy("Creating pattern…");
    try {
      const obj = await makeLayer(layer);
      if (o && base?.kind === "image" && !assetId) editor.current!.remove(o);
      editor.current!.add(obj);
      editor.current!.sendObjectToBack(obj);
      bringGuideToTop();
      editor.current!.setActiveObject(obj);
      capture();
      readSelection();
      editor.current!.requestRenderAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the pattern.");
    } finally {
      setBusy(null);
    }
  }
  /** Rebuild the selected pattern with new tile size / spacing / layout. */
  async function updatePattern(patch: { tile?: number; gap?: number; brick?: boolean }) {
    const o = editor.current?.getActiveObject();
    const base = o && meta.current.get(o);
    if (!o || base?.kind !== "pattern") return;
    checkpoint();
    const next = { ...base, ...patch };
    const revision = ++patternRevision.current;
    meta.current.set(o, next);
    let fresh;
    try { fresh = await makePatternRect(urls.current[base.assetId], next); } catch { setError("Couldn’t update this pattern."); return; }
    if (revision !== patternRevision.current || !editor.current?.getObjects().includes(o)) return;
    o.set({ fill: fresh.fill });
    meta.current.set(o, next);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  async function loadInspiration() {
    if (inspiration) return;
    const r = await listInspirationAction();
    setInspiration(r.ok ? r.items : []);
  }
  async function addInspirationPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("Saving inspiration…");
    try {
      const form = new FormData();
      form.set("photo", file);
      const r = await addInspirationAction(form);
      if (!r.ok) throw new Error(r.error);
      setInspiration((items) => [r.item, ...(items ?? [])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save this image.");
    } finally {
      setBusy(null);
    }
  }
  async function createWithAi() {
    setBusy(aiMode === "pattern" ? "Creating a seamless pattern…" : "Creating your design…");
    setError("");
    try {
      const r = await generateDesignAction({ brief, seamless: aiMode === "pattern", referenceAssetId: reference?.id ?? null });
      if (!r.ok) throw new Error(r.error);
      urls.current[r.assetId] = r.previewUrl;
      setLibrary((items) => [{ id: r.assetId, name: r.name, previewUrl: r.previewUrl }, ...items]);
      setBusy(null);
      if (aiMode === "pattern") {
        editor.current?.discardActiveObject();
        await makePattern(r.assetId);
        const o = editor.current?.getActiveObject();
        if (o) await updatePattern({ tile: 0.5, gap: 0, brick: false });
      } else await addArtwork(r.assetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the design.");
    } finally {
      setBusy(null);
    }
  }
  function removeSelected() {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    checkpoint();
    editor.current!.remove(o);
    editor.current!.discardActiveObject();
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function reorder(dir: "up" | "down") {
    changeSelected((o) => {
      if (dir === "up") editor.current!.bringObjectForward(o);
      else editor.current!.sendObjectBackwards(o);
      bringGuideToTop();
    });
  }
  function selectLayer(id: string) {
    const o = editor.current?.getObjects().find((x) => meta.current.get(x)?.id === id);
    if (!o) return;
    editor.current!.setActiveObject(o);
    editor.current!.requestRenderAll();
    readSelection();
  }
  async function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    capture(); future.current.push(structuredClone(doc.current)); setRedoCount(future.current.length);
    doc.current = previous;
    setSurfaces([...previous.surfaces]);
    setUndoCount(history.current.length);
    await loadSurface(previous.surfaces.some((s) => s.id === currentId.current) ? currentId.current : previous.surfaces[0].id);
    const last = surface().layers.filter(l => !l.hidden && !l.locked).at(-1); if (last) selectLayer(last.id);
  }
  async function redo() {
    const next = future.current.pop(); if (!next) return;
    capture(); history.current.push(structuredClone(doc.current)); setUndoCount(history.current.length);
    doc.current = next; setSurfaces([...next.surfaces]); setRedoCount(future.current.length);
    await loadSurface(next.surfaces.some(s => s.id === currentId.current) ? currentId.current : next.surfaces[0].id);
    const last = surface().layers.filter(l => !l.hidden && !l.locked).at(-1); if (last) selectLayer(last.id);
  }
  function toggleLayer(id: string, key: "hidden" | "locked") {
    checkpoint();
    const layer = surface().layers.find(l => l.id === id)!;
    const object = editor.current!.getObjects().find(o => meta.current.get(o)?.id === id)!;
    const next = { ...layer, [key]: !layer[key] };
    meta.current.set(object, next);
    object.set({ visible: !next.hidden, selectable: !next.locked, evented: !next.locked });
    editor.current!.discardActiveObject(); editor.current!.requestRenderAll(); capture(); readSelection();
  }
  function pickColor(c: { name: string; hex: string }) {
    if (colorName === c.name || locked) return;
    capture();
    colorRef.current = c.hex;
    setColorName(c.name);
    void loadSurface(currentId.current);
  }

  /* ---------- views & print area ---------- */

  async function persistViews() {
    const result = await saveBlankSurfacesAction(
      blank.id,
      doc.current.surfaces.map((s) => ({
        id: s.id,
        name: s.name,
        assetId: s.assetId,
        imageUrl: s.imageUrl ?? null,
        position: s.position,
        area: s.area,
        printRegions: s.printRegions,
      })),
    );
    if (result.error) throw new Error(result.error);
  }
  /** A print area on a photo, placed on the garment when it can be found. */
  async function areaForPhoto(src: string, position: string): Promise<Area> {
    const sp = specs.find((a) => a.position === position);
    const ratio = sp ? sp.height / sp.width : 1.2;
    if (position.includes("sleeve") || position === "neck") {
      const w = 0.12;
      return { x: 0.44, y: 0.3, width: w, height: Math.min(0.3, w * ratio) };
    }
    try {
      const info = await analyzePhoto(src);
      if (info.box) {
        const img = await FabricImage.fromURL(src, { crossOrigin: "anonymous" });
        const r = Math.min(SIZE / img.width, SIZE / img.height);
        const [ox, oy, dw, dh] = [(SIZE - img.width * r) / 2, (SIZE - img.height * r) / 2, img.width * r, img.height * r];
        const a = printAreaInBox(info.box, (ratio * dw) / dh);
        return { x: (ox + a.x * dw) / SIZE, y: (oy + a.y * dh) / SIZE, width: (a.width * dw) / SIZE, height: (a.height * dh) / SIZE };
      }
    } catch {
      // fall through
    }
    return { ...defaultArea };
  }
  async function useViewPhoto(photo: { imageUrl?: string; file?: File }) {
    if (!viewPicker) return;
    setBusy("Setting up view…");
    setError("");
    try {
      let assetId: string | null = null;
      let src = photo.imageUrl ?? null;
      if (photo.file) {
        const data = new FormData();
        data.set("photo", photo.file);
        const result = await uploadSurfaceAction(data);
        if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Upload failed.");
        assetId = result.assetId;
        urls.current[assetId] = result.previewUrl;
        src = result.previewUrl;
      }
      const area = await areaForPhoto(src!, viewPicker.position);
      checkpoint();
      if (viewPicker.mode === "replace") {
        const s = surface();
        s.assetId = assetId;
        s.imageUrl = assetId ? null : photo.imageUrl;
        if (s.printRegions === undefined) s.area = area;
      } else {
        doc.current.surfaces.push({
          id: `${viewPicker.position}-${crypto.randomUUID().slice(0, 6)}`,
          name: POSITION_LABEL[viewPicker.position] ?? viewPicker.position,
          position: viewPicker.position,
          assetId,
          imageUrl: assetId ? null : photo.imageUrl,
          area,
          layers: [],
        });
      }
      setSurfaces([...doc.current.surfaces]);
      await persistViews();
      const id = viewPicker.mode === "replace" ? currentId.current : doc.current.surfaces.at(-1)!.id;
      setViewPicker(null);
      await loadSurface(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t set up this view.");
    } finally {
      setBusy(null);
    }
  }
  /* ---------- preview, print files, save ---------- */

  /** One view's artwork alone, transparent, on the full editor canvas. */
  async function designLayerPng(s: Surface) {
    const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
    try {
      for (const layer of s.layers.filter(l => !l.hidden)) { const object = await makeLayer(layer); object.clipPath = printClip(s, layer); canvas.add(object); }
      canvas.renderAll();
      return canvas.toDataURL({ format: "png", multiplier: 1 });
    } finally {
      await canvas.dispose();
    }
  }
  async function buildPreview(): Promise<PreviewData> {
    capture();
    const views = [];
    for (const s of doc.current.surfaces) {
      const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
      try {
        await paint(canvas, s);
        views.push({ name: s.name, url: canvas.toDataURL({ format: "png", multiplier: 1 }) });
      } finally {
        await canvas.dispose();
      }
    }
    // Storefront colour mockups go through the mockup renderer (flat today).
    const front = doc.current.surfaces[0];
    const perColor: Mockup[] = [];
    const design = await designLayerPng(front);
    const photo = photoFor(front);
    const renderer = getMockupRenderer();
    for (const c of colors) {
      if (!photo) break;
      const base = (await recolored(photo, c.hex, front.area)) ?? photo;
      const url = await renderer.render({
        photo: base,
        design,
        area: front.area,
        size: SIZE,
        product: { blankId: blank.id, position: front.position, color: c.name },
      });
      perColor.push({ color: c.name, hex: c.hex, url });
    }
    return { views, colors: perColor };
  }
  async function openPreview() {
    setBusy("Rendering mockups…");
    setError("");
    try {
      setPreview(await buildPreview());
      setPreviewPick({ kind: "view", index: 0 });
    } catch {
      setError("Couldn’t prepare the preview. Check each view’s photo.");
    } finally {
      setBusy(null);
    }
  }
  async function downloadPrint(s: Surface, region = regionsFor(s)[0]) {
    if (!region) return;
    capture();
    s = { ...s, area: region.bounds, printRegions: [region] };
    setBusy("Exporting print file…");
    const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
    try {
      for (const layer of s.layers.filter(l => !l.hidden)) { const object = await makeLayer(layer); object.clipPath = printClip(s, layer); canvas.add(object); }
      const a = s.area;
      const sp = spec(s);
      // Bound memory while preserving the requested physical aspect ratio.
      const targetWidth = sp?.width ?? Math.round(a.width * SIZE * 4);
      const targetHeight = sp?.height ?? Math.round(a.height * SIZE * 4);
      const cap = Math.min(1, 6000 / Math.max(targetWidth, targetHeight));
      const width = Math.max(1, Math.round(targetWidth * cap)), height = Math.max(1, Math.round(targetHeight * cap));
      const multiplier = Math.min(6000 / Math.max(a.width * SIZE, a.height * SIZE), Math.max(width / (a.width * SIZE), height / (a.height * SIZE)));
      const rendered = canvas.toCanvasElement(multiplier, { left: a.x * SIZE, top: a.y * SIZE, width: a.width * SIZE, height: a.height * SIZE });
      const output = document.createElement("canvas"); output.width = width; output.height = height;
      output.getContext("2d")!.drawImage(rendered, 0, 0, width, height);
      const link = document.createElement("a");
      link.download = `${name || blank.name}-${s.name}-${region.name}-print.png`;
      link.href = output.toDataURL("image/png");
      link.click();
    } catch {
      setError("Couldn’t export this print file. Try again.");
    } finally {
      await canvas.dispose();
      setBusy(null);
    }
  }
  async function save(asProduct: boolean) {
    setBusy(asProduct ? "Preparing your product…" : "Saving to My files…");
    setError("");
    try {
      const data = await buildPreview();
      const form = new FormData();
      form.set("name", name.trim() || blank.name);
      form.set("saveAsProduct", String(asProduct));
      form.set("blankProductId", blank.id);
      form.set("studioLayout", JSON.stringify(doc.current));
      for (let i = 0; i < data.views.length; i++) {
        const blob = await (await fetch(data.views[i].url)).blob();
        form.append(i === 0 ? "file" : "surfaceFiles", new File([blob], `${data.views[i].name}.png`, { type: "image/png" }));
      }
      for (const c of data.colors) {
        const blob = await (await fetch(c.url)).blob();
        form.append("colorFiles", new File([blob], `${c.color}.jpg`, { type: "image/jpeg" }));
      }
      dirty.current = false;
      const result = await saveCanvasCompositionAction(form);
      if (result?.error) throw new Error(result.error);
    } catch (e) {
      dirty.current = true;
      setError(e instanceof Error ? e.message : "Couldn’t save. Your design is still here.");
    } finally {
      setBusy(null);
    }
  }

  /* ---------- render ---------- */

  const current = surfaces.find((s) => s.id === surfaceId) ?? surfaces[0];
  const currentSpec = spec(current);
  const currentRegions = regionsFor(current);
  const hasDesign = surfaces.some((s) => s.layers.length) || layers.length > 0;
  const usedPositions = new Set(surfaces.map((s) => s.position ?? ""));
  const order = ["front", "back", "left_sleeve", "right_sleeve", "neck"];
  const addablePositions = specs
    .map((a) => a.position)
    .filter((p) => !usedPositions.has(p))
    .sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  const unit = currentSpec ? "in" : "%";
  const visibleLibrary = library.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()));
  const previewImage =
    preview && (previewPick.kind === "view" ? preview.views[previewPick.index]?.url : preview.colors[previewPick.index]?.url);

  return (
    <div className="pe">
      <header className="pe-top">
        <Link href="/partner/catalog" className="pe-icon-btn" aria-label="Back to catalog" title="Back to catalog">
          <ArrowLeft size={18} />
        </Link>
        <div className="pe-title">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={180} aria-label="Product name" />
          <span>{blank.catalogSource ? [blank.catalogSource.brand, blank.catalogSource.model].filter(Boolean).join(" ") : blank.name}</span>
        </div>
        <div className="pe-top-actions">
          <button className="pe-btn pe-btn-ghost pe-setup-button" disabled={locked} onClick={() => { capture(); setSetupOpen(true); }}><Crop size={16}/> Product setup</button>
          <button className="pe-icon-btn" onClick={() => void undo()} disabled={!undoCount || locked} aria-label="Undo" title="Undo (⌘Z)">
            <Undo2 size={17} />
          </button>
          <button className="pe-icon-btn" onClick={() => void redo()} disabled={!redoCount || locked} aria-label="Redo" title="Redo"><Redo2 size={17}/></button>
          <button className="pe-btn pe-btn-ghost" onClick={() => void save(false)} disabled={!hasDesign || locked}>
            Save to My files
          </button>
          <button className="pe-btn pe-btn-ghost" onClick={() => void openPreview()} disabled={!hasDesign || locked}>
            <Eye size={16} /> Preview
          </button>
          <button className="pe-btn pe-btn-primary" onClick={() => void save(true)} disabled={!hasDesign || locked}>
            Continue to pricing
          </button>
        </div>
      </header>

      <div className="pe-body">
        <nav className="pe-rail" aria-label="Design tools">
          {(
            [
              ["files", Upload, "Uploads"],
              ["text", Type, "Text"],
              ["shapes", Shapes, "Shapes"],
              ["ai", Sparkles, "Create"],
              ["inspiration", Lightbulb, "Ideas"],
              ["layers", Layers, "Layers"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              aria-pressed={panel === key}
              onClick={() => {
                setPanel(panel === key ? null : key);
                if (key === "inspiration") void loadInspiration();
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {panel && (
          <aside className="pe-panel">
            <div className="pe-panel-head">
              <h2>
                {{ files: "Uploads", text: "Text", shapes: "Shapes", ai: "Create with AI", inspiration: "Inspiration", layers: "Layers" }[panel]}
              </h2>
              <button className="pe-icon-btn" aria-label="Close panel" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>

            {panel === "files" && (
              <div className="pe-panel-body">
                <input
                  ref={uploadInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Upload artwork file"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button className="pe-drop" disabled={locked} onClick={() => uploadInput.current?.click()}>
                  <ImagePlus size={22} />
                  <strong>Upload artwork</strong>
                  <span>PNG with a transparent background prints best</span>
                </button>
                <input className="pe-search" placeholder="Search your files" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="pe-files">
                  {visibleLibrary.map((d) => (
                    <button key={d.id} title={d.name} disabled={locked || !d.previewUrl} onClick={() => void addArtwork(d.id)}>
                      {d.previewUrl ? <img src={d.previewUrl} alt="" loading="lazy" /> : <ImageIcon size={20} />}
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
                {!visibleLibrary.length && <p className="pe-muted">{search ? "No files match." : "Your uploads appear here."}</p>}
                {savedDesigns.length > 0 && (
                  <>
                    <p className="pe-label pe-mt">
                      Saved designs <span>open to keep editing</span>
                    </p>
                    <div className="pe-files">
                      {savedDesigns.map((d) => (
                        <Link key={d.id} href={`/partner/canvas?composition=${d.id}`} title={`Open ${d.name}`} className="pe-saved">
                          {d.previewUrl ? <img src={d.previewUrl} alt="" loading="lazy" /> : <FolderOpen size={20} />}
                          <span>{d.name}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {panel === "shapes" && (
              <div className="pe-panel-body">
                <div className="pe-shapes">
                  {SHAPES.map((sh) => (
                    <button key={sh.kind} disabled={locked} onClick={() => void addShape(sh.kind)} title={sh.label}>
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        {sh.kind === "rect" && <rect x="12" y="12" width="76" height="76" />}
                        {sh.kind === "rounded" && <rect x="12" y="12" width="76" height="76" rx="16" />}
                        {sh.kind === "circle" && <circle cx="50" cy="50" r="38" />}
                        {sh.kind === "triangle" && <polygon points="50,12 90,86 10,86" />}
                        {sh.kind === "star" && <polygon points="50,8 61,38 94,38 67,58 77,90 50,70 23,90 33,58 6,38 39,38" />}
                        {sh.kind === "heart" && <path d="M50 88C20 66 6 50 6 32 6 18 16 10 28 10c9 0 17 5 22 13 5-8 13-13 22-13 12 0 22 8 22 22 0 18-14 34-44 56z" />}
                        {sh.kind === "line" && <rect x="8" y="46" width="84" height="8" rx="4" />}
                      </svg>
                      <span>{sh.label}</span>
                    </button>
                  ))}
                </div>
                <p className="pe-muted pe-small">Select a shape to change its color, size and angle.</p>
              </div>
            )}

            {panel === "inspiration" && (
              <div className="pe-panel-body">
                <p className="pe-muted">Save photos, screenshots and ideas here. They’re never printed; use one as a starting point for AI.</p>
                <input ref={inspirationInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Add inspiration image" onChange={(e) => { void addInspirationPhoto(e.target.files?.[0]); e.target.value = ""; }} />
                <button className="pe-drop" disabled={locked} onClick={() => inspirationInput.current?.click()}>
                  <Lightbulb size={22} />
                  <strong>Add inspiration</strong>
                  <span>Photos, screenshots, sketches</span>
                </button>
                {inspiration === null ? (
                  <p className="pe-muted pe-small"><Loader2 size={13} className="pe-spin" /> Loading…</p>
                ) : (
                  <div className="pe-files">
                    {inspiration.map((it) => (
                      <button key={it.id} title={it.name} aria-pressed={reference?.id === it.id} onClick={() => { setReference(reference?.id === it.id ? null : it); }}>
                        <img src={it.previewUrl} alt="" loading="lazy" />
                        <span>{reference?.id === it.id ? "✓ Using for AI" : it.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {reference && (
                  <button className="pe-btn pe-btn-primary pe-block" onClick={() => setPanel("ai")}>
                    <Sparkles size={16} /> Create from this idea
                  </button>
                )}
              </div>
            )}

            {panel === "text" && (
              <div className="pe-panel-body">
                <button className="pe-text-preset pe-text-h" disabled={locked} onClick={() => void addText({ text: "Add a heading", size: 64, font: "anton", bold: false })}>
                  Add a heading
                </button>
                <button className="pe-text-preset pe-text-s" disabled={locked} onClick={() => void addText({ text: "Add a subheading", size: 40, font: "montserrat" })}>
                  Add a subheading
                </button>
                <button className="pe-text-preset pe-text-b" disabled={locked} onClick={() => void addText({ text: "Add body text", size: 28, font: "inter", bold: false })}>
                  Add body text
                </button>
                <p className="pe-label">Font styles</p>
                <div className="pe-fonts">
                  {PRODUCT_FONTS.map((f) => (
                    <button key={f.key} disabled={locked} style={{ fontFamily: f.family }} onClick={() => void addText({ text: f.label, size: 52, font: f.key, bold: f.bold })}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {panel === "ai" && (
              <div className="pe-panel-body">
                <div className="pe-seg" role="tablist" aria-label="What to create">
                  <button role="tab" aria-selected={aiMode === "design"} onClick={() => setAiMode("design")}>
                    <Sparkles size={14} /> Design
                  </button>
                  <button role="tab" aria-selected={aiMode === "pattern"} onClick={() => setAiMode("pattern")}>
                    <Grid3x3 size={14} /> Pattern
                  </button>
                </div>
                <p className="pe-muted">
                  {aiMode === "design"
                    ? "Describe the artwork. It’s added to your product and saved to your files."
                    : "Describe a repeating pattern. It fills the print area as a seamless all-over print."}
                </p>
                {reference && (
                  <div className="pe-ref">
                    <img src={reference.previewUrl} alt="" />
                    <span>Inspired by <b>{reference.name}</b></span>
                    <button className="pe-icon-btn" aria-label="Stop using this idea" onClick={() => setReference(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
                <textarea
                  className="pe-textarea"
                  rows={5}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={aiMode === "design" ? "e.g. hibiscus flowers and ocean waves, bold outline" : "e.g. tiny palm trees and waves, navy on cream"}
                />
                <button className="pe-btn pe-btn-primary pe-block" disabled={locked || brief.trim().length < 8} onClick={() => void createWithAi()}>
                  <Sparkles size={16} /> {aiMode === "design" ? "Create design" : "Create pattern"}
                </button>
                {!reference && (
                  <button className="pe-link-btn" onClick={() => { setPanel("inspiration"); void loadInspiration(); }}>
                    <Lightbulb size={14} /> Start from an inspiration photo
                  </button>
                )}
                <p className="pe-muted pe-small">Uses AI only when you click Create.</p>
              </div>
            )}

            {panel === "layers" && (
              <div className="pe-panel-body">
                {layers.length ? (
                  <ul className="pe-layers">
                    {[...layers].reverse().map((l) => (
                      <li key={l.id} className="pe-layer-row" data-hidden={l.hidden}>
                        <button disabled={l.locked || l.hidden} onClick={() => selectLayer(l.id)}>
                          {l.kind === "text" ? (
                            <Type size={16} />
                          ) : l.kind === "shape" ? (
                            <Shapes size={16} />
                          ) : urls.current[l.assetId] ? (
                            <img src={urls.current[l.assetId]} alt="" />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                          <span>
                            {l.kind === "text"
                              ? l.text
                              : l.kind === "shape"
                                ? `${l.shape[0].toUpperCase()}${l.shape.slice(1)}`
                                : `${library.find((d) => d.id === l.assetId)?.name ?? "Artwork"}${l.kind === "pattern" ? " (pattern)" : ""}`}
                          </span>
                        </button>
                        <button className="pe-icon-btn" aria-label={`${l.hidden ? "Show" : "Hide"} layer`} onClick={() => toggleLayer(l.id, "hidden")}>{l.hidden ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                        <button className="pe-icon-btn" aria-label={`${l.locked ? "Unlock" : "Lock"} layer`} onClick={() => toggleLayer(l.id, "locked")}>{l.locked ? <LockKeyhole size={14}/> : <UnlockKeyhole size={14}/>}</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pe-muted">Nothing on this view yet. Upload artwork or add text.</p>
                )}
              </div>
            )}
          </aside>
        )}

        <main className="pe-stage-wrap">
          <div className="pe-surface-bar"><span><strong>{current.name}</strong><small>{setupSaved ? "Product setup saved" : "Design workspace"}</small></span>
            {currentRegions.length > 0 ? <label>Print area <select aria-label="Active print area" value={activeRegionId ?? currentRegions[0]?.id} onChange={e => {
              const r = currentRegions.find(r => r.id === e.target.value)!;
              capture(); editor.current?.discardActiveObject(); surface().area = r.bounds; setActiveRegionId(r.id); setSurfaces([...doc.current.surfaces]); readSelection();
            }}>{currentRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label> : <button className="pe-btn pe-btn-primary" onClick={() => setSetupOpen(true)}>Add a print area</button>}
          </div>
          <div className="pe-stage" ref={stage} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={e => { e.preventDefault(); if (!locked) void upload(e.dataTransfer.files[0]); }}>
            <div className="pe-canvas" ref={host} />
            {ready && !layers.length && <div className="pe-start"><button onClick={() => setPanel("files")}><Upload size={15}/> Add artwork</button><button onClick={() => setPanel("text")}><Type size={15}/> Add text</button><span>or drop an image here</span></div>}
            {!ready && !error && (
              <div className="pe-loading">
                <Loader2 size={22} className="pe-spin" /> Loading product…
              </div>
            )}
            <div className="pe-zoom">
              <button onClick={() => setZoom((z) => Math.max(0.5, round(z - 0.25)))} aria-label="Zoom out">
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2.5, round(z + 0.25)))} aria-label="Zoom in">
                <Plus size={15} />
              </button>
              <button onClick={() => setZoom(1)} aria-label="Fit to screen">
                <Maximize size={14} />
              </button>
            </div>
            {outside && ready && <div className="pe-warn">Artwork outside the print areas is clipped in previews and print files.</div>}
          </div>

          <div className="pe-views" role="tablist" aria-label="Product views">
            {surfaces.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={surfaceId === s.id}
                disabled={locked}
                onClick={() => {
                  if (s.id === surfaceId) return;
                  capture();
                  setActiveRegionId(null);
                  s.area = regionsFor(s)[0]?.bounds ?? s.area;
                  void loadSurface(s.id);
                }}
              >
                {viewThumbs[s.id] || photoFor(s) ? <img src={viewThumbs[s.id] ?? photoFor(s)!} alt="" /> : <ImageIcon size={18} />}
                <span>
                  {s.name}
                  {s.layers.length ? <i aria-label="Has design" /> : null}
                </span>
              </button>
            ))}
            {surfaces.length < 12 && (
              <button
                className="pe-view-add"
                disabled={locked}
                onClick={() => { capture(); setSetupOpen(true); }}
              >
                <Plus size={18} />
                <span>Add surface</span>
              </button>
            )}
          </div>

          {mockups.length > 0 && (
            <div className="pe-mockups" aria-label="Live mockups">
              {mockups.map((m) => (
                <button key={m.color || "default"} title={m.color} aria-pressed={colorName === m.color} onClick={() => pickColor({ name: m.color, hex: m.hex })}>
                  <img src={m.url} alt={m.color ? `${m.color} mockup` : "Mockup"} />
                  {m.color && (
                    <span>
                      <b style={{ background: m.hex }} />
                      {m.color}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="pe-props" aria-label="Properties">
          {selected ? (
            <>
              <div className="pe-props-head">
                <h2>{{ text: "Text", image: "Artwork", shape: "Shape", pattern: "Pattern" }[selected.kind]}</h2>
                <div>
                  <button className="pe-icon-btn" onClick={() => void duplicate()} aria-label="Duplicate" title="Duplicate">
                    <Copy size={16} />
                  </button>
                  <button className="pe-icon-btn pe-danger" onClick={removeSelected} aria-label="Delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {current.printRegions && currentRegions.length > 0 && <section className="pe-section"><label className="ps-field">Print in<select className="pe-select" aria-label="Layer print area" value={selected.printRegionId ?? ""} onChange={e => changeSelected(o => {
                const layer = meta.current.get(o)!;
                meta.current.set(o, { ...layer, printRegionId: e.target.value || undefined });
              })}><option value="">All print areas</option>{currentRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></section>}
              {selected.kind === "text" && (
                <section className="pe-section">
                  <textarea
                    className="pe-textarea"
                    rows={2}
                    value={selected.text}
                    onChange={(e) => changeSelected((o) => (o as IText).set({ text: e.target.value }), false)}
                    onFocus={() => checkpoint()}
                    aria-label="Text"
                  />
                  <div className="pe-row">
                    <select value={selected.font} onChange={(e) => void setFont(e.target.value)} aria-label="Font" className="pe-select">
                      {PRODUCT_FONTS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="pe-toggle"
                      aria-pressed={selected.bold}
                      aria-label="Bold"
                      onClick={() => changeSelected((o) => (o as IText).set({ fontWeight: selected.bold ? "normal" : "bold" }))}
                    >
                      <Bold size={15} />
                    </button>
                  </div>
                  <div className="pe-swatches">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} aria-label={c} aria-pressed={selected.color?.toLowerCase() === c} style={{ background: c }} onClick={() => changeSelected((o) => (o as IText).set({ fill: c }))} />
                    ))}
                    <label className="pe-color-input" title="Custom color">
                      <input type="color" value={selected.color?.startsWith("#") ? selected.color : "#101828"} onChange={(e) => changeSelected((o) => (o as IText).set({ fill: e.target.value }), false)} />
                    </label>
                  </div>
                </section>
              )}

              {selected.kind === "image" && (
                <section className="pe-section">
                  <div className="pe-tools">
                    <button onClick={openCrop} disabled={locked}>
                      <Scissors size={16} /> Crop
                    </button>
                    <button onClick={() => void removeBg()} disabled={locked}>
                      <Eraser size={16} /> Remove background
                    </button>
                    <button onClick={() => void makePattern()} disabled={locked}>
                      <Grid3x3 size={16} /> Make a pattern
                    </button>
                  </div>
                  <p className="pe-label">Edit with AI</p>
                  <div className="pe-row">
                    <input
                      className="pe-search"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void aiEdit()}
                      placeholder="e.g. make it navy and gold"
                      aria-label="Describe the change"
                    />
                    <button className="pe-toggle" aria-label="Apply AI edit" disabled={locked || editPrompt.trim().length < 4} onClick={() => void aiEdit()}>
                      <WandSparkles size={15} />
                    </button>
                  </div>
                </section>
              )}

              {selected.kind === "shape" && (
                <section className="pe-section">
                  <p className="pe-label">Color</p>
                  <div className="pe-swatches">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} aria-label={c} aria-pressed={selected.fill?.toLowerCase() === c} style={{ background: c }} onClick={() => setFill(c)} />
                    ))}
                    <label className="pe-color-input" title="Custom color">
                      <input type="color" value={selected.fill ?? "#1f7048"} onChange={(e) => setFill(e.target.value, false)} />
                    </label>
                  </div>
                </section>
              )}

              {selected.kind === "pattern" && (
                <section className="pe-section">
                  <label className="pe-slider">
                    <span>Tile size <b>{Math.round((selected.tile ?? 0.2) * 100)}%</b></span>
                    <input type="range" min={0.06} max={0.8} step={0.01} value={selected.tile} onChange={(e) => void updatePattern({ tile: Number(e.target.value) })} />
                  </label>
                  <label className="pe-slider">
                    <span>Spacing <b>{Math.round((selected.gap ?? 0) * 100)}%</b></span>
                    <input type="range" min={0} max={0.7} step={0.01} value={selected.gap} onChange={(e) => void updatePattern({ gap: Number(e.target.value) })} />
                  </label>
                  <div className="pe-seg">
                    <button aria-selected={!selected.brick} onClick={() => void updatePattern({ brick: false })}>Grid</button>
                    <button aria-selected={Boolean(selected.brick)} onClick={() => void updatePattern({ brick: true })}>Brick</button>
                  </div>
                  <p className="pe-muted pe-small">The pattern fills the chosen print area. Preview shows the final cut shape.</p>
                </section>
              )}

              {selected.kind !== "pattern" && (
              <section className="pe-section">
                <p className="pe-label">Position & size ({unit})</p>
                <div className="pe-grid2">
                  {(
                    [
                      ["left", "X"],
                      ["top", "Y"],
                      ["width", "W"],
                      ["height", "H"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="pe-num">
                      <span>{label}</span>
                      <input type="number" step={unit === "in" ? 0.1 : 1} value={selected[k]} onChange={(e) => setGeometry(k, Number(e.target.value))} />
                    </label>
                  ))}
                  <label className="pe-num">
                    <span>↻</span>
                    <input type="number" step={1} value={selected.angle} onChange={(e) => setGeometry("angle", Number(e.target.value))} />
                  </label>
                  <button className="pe-btn pe-btn-ghost pe-small-btn" onClick={fitSelected} title="Fit to print area">
                    <Crop size={14} /> Fit
                  </button>
                </div>
                <p className="pe-label">Align to print area</p>
                <div className="pe-align">
                  {(
                    [
                      ["left", AlignStartVertical],
                      ["hcenter", AlignCenterVertical],
                      ["right", AlignEndVertical],
                      ["top", AlignStartHorizontal],
                      ["vcenter", AlignCenterHorizontal],
                      ["bottom", AlignEndHorizontal],
                    ] as const
                  ).map(([k, Icon]) => (
                    <button key={k} onClick={() => alignSelected(k)} aria-label={`Align ${k}`} title={`Align ${k}`}>
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="pe-row">
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => reorder("up")}>
                    <ArrowUp size={14} /> Forward
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => reorder("down")}>
                    <ArrowDown size={14} /> Backward
                  </button>
                </div>
                <div className="pe-row">
                  <button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={selected.flipX} onClick={() => flip("x")}>
                    <FlipHorizontal2 size={14} /> Flip
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={selected.flipY} onClick={() => flip("y")}>
                    <FlipVertical2 size={14} /> Flip
                  </button>
                </div>
              </section>
              )}

              <section className="pe-section">
                <label className="pe-slider">
                  <span>
                    <Blend size={14} /> Opacity <b>{Math.round(selected.opacity * 100)}%</b>
                  </span>
                  <input type="range" min={0.1} max={1} step={0.01} value={selected.opacity} onChange={(e) => setOpacity(Number(e.target.value))} onPointerDown={() => { checkpoint(); }} />
                </label>
              </section>

              {selected.dpi !== null && (
                <section className="pe-section">
                  <p className={`pe-quality ${selected.dpi >= 150 ? "ok" : selected.dpi >= 100 ? "warn" : "bad"}`}>
                    <b />
                    {selected.dpi >= 150 ? "Good print quality" : selected.dpi >= 100 ? "Okay print quality" : "Low resolution — may print blurry"}
                    <span>{selected.dpi} DPI</span>
                  </p>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="pe-props-head">
                <h2>Product</h2>
              </div>
              {colors.length > 0 && (
                <section className="pe-section">
                  <p className="pe-label">
                    Colors <span>{colorName}</span>
                  </p>
                  <div className="pe-color-swatches">
                    {colors.map((c) => (
                      <button key={c.name} title={c.name} aria-label={c.name} aria-pressed={colorName === c.name} style={{ background: c.hex }} disabled={locked} onClick={() => pickColor(c)} />
                    ))}
                  </div>
                </section>
              )}
              {sizes.length > 0 && (
                <section className="pe-section">
                  <p className="pe-label">Sizes</p>
                  <div className="pe-sizes">
                    {sizes.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <p className="pe-muted pe-small">Change colors, sizes and prices in the next step.</p>
                </section>
              )}
              <section className="pe-section">
                <p className="pe-label">{current.name} print area</p>
                {currentSpec ? (
                  <p className="pe-spec">
                    {round(currentSpec.width / DPI, 1)} × {round(currentSpec.height / DPI, 1)} in
                    <span>
                      {currentSpec.width} × {currentSpec.height} px at {DPI} DPI
                    </span>
                  </p>
                ) : (
                  <p className="pe-muted">Set optional production dimensions in Product setup.</p>
                )}
                <div className="pe-stack">
                  <button className="pe-btn pe-btn-ghost pe-block" disabled={locked} onClick={() => { capture(); setSetupOpen(true); }}>
                    <Crop size={15} /> Edit surfaces & print areas
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-block" disabled={locked} onClick={() => setViewPicker({ mode: "replace", position: current.position ?? "front" })}>
                    <ImageIcon size={15} /> Change photo
                  </button>
                  {current.layers.length > 0 && (
                    <button className="pe-btn pe-btn-ghost pe-block" disabled={locked} onClick={() => void downloadPrint(current, currentRegions.find(r => r.id === activeRegionId) ?? currentRegions[0])}>
                      <Download size={15} /> Download print file
                    </button>
                  )}
                </div>
              </section>
              <section className="pe-section">
                <p className="pe-muted pe-small">
                  Tip: select anything on the product to size, align or restyle it. Delete removes it, arrow keys nudge it.
                </p>
              </section>
            </>
          )}
        </aside>
      </div>

      {(busy || error) && (
        <div className={`pe-toast ${error ? "pe-toast-error" : ""}`} role={error ? "alert" : "status"}>
          {busy && !error && <Loader2 size={16} className="pe-spin" />}
          {error || busy}
          {error && (
            <button onClick={() => setError("")} aria-label="Dismiss">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {preview && (
        <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Preview">
          <div className="pe-modal-card pe-preview">
            <div className="pe-modal-head">
              <h2>Preview</h2>
              <button className="pe-icon-btn" onClick={() => setPreview(null)} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>
            <div className="pe-preview-body">
              <div className="pe-preview-main">{previewImage && <img src={previewImage} alt="Mockup" />}</div>
              <div className="pe-preview-side">
                <p className="pe-label">Views</p>
                <div className="pe-preview-thumbs">
                  {preview.views.map((v, i) => (
                    <button key={v.name} aria-pressed={previewPick.kind === "view" && previewPick.index === i} onClick={() => setPreviewPick({ kind: "view", index: i })}>
                      <img src={v.url} alt="" />
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
                {preview.colors.length > 1 && (
                  <>
                    <p className="pe-label">Colors</p>
                    <div className="pe-preview-thumbs">
                      {preview.colors.map((c, i) => (
                        <button key={c.color} aria-pressed={previewPick.kind === "color" && previewPick.index === i} onClick={() => setPreviewPick({ kind: "color", index: i })}>
                          <img src={c.url} alt="" />
                          <span>
                            <b style={{ background: c.hex }} />
                            {c.color}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="pe-label">Print files</p>
                <div className="pe-stack">
                  {surfaces.filter(s => s.layers.length).flatMap(s => regionsFor(s).map(r => (
                    <button key={`${s.id}-${r.id}`} className="pe-btn pe-btn-ghost pe-block" disabled={Boolean(busy)} onClick={() => void downloadPrint(s, r)}>
                      <Download size={15}/> {s.name} · {r.name}
                    </button>
                  )))}
                  <p className="pe-muted pe-small">Transparent PNGs, up to 6,000 px per side. Set dimensions in Product setup for 300 DPI output.</p>
                </div>
                <button className="pe-btn pe-btn-primary pe-block pe-mt" disabled={Boolean(busy)} onClick={() => void save(true)}>
                  Continue to pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {setupOpen && <ProductSetup surfaces={doc.current.surfaces.map(s => {
        if (s.printRegions !== undefined) return s;
        const sp = spec(s);
        return { ...s, printRegions: regionsFor(s).map(r => ({ ...r, dimensions: sp ? { width: sp.width / DPI, height: sp.height / DPI, unit: "in" as const } : undefined })) };
      })} initialId={currentId.current} photoFor={photoFor} onClose={() => setSetupOpen(false)} onSave={async (next, newUrls) => {
        const result = await saveBlankSurfacesAction(blank.id, next.map(({ layers: _layers, ...s }) => s));
        if (result.error) throw new Error(result.error);
        Object.assign(urls.current, newUrls);
        doc.current.surfaces = next;
        history.current = []; setUndoCount(0); future.current = []; setRedoCount(0);
        dirty.current = true; setSetupSaved(true); setActiveRegionId(null);
        setSurfaces([...next]);
        await loadSurface(next.some(s => s.id === currentId.current) ? currentId.current : next[0].id);
      }}/>}
      {cropping && (() => {
        const o = editor.current?.getActiveObject();
        const el = o instanceof FabricImage ? (o.getElement() as HTMLImageElement) : null;
        return el ? (
          <CropDialog
            src={cropping.src}
            natural={{ width: el.naturalWidth, height: el.naturalHeight }}
            onApply={(px) => applyCrop(px)}
            onReset={() => applyCrop(null)}
            onClose={() => setCropping(null)}
          />
        ) : null;
      })()}

      {viewPicker && (
        <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Choose a photo">
          <div className="pe-modal-card">
            <div className="pe-modal-head">
              <h2>{viewPicker.mode === "add" ? "Add a view" : `Change ${current.name} photo`}</h2>
              <button className="pe-icon-btn" onClick={() => setViewPicker(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {viewPicker.mode === "add" && (
              <div className="pe-positions">
                {(addablePositions.length ? addablePositions : ["back"]).map((p) => (
                  <button key={p} aria-pressed={viewPicker.position === p} onClick={() => setViewPicker({ ...viewPicker, position: p })}>
                    {POSITION_LABEL[p] ?? p}
                  </button>
                ))}
              </div>
            )}
            <p className="pe-muted">Pick a photo that shows this side flat and straight on.</p>
            {catalogPhotos.length > 0 && !Object.keys(photoScores).length && (
              <p className="pe-muted pe-small">
                <Loader2 size={13} className="pe-spin" /> Finding the best photos…
              </p>
            )}
            <div className="pe-photo-grid">
              {[...catalogPhotos]
                .sort((a, b) => (photoScores[b] ?? -9) - (photoScores[a] ?? -9))
                .map((src, i) => (
                  <button key={src} disabled={Boolean(busy)} onClick={() => void useViewPhoto({ imageUrl: src })}>
                    <img src={src} alt="" />
                    {i < 2 && (photoScores[src] ?? -1) > 0.3 && <span className="pe-photo-best">Recommended</span>}
                  </button>
                ))}
              <input
                ref={photoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label="Upload product photo"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void useViewPhoto({ file: f });
                }}
              />
              <button className="pe-photo-upload" disabled={Boolean(busy)} onClick={() => photoInput.current?.click()}>
                <Upload size={20} />
                <span>Upload your own photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
