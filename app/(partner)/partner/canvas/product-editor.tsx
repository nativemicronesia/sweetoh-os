"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Canvas,
  ActiveSelection,
  StaticCanvas,
  FabricImage,
  FabricObject,
  Ellipse,
  Circle,
  Group,
  IText,
  PencilBrush,
  Point,
  Rect,
  Path,
  Pattern as FabricPattern,
  Shadow,
  filters,
  Gradient,
} from "fabric";
import { initAligningGuidelines } from "fabric/extensions";
import { drawingDashPattern, STUDIO_DRAW_BRUSHES, STUDIO_DRAW_TEXTURES, studioBrushPresetSchema, studioBrushTextureCanvas, studioDrawBrush, type StudioBrushPreset, type StudioDrawBrush } from "@/lib/studio/drawing-brushes";
import { compactPressureSamples, normalizePressureSamples, pointerPressure, pressureSegment, pressureSegments, type LocalPressureSample, type PressureSample } from "@/lib/studio/drawing-pressure";
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
  PenLine,
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
  Hand,
  Library,
  Upload,
  X,
} from "lucide-react";
import {
  uploadCanvasArtworkAction,
  generateArtworkAction,
  uploadSurfaceAction,
} from "../actions/builder";
import { resolveStudioCreativeAssetAction } from "../actions/library";
import {
  saveCanvasCompositionAction,
  saveBlankSurfacesAction,
} from "../actions/library";
import {
  defaultArea,
  regionsFor,
  studioLayoutSchema,
  type StudioLayout,
  type StudioLayer,
  type StudioSurface,
  productionSurfacePhoto,
} from "@/lib/domains/catalog/studio-layout";
import type { CatalogSource, VariantOptions } from "@/lib/domains/catalog/variants";
import { analyzePhoto, tintGarment } from "@/lib/studio/tint";
import { sizedPhoto } from "@/lib/studio/photo";
import { PRODUCT_FONTS, ensureFont, fontFamily } from "@/lib/studio/fonts";
import { studioAsset, studioAssetUrl } from "@/lib/studio/asset-library";
import { buildStudioEditorState, studioEditorCommandSchema, studioEditorProposalSchema, type StudioEditorCommand } from "@/lib/studio/editor-commands";
import { reorderLayers } from "@/lib/studio/layer-order";
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
import { AssetLibraryPanel } from "./asset-library-panel";
import type { StudioCreativeAssetOption } from "@/lib/studio/creative-library-browser";

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
/** What the creator-side "Sell it" panel can ask the editor for. */
export type PrintFile = { surfaceId: string; surfaceName: string; position: string; region: string; blob: Blob; width: number; height: number };
export type EditorPublishApi = {
  name: string;
  blank: CanvasBlankOption;
  colors: { name: string; hex: string }[];
  sizes: string[];
  /** One transparent print file per decorated view (its first print area). */
  printFiles: () => Promise<PrintFile[]>;
  /** Front mockup, per-color mockups and every view as PNG blobs. */
  mockups: () => Promise<{ front: Blob; colors: { color: string; blob: Blob }[] }>;
  setBusy: (message: string | null) => void;
  close: () => void;
};
type Props = {
  /** "creator" = Create with Sweet'Oh: save + sell panel instead of shop pricing. */
  mode?: "partner" | "creator";
  /** Name of a reopened saved design. */
  initialName?: string | null;
  PublishPanel?: React.ComponentType<{ api: EditorPublishApi }>;
  blanks: CanvasBlankOption[];
  designs: CanvasDesignOption[];
  initialDesignId: string | null;
  initialBlankId?: string | null;
  initialTransform?: LegacyTransform | null;
  initialStudio?: StudioLayout | null;
  surfaceImages?: Record<string, string>;
  savedDesigns?: SavedDesignOption[];
  creativeAssets?: StudioCreativeAssetOption[];
};
type Selected =
  | null
  | {
      kind: "image" | "text" | "shape" | "pattern" | "graphic" | "drawing";
      name: string;
      opacity: number;
      flipX: boolean;
      flipY: boolean;
      assetId?: string;
      printRegionId?: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      brush?: StudioDrawBrush;
      brushPreset?: StudioBrushPreset;
      gradient?: { from: string; to: string; direction: "horizontal" | "vertical" | "diagonal" };
      adjustments?: { brightness?: number; contrast?: number; saturation?: number; blur?: number };
      mask?: "circle" | "rounded";
      shadow?: { color: string; opacity: number; blur: number; offsetX: number; offsetY: number };
      letterSpacing?: number;
      outline?: string;
      outlineWidth?: number;
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
type Panel = "files" | "text" | "shapes" | "assets" | "ai" | "inspiration" | "layers" | null;
type InspirationItem = { id: string; name: string; previewUrl: string };
type Mockup = { color: string; hex: string; url: string };
type PreviewData = { views: { name: string; url: string; hasProductionBlank: boolean }[]; colors: Mockup[] };

/** Extend Fabric's PencilBrush input lifecycle and keep the completed drawing
 * represented as one selectable Fabric Group inside the existing drawing layer. */
class StudioPressurePencilBrush extends PencilBrush {
  kind: StudioDrawBrush;
  preset: StudioBrushPreset | null;
  samples: PressureSample[] = [];
  lastPathData = "";
  lastPressurePoints: LocalPressureSample[] = [];
  lastOrigin = { x: 0, y: 0 };

  constructor(canvas: Canvas, kind: StudioDrawBrush, preset: StudioBrushPreset | null = null) { super(canvas); this.kind = kind; this.preset = preset; }
  override needsFullRender() { return true; }

  private recordPressure(pointer: Point, event: Parameters<PencilBrush["onMouseMove"]>[1]) {
    this.samples.push({ x: pointer.x, y: pointer.y, pressure: pointerPressure(event.e as PointerEvent) });
    if (this.samples.length > 480) this.samples = compactPressureSamples(this.samples, 240);
  }
  override onMouseDown(pointer: Point, event: Parameters<PencilBrush["onMouseDown"]>[1]) {
    this.samples = []; this.recordPressure(pointer, event); super.onMouseDown(pointer, event);
  }
  override onMouseMove(pointer: Point, event: Parameters<PencilBrush["onMouseMove"]>[1]) {
    this.recordPressure(pointer, event); super.onMouseMove(pointer, event);
  }

  override _render(ctx: CanvasRenderingContext2D = this.canvas.contextTop) {
    if (!this.samples.length) return super._render(ctx);
    const normalized = normalizePressureSamples(this.samples);
    this._saveAndTransform(ctx); ctx.lineCap = this.strokeLineCap; ctx.lineJoin = this.strokeLineJoin;
    ctx.strokeStyle = this.preset ? ctx.createPattern(studioBrushTextureCanvas(this.preset.textureId, this.preset.textureScale, this.color), "repeat") ?? this.color : this.color; ctx.setLineDash([]);
    if (normalized.points.length === 1) {
      const point = normalized.points[0]; const size = pressureSegment(point, point, this.width, this.kind, this.preset ?? undefined);
      ctx.globalAlpha = size.opacity; ctx.beginPath(); ctx.arc(this.samples[0].x, this.samples[0].y, size.width / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    } else {
      const segments = pressureSegments(normalized.points, this.width, this.kind, this.preset ?? undefined);
      for (let index = 0; index < segments.length; index++) {
        const originalIndex = Math.round((segments[index].startIndex ?? 0) * (this.samples.length - 1) / Math.max(1, normalized.points.length - 1));
        const a = this.samples[originalIndex];
        const b = this.samples[Math.min(this.samples.length - 1, originalIndex + Math.ceil((this.samples.length - 1) / Math.max(1, normalized.points.length - 1)))];
        ctx.globalAlpha = segments[index].opacity; ctx.lineWidth = segments[index].width;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.restore();
  }

  override _finalizeAndAddPath() {
    if (this.decimate) this._points = this.decimatePoints(this._points, this.decimate);
    const normalized = normalizePressureSamples(compactPressureSamples(this.samples));
    this.lastOrigin = { x: normalized.x, y: normalized.y };
    this.lastPressurePoints = normalized.points;
    const pathPoints = this._points.length > 300 ? Array.from({ length: 300 }, (_, index) => this._points[Math.round(index * (this._points.length - 1) / 299)]) : this._points;
    this.lastPathData = this.convertPointsToSVGPath(pathPoints).map((segment) => segment.map((part) => typeof part === "number" ? part.toFixed(2) : part).join(" ")).join(" ");
    const group = makePressureDrawingGroup(normalized.points, this.width, this.color, this.kind, this.preset);
    this.canvas.clearContext(this.canvas.contextTop);
    this.canvas.fire("before:path:created", { path: group as unknown as Path });
    this.canvas.add(group); this.canvas.requestRenderAll(); group.setCoords();
    this.canvas.fire("path:created", { path: group as unknown as Path });
    this._reset(); this.samples = [];
  }
}

function brushPaint(color: string, preset: StudioBrushPreset | null) {
  return preset ? new FabricPattern({ source: studioBrushTextureCanvas(preset.textureId, preset.textureScale, color), repeat: "repeat" }) : color;
}

function makePressureDrawingGroup(points: LocalPressureSample[], width: number, color: string, kind: StudioDrawBrush, preset: StudioBrushPreset | null = null) {
  const paint = brushPaint(color, preset);
  const children: FabricObject[] = pressureSegments(points, width, kind, preset ?? undefined).map((segment) => new Path(segment.pathData, {
    fill: "", stroke: paint, strokeWidth: segment.width, opacity: segment.opacity,
    strokeLineCap: kind === "marker" ? "butt" : "round", strokeLineJoin: "round", objectCaching: false,
  }));
  if (!children.length && points[0]) {
    const point = points[0]; const size = pressureSegment(point, point, width, kind, preset ?? undefined);
    children.push(new Circle({ left: point.x - size.width / 2, top: point.y - size.width / 2, radius: size.width / 2, fill: paint, opacity: size.opacity, objectCaching: false }));
  }
  return new Group(children, { left: 0, top: 0, originX: "left", originY: "top", objectCaching: false });
}

const SIZE = 720;
const DPI = 300;
const BRUSH_PRESETS_KEY = "sweetoh:studio:brush-presets:v1";
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
  creativeAssets = [],
  mode = "partner",
  initialName = null,
  PublishPanel,
}: Props) {
  const base = mode === "creator" ? { catalog: "/studio/catalog", canvas: "/studio/design" } : { catalog: "/partner/catalog", canvas: "/partner/canvas" };
  const [publishOpen, setPublishOpen] = useState(false);
  /** Local autosave, so a closed tab or a crash never costs someone their work. */
  const draftKey = `sweetoh:draft:${initialBlankId ?? blanks[0]?.id ?? "new"}:${initialStudio ? "open" : "fresh"}`;
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recovered, setRecovered] = useState<{ at: number; layers: number } | null>(null);
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
    initialStudio ? {
      ...initialStudio,
      surfaces: initialStudio.surfaces.map(surface => {
        const productSurface = blank?.printArea?.surfaces?.find(candidate => candidate.id === surface.id);
        const sameProductionImage = productSurface?.assetId && productSurface.assetId === surface.assetId;
        const sameReferenceImage = productSurface?.imageUrl && productSurface.imageUrl === surface.imageUrl;
        return {
          ...surface,
          imageRole: surface.imageRole ?? (sameProductionImage || sameReferenceImage ? productSurface?.imageRole : undefined) ?? "unverified",
        };
      }),
    } : {
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
  const drawingCheckpoint = useRef(false);
  const erasingCheckpoint = useRef(false);
  const eraseMode = useRef(false);
  const eraseGesture = useRef(false);
  const priorTargetTolerance = useRef(0);

  const [library, setLibrary] = useState(designs);
  const [colorName, setColorName] = useState<string | null>(colors[0]?.name ?? null);
  const [panel, setPanel] = useState<Panel>(null);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [drawColor, setDrawColor] = useState("#173e39");
  const [drawWidth, setDrawWidth] = useState(7);
  const [drawOpacity, setDrawOpacity] = useState(1);
  const [drawBrush, setDrawBrush] = useState<StudioDrawBrush>("pencil");
  const [brushPresets, setBrushPresets] = useState<StudioBrushPreset[]>([]);
  const [activeBrushPreset, setActiveBrushPreset] = useState<StudioBrushPreset | null>(null);
  const [brushPresetName, setBrushPresetName] = useState("My textured brush");
  const [brushTextureId, setBrushTextureId] = useState<StudioBrushPreset["textureId"]>("sweetoh-grain");
  const [brushTextureScale, setBrushTextureScale] = useState(1);
  const [brushPressureMode, setBrushPressureMode] = useState<StudioBrushPreset["pressureMode"]>("size-opacity");
  const gesture = useRef<{ pointers: Map<number, { x: number; y: number }>; distance: number; zoom: number; lastX: number; lastY: number }>({ pointers: new Map(), distance: 0, zoom: 1, lastX: 0, lastY: 0 });
  const [ready, setReadyState] = useState(false);
  // Artwork uploaded while a view is still loading waits for it instead of being dropped.
  const readyRef = useRef(false);
  const readyWaiters = useRef<(() => void)[]>([]);
  const setReady = (value: boolean) => {
    readyRef.current = value;
    setReadyState(value);
    if (value) for (const resolve of readyWaiters.current.splice(0)) resolve();
  };
  const whenReady = () => (readyRef.current ? Promise.resolve() : new Promise<void>((resolve) => readyWaiters.current.push(resolve)));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState(initialName || blank?.name || "My product");
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [selected, setSelected] = useState<Selected>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [alignRelativeTo, setAlignRelativeTo] = useState<"selection" | "canvas">("selection");
  const revision = useRef(0);
  const batching = useRef(false);
  const [editorAsk, setEditorAsk] = useState("");
  const [editorProposal, setEditorProposal] = useState<{ summary: string; actions: { targetLayerIds: string[]; command: StudioEditorCommand }[]; revision: number } | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRUSH_PRESETS_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(stored)) setBrushPresets(stored.flatMap((item) => { const parsed = studioBrushPresetSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }));
    } catch { /* Local brush presets are optional convenience data. */ }
  }, []);

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
    const activeIds = canvas.getActiveObjects().map((object) => meta.current.get(object)?.id).filter((id): id is string => Boolean(id));
    const restoreMulti = activeIds.length > 1;
    if (restoreMulti) canvas.discardActiveObject();
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
                letterSpacing: o.charSpacing,
                outline: typeof o.stroke === "string" ? o.stroke : undefined,
                outlineWidth: o.strokeWidth || undefined,
              }
            : {}),
          ...(base.kind === "shape" ? { ...(typeof o.fill === "string" ? { fill: o.fill } : {}), stroke: typeof o.stroke === "string" ? o.stroke : undefined, strokeWidth: o.strokeWidth || undefined } : {}),
        } as StudioLayer;
      });
    if (restoreMulti) {
      const objects = canvas.getObjects().filter((object) => activeIds.includes(meta.current.get(object)?.id ?? ""));
      if (objects.length > 1) canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
    }
    revision.current++;
    setLayers([...s.layers]);
    checkOutside();
    scheduleMockups();
  }
  function checkpoint() {
    if (batching.current) return;
    capture();
    future.current = []; setRedoCount(0);
    history.current = [...history.current.slice(-39), structuredClone(doc.current)];
    setUndoCount(history.current.length);
    dirty.current = true;
    revision.current++;
    saveDraft();
  }

  /** Debounced local snapshot of the whole document. */
  function saveDraft() {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        const doc_ = doc.current;
        if (!doc_.surfaces.some((s) => s.layers.length)) return;
        localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), name, studio: doc_ }));
      } catch {
        // Private mode or a full disk: autosave is a safety net, never a blocker.
      }
    }, 1200);
  }
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
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
    const canvas = editor.current;
    const selectedObjects = canvas?.getActiveObjects().filter((object) => meta.current.has(object)) ?? [];
    setSelectedLayerIds(selectedObjects.map((object) => meta.current.get(object)!.id));
    if (selectedObjects.length > 1) { setSelected(null); return; }
    const o = selectedObjects[0] ?? canvas?.getActiveObject();
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
      name: text ? (o as IText).text.slice(0, 40) : base.kind === "graphic" ? (studioAsset(base.assetKey)?.name ?? "Graphic") : (library.find((d) => d.id === assetId)?.name ?? (base.kind === "shape" ? "Shape" : "Artwork")),
      opacity: o.opacity,
      flipX: o.flipX,
      flipY: o.flipY,
      assetId,
      printRegionId: base.printRegionId,
      fill: base.kind === "shape" && typeof o.fill === "string" ? o.fill : undefined,
      stroke: base.kind === "shape" && typeof o.stroke === "string" ? o.stroke : undefined,
      strokeWidth: base.kind === "drawing" ? base.strokeWidth : base.kind === "shape" ? o.strokeWidth : undefined,
      ...(base.kind === "drawing" ? { stroke: base.stroke } : base.kind === "shape" && typeof o.stroke === "string" ? { stroke: o.stroke } : {}),
      ...(base.kind === "drawing" ? { brush: studioDrawBrush(base.brushPreset?.baseBrush ?? base.brush), brushPreset: base.brushPreset } : {}),
      gradient: base.kind === "shape" ? base.gradient : undefined,
      adjustments: base.kind === "image" ? base.adjustments : undefined,
      mask: base.kind === "image" ? base.mask : undefined,
      shadow: base.shadow,
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
            letterSpacing: (o as IText).charSpacing,
            outline: typeof (o as IText).stroke === "string" ? String((o as IText).stroke) : undefined,
            outlineWidth: (o as IText).strokeWidth,
          }
        : {}),
    });
  }

  async function makeLayer(layer: StudioLayer) {
    let obj: FabricObject;
    if (layer.kind === "image") {
      obj = await FabricImage.fromURL(urls.current[layer.assetId], { crossOrigin: "anonymous" });
      if (layer.crop) obj.set({ cropX: layer.crop.x, cropY: layer.crop.y, width: layer.crop.width, height: layer.crop.height });
      const a = layer.adjustments ?? {};
      const image = obj as FabricImage;
      image.filters = [
        ...(a.brightness ? [new filters.Brightness({ brightness: a.brightness })] : []),
        ...(a.contrast ? [new filters.Contrast({ contrast: a.contrast })] : []),
        ...(a.saturation ? [new filters.Saturation({ saturation: a.saturation })] : []),
        ...(a.blur ? [new filters.Blur({ blur: a.blur })] : []),
      ];
      if (image.filters.length) image.applyFilters();
    } else if (layer.kind === "graphic") {
      const asset = studioAsset(layer.assetKey);
      if (!asset) throw new Error(`Studio graphic is unavailable: ${layer.assetKey}`);
      obj = await FabricImage.fromURL(studioAssetUrl(asset));
    } else if (layer.kind === "drawing") {
      const brush = studioDrawBrush(layer.brushPreset?.baseBrush ?? layer.brush);
      obj = layer.pressurePoints?.length ? makePressureDrawingGroup(layer.pressurePoints, layer.strokeWidth, layer.stroke, brush, layer.brushPreset ?? null) : new Path(layer.pathData, { fill: "", stroke: layer.stroke, strokeWidth: layer.strokeWidth, strokeDashArray: drawingDashPattern(brush, layer.strokeWidth), strokeLineCap: brush === "marker" ? "butt" : "round", strokeLineJoin: "round", objectCaching: false });
    } else if (layer.kind === "shape") {
      obj = makeShape(layer.shape, layer.width, layer.height, layer.fill, layer.stroke, layer.strokeWidth);
      if (layer.gradient) {
        const end = layer.gradient.direction === "horizontal" ? { x: layer.width, y: 0 } : layer.gradient.direction === "vertical" ? { x: 0, y: layer.height } : { x: layer.width, y: layer.height };
        obj.set({ fill: new Gradient({ type: "linear", gradientUnits: "pixels", coords: { x1: 0, y1: 0, x2: end.x, y2: end.y }, colorStops: [{ offset: 0, color: layer.gradient.from }, { offset: 1, color: layer.gradient.to }] }) });
      }
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
        charSpacing: layer.letterSpacing ?? 0,
        stroke: layer.outline ?? null,
        strokeWidth: layer.outlineWidth ?? 0,
      });
    }
    if (layer.kind === "image" && layer.mask === "circle") {
      obj.clipPath = new Ellipse({ rx: obj.width / 2, ry: obj.height / 2, originX: "center", originY: "center" });
    } else if (layer.kind === "image" && layer.mask === "rounded") {
      obj.clipPath = new Rect({ width: obj.width, height: obj.height, rx: Math.min(obj.width, obj.height) * 0.16, ry: Math.min(obj.width, obj.height) * 0.16, originX: "center", originY: "center" });
    }
    if (layer.shadow) {
      const { color, opacity, ...shadow } = layer.shadow;
      const rgb = color.match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
      obj.shadow = new Shadow({ ...shadow, color: `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity})` });
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
    const photo = productionSurfacePhoto(s, urls.current);
    return photo ? sizedPhoto(photo) : null;
  }
  /** Reference photos remain available in the view picker without becoming canvas surfaces. */
  function referencePhotoFor(s: Surface) {
    return (s.imageRole === "production_blank" && s.assetId ? urls.current[s.assetId] : null)
      ?? (s.referenceAssetId ? urls.current[s.referenceAssetId] : null)
      ?? (s.imageRole !== "production_blank" && s.assetId ? urls.current[s.assetId] : null)
      ?? s.imageUrl
      ?? null;
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
    canvas.backgroundColor = "#ffffff";
    const original = photoFor(s);
    if (original) {
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
    }
    for (const layer of s.layers) {
      const object = await makeLayer(layer);
      object.set({ visible: !layer.hidden, selectable: !layer.locked, evented: !layer.locked });
      if (withGuide && canvas !== editor.current) return;
      if (!withGuide || layer.kind === "drawing") {
        const regionClip = printClip(s, layer);
        if (object.clipPath) object.clipPath.clipPath = regionClip;
        else object.clipPath = regionClip;
      }
      canvas.add(object);
    }
    if (withGuide || !original) {
      const a = s.area;
      const rect = new Rect({
        left: a.x * SIZE,
        top: a.y * SIZE,
        width: a.width * SIZE,
        height: a.height * SIZE,
        fill: original ? "rgba(31,112,72,0.04)" : "rgba(31,112,72,0.08)",
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
    if (editor.current?.isDrawingMode) setFreehand(false);
    if (eraseMode.current) setEraseMode(false);
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
    if (!photoFor(s)) {
      setMockups([]);
      return;
    }
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
      selection: true,
    });
    editor.current = canvas;
    canvas.on("selection:created", readSelection);
    canvas.on("selection:updated", readSelection);
    canvas.on("selection:cleared", readSelection);
    canvas.on("mouse:down", ({ scenePoint, viewportPoint }) => {
      if (eraseMode.current) { erasingCheckpoint.current = false; eraseGesture.current = true; eraseDrawingAt(scenePoint.x, scenePoint.y, viewportPoint.x, viewportPoint.y); return; }
      if (canvas.isDrawingMode && !drawingCheckpoint.current) { checkpoint(); drawingCheckpoint.current = true; }
    });
    canvas.on("mouse:move", ({ scenePoint, viewportPoint }) => {
      if (eraseMode.current && eraseGesture.current) eraseDrawingAt(scenePoint.x, scenePoint.y, viewportPoint.x, viewportPoint.y);
    });
    canvas.on("mouse:up", () => { erasingCheckpoint.current = false; eraseGesture.current = false; drawingCheckpoint.current = false; });
    canvas.on("path:created", ({ path }) => {
      const pressureBrush = canvas.freeDrawingBrush instanceof StudioPressurePencilBrush ? canvas.freeDrawingBrush : null;
      const fabricPath = path as Path;
      const segments = fabricPath.path?.length > 400 ? Array.from({ length: 400 }, (_, index) => fabricPath.path[Math.round(index * (fabricPath.path.length - 1) / 399)]) : fabricPath.path ?? [];
      const pathData = pressureBrush?.lastPathData || segments.map((segment) => segment.map((part) => typeof part === "number" ? part.toFixed(2) : part).join(" ")).join(" ");
      const stroke = typeof pressureBrush?.color === "string" ? pressureBrush.color : typeof path.stroke === "string" && /^#[0-9a-f]{6}$/i.test(path.stroke) ? path.stroke : "#173e39";
      const brush = pressureBrush?.kind ?? drawBrush;
      path.set({ opacity: drawOpacity, left: pressureBrush?.lastOrigin.x ?? path.left, top: pressureBrush?.lastOrigin.y ?? path.top, strokeDashArray: drawingDashPattern(brush, Number(path.strokeWidth) || drawWidth), strokeLineCap: brush === "marker" ? "butt" : "round" });
      const layer: StudioLayer = { id: crypto.randomUUID(), kind: "drawing", pathData, stroke, strokeWidth: Math.max(1, Math.min(50, Number(path.strokeWidth) || drawWidth)), brush, brushPreset: pressureBrush?.preset ?? undefined, pressurePoints: pressureBrush?.lastPressurePoints, opacity: drawOpacity < 1 ? drawOpacity : undefined, x: pressureBrush?.lastOrigin.x ?? path.left ?? 0, y: pressureBrush?.lastOrigin.y ?? path.top ?? 0, scaleX: path.scaleX ?? 1, scaleY: path.scaleY ?? 1, angle: path.angle ?? 0, printRegionId: activeRegionRef.current ?? undefined };
      meta.current.set(path, layer); drawingCheckpoint.current = false;
      path.clipPath = printClip(surface(), layer);
      capture(); readSelection(); dirty.current = true; canvas.requestRenderAll();
    });
    canvas.on("before:transform", () => {
      if (canvas.getActiveObjects().length > 1) {
        future.current = []; setRedoCount(0);
        history.current = [...history.current.slice(-39), structuredClone(doc.current)];
        setUndoCount(history.current.length); dirty.current = true;
      } else checkpoint();
    });
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
    try {
      const raw = localStorage.getItem(draftKey);
      const draft = raw ? (JSON.parse(raw) as { at: number; studio: StudioLayout }) : null;
      const layers = draft?.studio?.surfaces?.reduce((n, s) => n + (s.layers?.length ?? 0), 0) ?? 0;
      // Only offer it when this editor opened without that work already in it.
      if (draft && layers > 0 && !doc.current.surfaces.some((s) => s.layers.length)) setRecovered({ at: draft.at, layers });
    } catch {
      /* ignore */
    }
    // Canva-style snapping: Fabric's own aligning-guidelines extension.
    const stopGuidelines = initAligningGuidelines(canvas, { color: INK, width: 1, margin: 4 });
    return () => {
      disposed = true;
      if (editor.current === canvas) editor.current = null;
      window.removeEventListener("beforeunload", leave);
      if (mockTimer.current) clearTimeout(mockTimer.current);
      stopGuidelines();
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

  useEffect(() => {
    if (!editor.current) return;
    editor.current.skipTargetFind = panMode || drawing || erasing;
    editor.current.selection = !panMode && !drawing && !erasing;
    if (panMode) editor.current.discardActiveObject();
    editor.current.requestRenderAll();
  }, [panMode, drawing, erasing]);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); void redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); void duplicate(); return; }
      if (e.key === "Escape") { editor.current?.discardActiveObject(); editor.current?.requestRenderAll(); readSelection(); return; }
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
    await whenReady();
    if (!canDesign()) return;
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
  async function addCreativeLibraryAsset(id: string) {
    try {
      const resolved = await resolveStudioCreativeAssetAction(id);
      if (resolved.error || !resolved.previewUrl) {
        setError(resolved.error ?? "That library asset is not available for Studio use.");
        return;
      }
      urls.current[resolved.assetId] = resolved.previewUrl;
      await addArtwork(resolved.assetId);
    } catch {
      setError("That library asset is no longer available for Studio use.");
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
    const targets = editor.current?.getActiveObjects().filter((object) => meta.current.has(object)) ?? [];
    if (!targets.length) return;
    if (record) checkpoint();
    for (const object of targets) { change(object); object.setCoords(); }
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
    const canvas = editor.current;
    const targets = canvas?.getActiveObjects().filter((object) => meta.current.has(object));
    if (!canvas || !targets?.length) return;
    checkpoint();
    const sources = targets.map((object) => meta.current.get(object)!).map((layer) => surface().layers.find((candidate) => candidate.id === layer.id)!).filter(Boolean);
    const newGroup = sources.length > 1 && sources[0].groupId ? crypto.randomUUID() : undefined;
    const copies: FabricObject[] = [];
    for (const source of sources) {
      const base = { ...source }; delete base.groupId;
      const copy = await makeLayer({ ...base, id: crypto.randomUUID(), x: source.x + 16, y: source.y + 16, ...(newGroup ? { groupId: newGroup } : {}) } as StudioLayer);
      canvas.add(copy); copies.push(copy);
    }
    bringGuideToTop();
    if (copies.length === 1) canvas.setActiveObject(copies[0]);
    else canvas.setActiveObject(new ActiveSelection(copies, { canvas }));
    capture();
    readSelection();
    canvas.requestRenderAll();
  }
  /* ---------- Canva-style tools ---------- */

  function setFreehand(enabled: boolean) {
    const canvas = editor.current;
    if (!canvas) return;
    canvas.setTargetFindTolerance(priorTargetTolerance.current); eraseGesture.current = false; erasingCheckpoint.current = false;
    eraseMode.current = false; setErasing(false);
    canvas.isDrawingMode = enabled; canvas.selection = !enabled && !panMode; canvas.skipTargetFind = enabled || panMode;
    if (enabled) applyFreehandBrush(canvas, drawBrush, drawColor, drawWidth);
    setDrawing(enabled); canvas.requestRenderAll();
  }
  function setEraseMode(enabled: boolean) {
    const canvas = editor.current;
    if (!canvas) return;
    eraseMode.current = enabled; setErasing(enabled);
    eraseGesture.current = false; erasingCheckpoint.current = false;
    if (enabled) { priorTargetTolerance.current = canvas.targetFindTolerance; canvas.setTargetFindTolerance(5); }
    else canvas.setTargetFindTolerance(priorTargetTolerance.current);
    if (enabled) { canvas.isDrawingMode = false; setDrawing(false); drawingCheckpoint.current = false; canvas.selection = false; canvas.skipTargetFind = true; }
    else { canvas.selection = !panMode; canvas.skipTargetFind = panMode; }
    canvas.requestRenderAll();
  }
  function eraseDrawingAt(x: number, y: number, viewportX: number, viewportY: number) {
    const canvas = editor.current;
    if (!canvas) return;
    const object = [...canvas.getObjects()].reverse().find((candidate) => meta.current.get(candidate)?.kind === "drawing" && candidate.containsPoint(new Point(x, y)) && !canvas.isTargetTransparent(candidate, viewportX, viewportY));
    if (!object) return;
    if (!erasingCheckpoint.current) { checkpoint(); erasingCheckpoint.current = true; }
    if (canvas.getActiveObjects().includes(object)) canvas.discardActiveObject();
    canvas.remove(object); capture(); readSelection(); dirty.current = true; canvas.requestRenderAll();
  }
  function applyFreehandBrush(canvas: Canvas, kind: StudioDrawBrush, color: string, width: number, preset = activeBrushPreset) {
    const brush = new StudioPressurePencilBrush(canvas, kind, preset);
    brush.color = color;
    brush.width = width;
    brush.strokeDashArray = drawingDashPattern(kind, width) ?? null;
    brush.strokeLineCap = kind === "marker" ? "butt" : "round";
    brush.limitedToCanvasSize = true;
    canvas.freeDrawingBrush = brush;
  }
  function updateFreehand(color: string, width: number, opacity = drawOpacity, kind = drawBrush, preset: StudioBrushPreset | null = activeBrushPreset) {
    setDrawColor(color); setDrawWidth(width); setDrawOpacity(opacity); setDrawBrush(kind); setActiveBrushPreset(preset);
    if (editor.current?.isDrawingMode) applyFreehandBrush(editor.current, kind, color, width, preset);
  }
  function activateBrushPreset(preset: StudioBrushPreset) {
    setBrushTextureId(preset.textureId); setBrushTextureScale(preset.textureScale); setBrushPressureMode(preset.pressureMode); setBrushPresetName(preset.name);
    updateFreehand(drawColor, drawWidth, drawOpacity, preset.baseBrush, preset);
  }
  function saveBrushPreset() {
    const parsed = studioBrushPresetSchema.safeParse({ id: crypto.randomUUID(), name: brushPresetName, baseBrush: drawBrush, textureId: brushTextureId, textureScale: brushTextureScale, pressureMode: brushPressureMode });
    if (!parsed.success) { setError("Give this brush a name before saving it."); return; }
    const next = [...brushPresets.filter((item) => item.name.toLowerCase() !== parsed.data.name.toLowerCase()), parsed.data].slice(-32);
    setBrushPresets(next);
    try { localStorage.setItem(BRUSH_PRESETS_KEY, JSON.stringify(next)); } catch { setError("This browser could not save the brush preset locally."); return; }
    activateBrushPreset(parsed.data);
  }
  function setDrawingStyle(style: { stroke?: string; strokeWidth?: number; brush?: StudioDrawBrush; brushPreset?: StudioBrushPreset | null }, record = true) {
    changeSelected((object) => {
      const layer = meta.current.get(object);
      if (layer?.kind !== "drawing") return;
      const preset = ("brushPreset" in style ? style.brushPreset : layer.brushPreset) ?? null;
      const brush = style.brush ?? preset?.baseBrush ?? studioDrawBrush(layer.brush);
      const width = style.strokeWidth ?? layer.strokeWidth;
      if (object instanceof Group && layer.pressurePoints?.length) {
        const segments = pressureSegments(layer.pressurePoints, width, brush, preset ?? undefined);
        const paint = brushPaint(style.stroke ?? layer.stroke, preset);
        object.getObjects().forEach((child, index) => {
          const segment = segments[index];
          if (child instanceof Circle) child.set({ fill: paint, radius: segment?.width ? segment.width / 2 : width / 2 });
          else child.set({ stroke: paint, strokeWidth: segment?.width ?? width, opacity: segment?.opacity ?? 1, strokeDashArray: undefined, strokeLineCap: brush === "marker" ? "butt" : "round" });
        });
      } else object.set({ ...style, strokeDashArray: drawingDashPattern(brush, width), strokeLineCap: brush === "marker" ? "butt" : "round" });
      meta.current.set(object, { ...layer, ...style, brushPreset: preset ?? undefined });
    }, record);
  }
  function setImageMask(mask: "none" | "circle" | "rounded") {
    changeSelected((object) => {
      const layer = meta.current.get(object);
      if (!(object instanceof FabricImage) || layer?.kind !== "image") return;
      object.clipPath = mask === "circle" ? new Ellipse({ rx: object.width / 2, ry: object.height / 2, originX: "center", originY: "center" }) : mask === "rounded" ? new Rect({ width: object.width, height: object.height, rx: Math.min(object.width, object.height) * 0.16, ry: Math.min(object.width, object.height) * 0.16, originX: "center", originY: "center" }) : undefined;
      const base = { ...layer }; delete base.mask;
      meta.current.set(object, mask === "none" ? base as StudioLayer : { ...layer, mask });
    });
  }
  function setLayerShadow(settings: { enabled: boolean; blur?: number; opacity?: number; offsetX?: number; offsetY?: number }, record = true) {
    changeSelected((object) => {
      const layer = meta.current.get(object); if (!layer) return;
      if (!settings.enabled) { object.shadow = null; const base = { ...layer }; delete base.shadow; meta.current.set(object, base as StudioLayer); return; }
      const shadow = { color: "#000000", opacity: settings.opacity ?? 0.24, blur: settings.blur ?? 18, offsetX: settings.offsetX ?? 0, offsetY: settings.offsetY ?? 8 };
      object.shadow = new Shadow({ color: `rgba(0,0,0,${shadow.opacity})`, blur: shadow.blur, offsetX: shadow.offsetX, offsetY: shadow.offsetY });
      meta.current.set(object, { ...layer, shadow });
    }, record);
  }
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
  async function addGraphic(assetKey: string) {
    const asset = studioAsset(assetKey);
    if (!asset || !canDesign() || locked) return;
    checkpoint();
    const a = surface().area;
    const size = Math.min(a.width * SIZE * 0.55, 220);
    const layer: StudioLayer = {
      id: crypto.randomUUID(), kind: "graphic", assetKey,
      printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
      x: a.x * SIZE + (a.width * SIZE - size) / 2,
      y: a.y * SIZE + (a.height * SIZE - size) / 2,
      scaleX: size / 200, scaleY: size / 200, angle: 0,
    };
    const object = await makeLayer(layer);
    editor.current!.add(object);
    bringGuideToTop();
    editor.current!.setActiveObject(object);
    capture(); readSelection(); editor.current!.requestRenderAll();
  }
  async function addBackground(color: string) {
    if (!canDesign() || locked) return;
    checkpoint();
    const a = surface().area;
    const layer: StudioLayer = {
      id: crypto.randomUUID(), kind: "shape", shape: "rect", fill: color,
      printRegionId: surface().printRegions ? activeRegionId ?? surface().printRegions?.[0]?.id : undefined,
      width: a.width * SIZE, height: a.height * SIZE,
      x: a.x * SIZE, y: a.y * SIZE, scaleX: 1, scaleY: 1, angle: 0,
    };
    const object = await makeLayer(layer);
    editor.current!.add(object);
    editor.current!.sendObjectToBack(object);
    bringGuideToTop(); editor.current!.setActiveObject(object);
    capture(); readSelection(); editor.current!.requestRenderAll();
  }
  async function executeEditorCommand(command: StudioEditorCommand) {
    // This is the sole validated intent entry point for library actions; a
    // future AI tool can submit the same command without touching Fabric state.
    const action = studioEditorCommandSchema.parse(command);
    if (locked) return;
    switch (action.type) {
      case "add_graphic": return addGraphic(action.assetKey);
      case "add_library_asset": return addCreativeLibraryAsset(action.assetId);
      case "add_shape": return addShape(action.shape);
      case "add_background": return addBackground(action.color);
      case "add_text": return addText({ text: action.text, size: 52, font: action.font });
      case "duplicate": return duplicate();
      case "delete": return removeSelected();
      case "undo": return undo();
      case "redo": return redo();
      case "align": return alignSelected(action.edge);
      case "move": return changeSelected((o) => o.set({ left: o.left + action.dx, top: o.top + action.dy }));
      case "resize": return changeSelected((o) => o.set({ scaleX: action.width / o.width, scaleY: action.keepRatio ? action.width / o.width : action.height / o.height }));
      case "rotate": return changeSelected((o) => o.rotate(action.degrees));
      case "flip": return flip(action.axis);
      case "crop_image": return applyCrop(action);
      case "make_pattern": return makePattern(action.assetId);
      case "set_layer_flags": return setLayerFlags(action.layerId, { hidden: action.hidden, locked: action.locked });
      case "set_layer_order": return setLayerOrder(action.layerId, action.direction);
      case "set_selection_flags": return setLayersFlags(action.layerIds, { hidden: action.hidden, locked: action.locked });
      case "set_selection_order": return setLayersOrder(action.layerIds, action.direction);
      case "group_selection": return groupLayers(action.layerIds);
      case "ungroup_selection": return ungroupLayers(action.layerIds);
      case "align_selection": return alignLayers(action.layerIds, action.edge);
      case "align_canvas": return alignCanvas(action.layerIds, action.edge);
      case "distribute_selection": return distributeLayers(action.layerIds, action.axis);
      case "set_opacity": return changeSelected((o) => o.set({ opacity: action.opacity }));
      case "set_shape_style": return changeSelected((o) => {
        const layer = meta.current.get(o);
        if (layer?.kind !== "shape") return;
        if (action.fill) meta.current.set(o, { ...layer, fill: action.fill, gradient: undefined });
        o.set({ ...(action.fill ? { fill: action.fill } : {}), ...(action.stroke !== undefined ? { stroke: action.stroke ?? undefined } : {}), ...(action.strokeWidth !== undefined ? { strokeWidth: action.strokeWidth } : {}) });
      });
      case "set_shape_gradient": return setShapeGradient(action.from, action.to, action.direction);
      case "set_text_style": {
        if (action.font) await ensureFont(action.font, action.bold ?? selected?.bold ?? false);
        return changeSelected((o) => {
          if (!(o instanceof IText)) return;
          const base = meta.current.get(o);
          o.set({ ...(action.text !== undefined ? { text: action.text } : {}), ...(action.font ? { fontFamily: fontFamily(action.font) } : {}), ...(action.fontSize !== undefined ? { fontSize: action.fontSize } : {}), ...(action.color ? { fill: action.color } : {}), ...(action.letterSpacing !== undefined ? { charSpacing: action.letterSpacing } : {}), ...(action.bold !== undefined ? { fontWeight: action.bold ? "bold" : "normal" } : {}), ...(action.outline !== undefined ? { stroke: action.outline ?? undefined } : {}), ...(action.outlineWidth !== undefined ? { strokeWidth: action.outlineWidth } : {}) });
          if (base?.kind === "text" && action.font) meta.current.set(o, { ...base, font: action.font });
        });
      }
      case "set_image_adjustment": return setImageAdjustment(action.field, action.value);
      case "set_image_mask": return setImageMask(action.mask);
      case "set_shadow": return setLayerShadow(action);
      case "prepare_artwork": {
        const region = regionsFor(surface()).find((item) => item.id === action.regionId);
        if (!region) throw new Error("Unknown print area for this view.");
        surface().area = region.bounds; setActiveRegionId(region.id);
        return changeSelected((o) => {
          const layer = meta.current.get(o);
          if (layer) meta.current.set(o, { ...layer, printRegionId: region.id });
          const width = region.bounds.width * SIZE, height = region.bounds.height * SIZE;
          const scale = Math.min(width / o.width, height / o.height);
          o.set({ scaleX: scale, scaleY: scale, left: region.bounds.x * SIZE + (width - o.width * scale) / 2, top: region.bounds.y * SIZE + (height - o.height * scale) / 2 });
        });
      }
    }
  }
  async function askStudioAi() {
    if (!editorAsk.trim() || proposalBusy || !editor.current) return;
    capture();
    const activeIds = editor.current.getActiveObjects().map((object) => meta.current.get(object)?.id).filter((id): id is string => Boolean(id));
    const state = buildStudioEditorState(doc.current as StudioLayout, currentId.current, activeIds, revision.current);
    setProposalBusy(true); setEditorProposal(null);
    try {
      const response = await fetch("/api/studio/editor-proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: editorAsk.trim(), state }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare a proposal.");
      const parsed = studioEditorProposalSchema.safeParse(result.proposal);
      if (!parsed.success) throw new Error("SweetOh AI returned a proposal the editor cannot review.");
      setEditorProposal({ ...parsed.data, revision: result.revision });
    } catch (error) { window.alert(error instanceof Error ? error.message : "Could not prepare a proposal."); }
    finally { setProposalBusy(false); }
  }
  async function acceptStudioProposal() {
    const proposal = editorProposal;
    if (!proposal || proposal.revision !== revision.current) { setEditorProposal(null); window.alert("The canvas changed. Ask SweetOh AI again so its proposal matches the current design."); return; }
    const before = structuredClone(doc.current), oldHistory = [...history.current], oldFuture = [...future.current], oldSelection = [...selectedLayerIds];
    checkpoint(); batching.current = true;
    try {
      for (const item of proposal.actions) {
        if (item.targetLayerIds.length) setSelectionByIds(item.targetLayerIds);
        await executeEditorCommand(item.command);
      }
      batching.current = false; capture(); setEditorProposal(null); setEditorAsk("");
    } catch (error) {
      batching.current = false; doc.current = before; history.current = oldHistory; future.current = oldFuture;
      setSurfaces([...before.surfaces]); setUndoCount(oldHistory.length); setRedoCount(oldFuture.length);
      await loadSurface(currentId.current); setSelectionByIds(oldSelection);
      window.alert(error instanceof Error ? `Proposal was rolled back: ${error.message}` : "Proposal was rolled back.");
    }
  }
  function setFill(hex: string, record = true) {
    changeSelected((o) => {
      o.set({ fill: hex });
      const base = meta.current.get(o);
      if (base?.kind === "shape") meta.current.set(o, { ...base, fill: hex, gradient: undefined });
    }, record);
  }
  function setShapeGradient(from: string, to: string, direction: "horizontal" | "vertical" | "diagonal" = "diagonal") {
    changeSelected((o) => {
      const base = meta.current.get(o);
      if (base?.kind !== "shape") return;
      const end = direction === "horizontal" ? { x: base.width, y: 0 } : direction === "vertical" ? { x: 0, y: base.height } : { x: base.width, y: base.height };
      o.set({ fill: new Gradient({ type: "linear", gradientUnits: "pixels", coords: { x1: 0, y1: 0, x2: end.x, y2: end.y }, colorStops: [{ offset: 0, color: from }, { offset: 1, color: to }] }) });
      meta.current.set(o, { ...base, gradient: { from, to, direction } });
    });
  }
  function setOpacity(v: number) {
    changeSelected((o) => o.set({ opacity: v }), false);
  }
  function setImageAdjustment(field: "brightness" | "contrast" | "saturation" | "blur", value: number, record = true) {
    const targets = editor.current?.getActiveObjects().filter((object) => object instanceof FabricImage && meta.current.get(object)?.kind === "image") as FabricImage[] | undefined;
    if (!targets?.length) return;
    if (record) checkpoint();
    for (const o of targets) {
      const base = meta.current.get(o);
      if (base?.kind !== "image") continue;
      const adjustments = { ...(base.adjustments ?? {}), [field]: value };
      meta.current.set(o, { ...base, adjustments });
      o.filters = [
        ...(adjustments.brightness ? [new filters.Brightness({ brightness: adjustments.brightness })] : []),
        ...(adjustments.contrast ? [new filters.Contrast({ contrast: adjustments.contrast })] : []),
        ...(adjustments.saturation ? [new filters.Saturation({ saturation: adjustments.saturation })] : []),
        ...(adjustments.blur ? [new filters.Blur({ blur: adjustments.blur })] : []),
      ];
      o.applyFilters();
    }
    capture(); readSelection(); editor.current?.requestRenderAll();
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
    const image = editor.current?.getActiveObject();
    if (!(image instanceof FabricImage)) return;
    const source = image.getElement() as HTMLImageElement;
    if (px && (px.x + px.width > source.naturalWidth || px.y + px.height > source.naturalHeight)) {
      setError("That crop extends beyond the source image.");
      return;
    }
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
    const canvas = editor.current;
    const objects = canvas?.getActiveObjects().filter((object) => meta.current.has(object));
    if (!canvas || !objects?.length) return;
    checkpoint();
    canvas.discardActiveObject(); canvas.remove(...objects);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function selectLayer(id: string) {
    const layer = surface().layers.find((item) => item.id === id);
    if (!layer) return;
    const ids = layer.groupId ? surface().layers.filter((item) => item.groupId === layer.groupId).map((item) => item.id) : [id];
    setSelectionByIds(ids);
  }
  function setSelectionByIds(ids: string[]) {
    const canvas = editor.current;
    if (!canvas) return;
    const unique = [...new Set(ids)];
    const objects = unique.map((id) => canvas.getObjects().find((object) => meta.current.get(object)?.id === id)).filter((object): object is FabricObject => Boolean(object && object.selectable && object.visible));
    canvas.discardActiveObject();
    if (objects.length === 1) canvas.setActiveObject(objects[0]);
    else if (objects.length > 1) canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
    canvas.requestRenderAll(); readSelection();
  }
  function groupLayers(ids: string[]) {
    const members = [...new Set(ids)].filter((id) => surface().layers.some((layer) => layer.id === id));
    if (members.length < 2) return;
    checkpoint();
    const groupId = crypto.randomUUID();
    const objects = editor.current!.getObjects().filter((object) => members.includes(meta.current.get(object)?.id ?? ""));
    for (const object of objects) { const layer = meta.current.get(object)!; meta.current.set(object, { ...layer, groupId }); }
    capture(); readSelection();
  }
  function ungroupLayers(ids: string[]) {
    const members = new Set(ids);
    const selectedGroups = new Set(surface().layers.filter((layer) => members.has(layer.id)).map((layer) => layer.groupId).filter((id): id is string => Boolean(id)));
    const targets = surface().layers.filter((layer) => members.has(layer.id) || (layer.groupId && selectedGroups.has(layer.groupId)));
    if (!targets.some((layer) => layer.groupId)) return;
    checkpoint();
    const targetIds = new Set(targets.map((layer) => layer.id));
    for (const object of editor.current!.getObjects()) if (targetIds.has(meta.current.get(object)?.id ?? "")) {
      const layer = { ...meta.current.get(object)! }; delete layer.groupId;
      meta.current.set(object, layer as StudioLayer);
    }
    capture(); readSelection();
  }
  function alignLayers(ids: string[], edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const canvas = editor.current;
    if (!canvas || ids.length < 2) return;
    const targets = canvas.getObjects().filter((object) => ids.includes(meta.current.get(object)?.id ?? "") && !meta.current.get(object)?.locked);
    if (targets.length < 2) return;
    checkpoint(); canvas.discardActiveObject();
    const bounds = targets.map((object) => ({ object, rect: object.getBoundingRect() }));
    const left = Math.min(...bounds.map((item) => item.rect.left)), right = Math.max(...bounds.map((item) => item.rect.left + item.rect.width));
    const top = Math.min(...bounds.map((item) => item.rect.top)), bottom = Math.max(...bounds.map((item) => item.rect.top + item.rect.height));
    for (const { object, rect } of bounds) {
      const dx = edge === "left" ? left - rect.left : edge === "right" ? right - (rect.left + rect.width) : ["hcenter"].includes(edge) ? (left + right) / 2 - (rect.left + rect.width / 2) : 0;
      const dy = edge === "top" ? top - rect.top : edge === "bottom" ? bottom - (rect.top + rect.height) : edge === "vcenter" ? (top + bottom) / 2 - (rect.top + rect.height / 2) : 0;
      object.set({ left: object.left + dx, top: object.top + dy }); object.setCoords();
    }
    capture(); readSelection(); canvas.requestRenderAll();
  }
  function alignCanvas(ids: string[], edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") {
    const canvas = editor.current;
    if (!canvas) return;
    const targets = canvas.getObjects().filter((object) => ids.includes(meta.current.get(object)?.id ?? "") && !meta.current.get(object)?.locked && !meta.current.get(object)?.hidden);
    if (!targets.length) return;
    checkpoint(); canvas.discardActiveObject();
    for (const object of targets) {
      const rect = object.getBoundingRect();
      const dx = edge === "left" ? -rect.left : edge === "right" ? SIZE - (rect.left + rect.width) : edge === "hcenter" ? SIZE / 2 - (rect.left + rect.width / 2) : 0;
      const dy = edge === "top" ? -rect.top : edge === "bottom" ? SIZE - (rect.top + rect.height) : edge === "vcenter" ? SIZE / 2 - (rect.top + rect.height / 2) : 0;
      object.set({ left: object.left + dx, top: object.top + dy }); object.setCoords();
    }
    capture(); readSelection(); canvas.requestRenderAll();
  }
  function distributeLayers(ids: string[], axis: "horizontal" | "vertical") {
    const canvas = editor.current;
    if (!canvas || ids.length < 3) return;
    const targets = canvas.getObjects().filter((object) => ids.includes(meta.current.get(object)?.id ?? "") && !meta.current.get(object)?.locked);
    if (targets.length < 3) return;
    checkpoint(); canvas.discardActiveObject();
    const horizontal = axis === "horizontal";
    const bounds = targets.map((object) => ({ object, rect: object.getBoundingRect() })).sort((a, b) => horizontal ? a.rect.left - b.rect.left : a.rect.top - b.rect.top);
    const start = horizontal ? bounds[0].rect.left : bounds[0].rect.top;
    const end = horizontal ? bounds.at(-1)!.rect.left + bounds.at(-1)!.rect.width : bounds.at(-1)!.rect.top + bounds.at(-1)!.rect.height;
    const span = bounds.reduce((sum, item) => sum + (horizontal ? item.rect.width : item.rect.height), 0);
    const gap = (end - start - span) / (bounds.length - 1);
    let cursor = start;
    for (const { object, rect } of bounds) {
      object.set(horizontal ? { left: object.left + cursor - rect.left } : { top: object.top + cursor - rect.top });
      cursor += (horizontal ? rect.width : rect.height) + gap; object.setCoords();
    }
    capture(); readSelection(); canvas.requestRenderAll();
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
  function setLayerFlags(id: string, patch: { hidden?: boolean; locked?: boolean }) {
    setLayersFlags([id], patch);
  }
  function setLayersFlags(ids: string[], patch: { hidden?: boolean; locked?: boolean }) {
    const canvas = editor.current;
    if (!canvas || (patch.hidden === undefined && patch.locked === undefined)) return;
    const targets = canvas.getObjects().filter((object) => ids.includes(meta.current.get(object)?.id ?? "") && meta.current.has(object));
    if (!targets.length) return;
    checkpoint();
    for (const object of targets) {
      const layer = meta.current.get(object)!;
      const next = { ...layer, ...(patch.hidden !== undefined ? { hidden: patch.hidden } : {}), ...(patch.locked !== undefined ? { locked: patch.locked } : {}) };
      meta.current.set(object, next);
      object.set({ visible: !next.hidden, selectable: !next.locked, evented: !next.locked });
    }
    if (targets.some((object) => { const l = meta.current.get(object)!; return l.hidden || l.locked; })) canvas.discardActiveObject();
    capture(); readSelection(); canvas.requestRenderAll();
  }
  function setLayerOrder(id: string, direction: "forward" | "backward" | "front" | "back") {
    setLayersOrder([id], direction);
  }
  function setLayersOrder(ids: string[], direction: "forward" | "backward" | "front" | "back") {
    const canvas = editor.current;
    if (!canvas) return;
    const layers = canvas.getObjects().filter((object) => meta.current.has(object));
    const selected = new Set(layers.filter((object) => ids.includes(meta.current.get(object)?.id ?? "") && !meta.current.get(object)?.locked).map((object) => object));
    if (!selected.size) return;
    checkpoint();
    const order = reorderLayers(layers, selected, direction);
    order.forEach((object, index) => canvas.moveObjectTo(object, index));
    bringGuideToTop(); capture(); readSelection(); canvas.requestRenderAll();
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
        referenceAssetId: s.referenceAssetId ?? null,
        imageUrl: s.imageUrl ?? null,
        imageRole: s.imageRole,
        position: s.position,
        area: s.area,
        printRegions: s.printRegions,
      })),
    );
    if (result.error) throw new Error(result.error);
  }
  async function chooseViewPhoto(photo: { imageUrl?: string; file?: File }) {
    if (!viewPicker) return;
    setBusy("Setting up view…");
    setError("");
    try {
      let assetId: string | null = null;
      if (photo.file) {
        const data = new FormData();
        data.set("photo", photo.file);
        const result = await uploadSurfaceAction(data);
        if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Upload failed.");
        assetId = result.assetId;
        urls.current[assetId] = result.previewUrl;
      }
      const area = viewPicker.mode === "replace" ? surface().area : { ...defaultArea };
      checkpoint();
      if (viewPicker.mode === "replace") {
        const s = surface();
        if (s.imageRole === "production_blank") {
          s.referenceAssetId = assetId;
          s.imageUrl = assetId ? null : photo.imageUrl;
        } else {
          s.assetId = assetId;
          s.referenceAssetId = null;
          s.imageUrl = assetId ? null : photo.imageUrl;
          s.imageRole = assetId ? "unverified" : "catalog_reference";
        }
        // A photo reference cannot redefine the saved print geometry.
      } else {
        doc.current.surfaces.push({
          id: `${viewPicker.position}-${crypto.randomUUID().slice(0, 6)}`,
          name: POSITION_LABEL[viewPicker.position] ?? viewPicker.position,
          position: viewPicker.position,
          assetId,
          referenceAssetId: null,
          imageUrl: assetId ? null : photo.imageUrl,
          imageRole: assetId ? "unverified" : "catalog_reference",
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
        views.push({ name: s.name, url: canvas.toDataURL({ format: "png", multiplier: 1 }), hasProductionBlank: Boolean(photoFor(s)) });
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
  /** Transparent print file for one print area, at 300 DPI when its size is known. */
  async function renderPrint(s: Surface, region = regionsFor(s)[0]): Promise<{ blob: Blob; width: number; height: number } | null> {
    if (!region) return null;
    // Physical size: the area's own dimensions, else the catalog print area for this view.
    // (Look it up on the untouched surface — narrowing it to one region first hides the catalog spec.)
    const sp = region.dimensions
      ? { width: Math.round(region.dimensions.width * (region.dimensions.unit === "cm" ? DPI / 2.54 : DPI)), height: Math.round(region.dimensions.height * (region.dimensions.unit === "cm" ? DPI / 2.54 : DPI)) }
      : regionsFor(s).length === 1 ? spec(s) : undefined;
    s = { ...s, area: region.bounds, printRegions: [region] };
    const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
    try {
      for (const layer of s.layers.filter(l => !l.hidden)) { const object = await makeLayer(layer); object.clipPath = printClip(s, layer); canvas.add(object); }
      const a = s.area;
      // Bound memory while preserving the requested physical aspect ratio.
      const targetWidth = sp?.width ?? Math.round(a.width * SIZE * 4);
      const targetHeight = sp?.height ?? Math.round(a.height * SIZE * 4);
      const cap = Math.min(1, 6000 / Math.max(targetWidth, targetHeight));
      const width = Math.max(1, Math.round(targetWidth * cap)), height = Math.max(1, Math.round(targetHeight * cap));
      const multiplier = Math.min(6000 / Math.max(a.width * SIZE, a.height * SIZE), Math.max(width / (a.width * SIZE), height / (a.height * SIZE)));
      const rendered = canvas.toCanvasElement(multiplier, { left: a.x * SIZE, top: a.y * SIZE, width: a.width * SIZE, height: a.height * SIZE });
      const output = document.createElement("canvas"); output.width = width; output.height = height;
      output.getContext("2d")!.drawImage(rendered, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
      return blob ? { blob, width, height } : null;
    } finally {
      await canvas.dispose();
    }
  }
  async function downloadPrint(s: Surface, region = regionsFor(s)[0]) {
    if (!region) return;
    capture();
    setBusy("Exporting print file…");
    try {
      const file = await renderPrint(s, region);
      if (!file) throw new Error("empty");
      const link = document.createElement("a");
      link.download = `${name || blank.name}-${s.name}-${region.name}-print.png`;
      link.href = URL.createObjectURL(file.blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch {
      setError("Couldn’t export this print file. Try again.");
    } finally {
      setBusy(null);
    }
  }
  const publishApi = (): EditorPublishApi => ({
    name: name.trim() || blank.name,
    blank,
    colors,
    sizes,
    setBusy,
    close: () => setPublishOpen(false),
    printFiles: async () => {
      capture();
      const files: PrintFile[] = [];
      for (const sf of doc.current.surfaces.filter((x) => x.layers.some((l) => !l.hidden))) {
        const region = regionsFor(sf)[0];
        const out = region ? await renderPrint(sf, region) : null;
        if (out) files.push({ surfaceId: sf.id, surfaceName: sf.name, position: sf.position ?? sf.id, region: region!.name, ...out });
      }
      return files;
    },
    mockups: async () => {
      const data = await buildPreview();
      if (!data.views[0]?.hasProductionBlank) throw new Error("A verified clean production blank is needed before creating a product mockup.");
      const toBlob = async (url: string) => (await fetch(url)).blob();
      return {
        front: await toBlob(data.views[0].url),
        colors: await Promise.all(data.colors.map(async (c) => ({ color: c.color, blob: await toBlob(c.url) }))),
      };
    },
  });
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
      clearDraft();
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
  const previewHasProductionBlank = preview
    ? previewPick.kind === "view"
      ? Boolean(preview.views[previewPick.index]?.hasProductionBlank)
      : Boolean(preview.colors[previewPick.index])
    : false;

  return (
    <div className="pe">
      <header className="pe-top">
        <Link href={base.catalog} className="pe-icon-btn" aria-label="Back to catalog" title="Back to catalog">
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
            {mode === "creator" ? "Save design" : "Save to My files"}
          </button>
          <button className="pe-btn pe-btn-ghost" onClick={() => void openPreview()} disabled={!hasDesign || locked}>
            <Eye size={16} /> Preview
          </button>
          {mode === "creator" ? (
            <button className="pe-btn pe-btn-primary" onClick={() => { capture(); setPublishOpen(true); }} disabled={!hasDesign || locked || !PublishPanel || !photoFor(doc.current.surfaces[0])} title={!photoFor(doc.current.surfaces[0]) ? "Prepare a verified clean blank before publishing." : undefined}>
              Sell it →
            </button>
          ) : (
            <button className="pe-btn pe-btn-primary" onClick={() => void save(true)} disabled={!hasDesign || locked || !photoFor(doc.current.surfaces[0])} title={!photoFor(doc.current.surfaces[0]) ? "Prepare a verified clean blank before continuing to pricing." : undefined}>
              Continue to pricing
            </button>
          )}
        </div>
      </header>

      <div className="pe-body">
        <nav className="pe-rail" aria-label="Design tools">
          {(
            [
              ["files", Upload, "Uploads"],
              ["text", Type, "Text"],
              ["shapes", Shapes, "Shapes"],
              ["assets", Library, "Library"],
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
                {{ files: "Uploads", text: "Text", shapes: "Shapes", assets: "Asset library", ai: "Create with AI", inspiration: "Inspiration", layers: "Layers" }[panel]}
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
                        <Link key={d.id} href={`${base.canvas}?composition=${d.id}`} title={`Open ${d.name}`} className="pe-saved">
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
                <section className="pe-section pe-draw-tool">
                  <p className="pe-label">Draw freely</p>
                  <div className="pe-row"><button className="pe-btn pe-btn-primary pe-grow" disabled={locked} aria-pressed={drawing} onClick={() => setFreehand(!drawing)}><PenLine size={16}/>{drawing ? "Finish drawing" : "Draw"}</button><button className="pe-btn pe-btn-ghost pe-grow" disabled={locked} aria-pressed={erasing} onClick={() => setEraseMode(!erasing)}><Eraser size={16}/>{erasing ? "Finish erasing" : "Erase strokes"}</button></div>
                {drawing && <>
                  {brushPresets.length > 0 && <label className="pe-select"><span>Saved brushes</span><select value={activeBrushPreset?.id ?? ""} onChange={(event) => { const preset = brushPresets.find((item) => item.id === event.target.value); if (preset) activateBrushPreset(preset); }}><option value="">Built-in brush</option>{brushPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>}
                  <label className="pe-select"><span>Brush</span><select value={drawBrush} onChange={(event) => { const brush = STUDIO_DRAW_BRUSHES.find((item) => item.id === event.target.value) ?? STUDIO_DRAW_BRUSHES[0]; updateFreehand(drawColor, brush.width, brush.opacity, brush.id, null); }} aria-label="Drawing brush">{STUDIO_DRAW_BRUSHES.map((brush) => <option key={brush.id} value={brush.id}>{brush.label} · {brush.description}</option>)}</select></label>
                  <div className="pe-row"><label className="pe-color-input" title="Brush color"><input type="color" value={drawColor} onChange={(event) => updateFreehand(event.target.value, drawWidth)} /></label><label className="pe-slider pe-grow"><span>Size <b>{drawWidth}px</b></span><input type="range" min={1} max={50} step={1} value={drawWidth} onChange={(event) => updateFreehand(drawColor, Number(event.target.value))}/></label></div>
                  <label className="pe-slider"><span>Brush opacity <b>{Math.round(drawOpacity * 100)}%</b></span><input type="range" min={0.1} max={1} step={0.01} value={drawOpacity} onChange={(event) => updateFreehand(drawColor, drawWidth, Number(event.target.value))}/></label>
                  <p className="pe-label">Make a reusable textured brush</p>
                  <label className="pe-select"><span>SweetOh texture</span><select value={brushTextureId} onChange={(event) => setBrushTextureId(event.target.value as StudioBrushPreset["textureId"])}>{STUDIO_DRAW_TEXTURES.map((texture) => <option key={texture.id} value={texture.id}>{texture.label} · original</option>)}</select></label>
                  <label className="pe-select"><span>Stylus response</span><select value={brushPressureMode} onChange={(event) => setBrushPressureMode(event.target.value as StudioBrushPreset["pressureMode"])}><option value="size">Pressure changes size</option><option value="opacity">Pressure changes opacity</option><option value="size-opacity">Pressure changes size and opacity</option></select></label>
                  <label className="pe-slider"><span>Texture scale <b>{brushTextureScale.toFixed(1)}×</b></span><input type="range" min={0.5} max={3} step={0.1} value={brushTextureScale} onChange={(event) => setBrushTextureScale(Number(event.target.value))}/></label>
                  <div className="pe-row"><input className="pe-input pe-grow" aria-label="Brush preset name" maxLength={36} value={brushPresetName} onChange={(event) => setBrushPresetName(event.target.value)} /><button type="button" className="pe-btn pe-btn-ghost" onClick={saveBrushPreset}>Save brush</button></div>
                  <p className="pe-muted pe-small">{activeBrushPreset ? `Using ${activeBrushPreset.name}. ` : "Textures are original SweetOh Studio resources. "}{STUDIO_DRAW_BRUSHES.find((brush) => brush.id === drawBrush)?.description} Mouse and touch use steady pressure.</p>
                </>}
                  {erasing && <p className="pe-muted pe-small">Swipe over a stroke to erase it. Other artwork and text are left alone.</p>}
                </section>
                <p className="pe-label">Solid print background</p>
                <div className="pe-swatches" aria-label="Background colors">{TEXT_COLORS.map((color) => <button key={color} type="button" disabled={locked} aria-label={`Add ${color} background`} style={{ background: color }} onClick={() => void executeEditorCommand({ type: "add_background", color })} />)}</div>
                <div className="pe-shapes">
                  {SHAPES.map((sh) => (
                    <button key={sh.kind} disabled={locked} onClick={() => void addShape(sh.kind)} title={sh.label}>
                      <svg viewBox="0 0 100 100" aria-hidden="true">
                        {sh.kind === "rect" && <rect x="12" y="12" width="76" height="76" />}
                        {sh.kind === "rounded" && <rect x="12" y="12" width="76" height="76" rx="16" />}
                        {sh.kind === "circle" && <circle cx="50" cy="50" r="38" />}
                        {sh.kind === "oval" && <ellipse cx="50" cy="50" rx="42" ry="28" />}
                        {sh.kind === "triangle" && <polygon points="50,12 90,86 10,86" />}
                        {sh.kind === "star" && <polygon points="50,8 61,38 94,38 67,58 77,90 50,70 23,90 33,58 6,38 39,38" />}
                        {sh.kind === "burst" && <path d="M50 4 57 27 76 12 72 36 96 32 81 50 99 62 75 66 83 90 61 77 50 99 39 77 17 90 25 66 1 62 19 50 4 32 28 36 24 12 43 27Z" />}
                        {sh.kind === "heart" && <path d="M50 88C20 66 6 50 6 32 6 18 16 10 28 10c9 0 17 5 22 13 5-8 13-13 22-13 12 0 22 8 22 22 0 18-14 34-44 56z" />}
                        {sh.kind === "hexagon" && <polygon points="25,12 75,12 94,50 75,88 25,88 6,50" />}
                        {sh.kind === "arrow" && <polygon points="5,35 62,35 62,15 95,50 62,85 62,65 5,65" />}
                        {sh.kind === "line" && <rect x="8" y="46" width="84" height="8" rx="4" />}
                      </svg>
                      <span>{sh.label}</span>
                    </button>
                  ))}
                </div>
                <p className="pe-muted pe-small">Select a shape to change its color, size and angle.</p>
              </div>
            )}

            {panel === "assets" && <AssetLibraryPanel creativeAssets={creativeAssets} disabled={locked} onAddCreativeAsset={(assetId) => void executeEditorCommand({ type: "add_library_asset", assetId })} onAddGraphic={(id) => void executeEditorCommand({ type: "add_graphic", assetKey: id })} onAddFont={(key) => void executeEditorCommand({ type: "add_text", text: "Your text", font: key })} />}

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
                <div className="pe-ai-editor-help">
                  <p className="pe-label">Ask about this canvas</p>
                  <textarea className="pe-textarea" rows={3} value={editorAsk} onChange={(event) => setEditorAsk(event.target.value)} placeholder="Try: Make this text more streetwear, center and group these objects, or prepare this artwork for sublimation." />
                  <button className="pe-btn pe-btn-primary pe-block" disabled={proposalBusy || editorAsk.trim().length < 4} onClick={() => void askStudioAi()}><Sparkles size={15}/>{proposalBusy ? "Preparing review…" : "Suggest Studio edits"}</button>
                  {editorProposal && <div className="pe-ai-proposal" role="status"><strong>Review these edits</strong><p>{editorProposal.summary}</p>{editorProposal.actions.length ? <ol>{editorProposal.actions.map((item, index) => <li key={index}>{item.command.type.replaceAll("_", " ")}{item.targetLayerIds.length ? ` · ${item.targetLayerIds.length} object${item.targetLayerIds.length === 1 ? "" : "s"}` : ""}</li>)}</ol> : <p>Select a compatible object, then ask again.</p>}<div className="pe-row"><button className="pe-btn pe-btn-primary pe-grow" disabled={!editorProposal.actions.length} onClick={() => void acceptStudioProposal()}>Accept edits</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => setEditorProposal(null)}>Discard</button></div></div>}
                  <p className="pe-muted pe-small">SweetOh AI can only suggest typed editor actions. Nothing changes until you accept; accepted edits share one undo step.</p>
                </div>
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
                        <input className="pe-layer-select" type="checkbox" aria-label={`Select ${l.kind === "text" ? l.text : l.kind === "shape" ? l.shape : "artwork"} for multi-object actions`} checked={selectedLayerIds.includes(l.id)} disabled={Boolean(l.locked || l.hidden)} onChange={(event) => setSelectionByIds(event.target.checked ? [...selectedLayerIds, l.id] : selectedLayerIds.filter((id) => id !== l.id))} />
                        <button disabled={l.locked || l.hidden} onClick={() => selectLayer(l.id)}>
                          {l.kind === "text" ? (
                            <Type size={16} />
                          ) : l.kind === "shape" ? (
                            <Shapes size={16} />
                          ) : l.kind === "graphic" ? (
                            <img src={studioAssetUrl(studioAsset(l.assetKey)!)} alt="" />
                          ) : l.kind === "drawing" ? <PenLine size={16} />
                            : (l.kind === "image" || l.kind === "pattern") && urls.current[l.assetId] ? <img src={urls.current[l.assetId]} alt="" />
                              : <ImageIcon size={16} />}
                          <span>
                            {l.kind === "text"
                              ? l.text
                              : l.kind === "shape"
                                ? `${l.shape[0].toUpperCase()}${l.shape.slice(1)}`
                                : l.kind === "graphic"
                                  ? studioAsset(l.assetKey)?.name ?? "Graphic"
                                  : l.kind === "drawing" ? "Freehand stroke" : `${library.find((d) => d.id === l.assetId)?.name ?? "Artwork"}${l.kind === "pattern" ? " (pattern)" : ""}`}{l.groupId ? " · Grouped" : ""}
                          </span>
                        </button>
                        <button className="pe-icon-btn" aria-label={`${l.hidden ? "Show" : "Hide"} layer`} onClick={() => void executeEditorCommand({ type: "set_layer_flags", layerId: l.id, hidden: !l.hidden })}>{l.hidden ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                        <button className="pe-icon-btn" aria-label={`${l.locked ? "Unlock" : "Lock"} layer`} onClick={() => void executeEditorCommand({ type: "set_layer_flags", layerId: l.id, locked: !l.locked })}>{l.locked ? <LockKeyhole size={14}/> : <UnlockKeyhole size={14}/>}</button>
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
          <div className="pe-surface-bar"><span><strong>{current.name}</strong><small>{photoFor(current) ? setupSaved ? "Product setup saved" : "Verified production blank" : "Print-area surface only · no clean blank photo"}</small></span>
            {currentRegions.length > 0 ? <label>Print area <select aria-label="Active print area" value={activeRegionId ?? currentRegions[0]?.id} onChange={e => {
              const r = currentRegions.find(r => r.id === e.target.value)!;
              capture(); editor.current?.discardActiveObject(); surface().area = r.bounds; setActiveRegionId(r.id); setSurfaces([...doc.current.surfaces]); readSelection();
            }}>{currentRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label> : <button className="pe-btn pe-btn-primary" onClick={() => setSetupOpen(true)}>Add a print area</button>}
          </div>
          {!photoFor(current) && <div className="pe-production-boundary" role="status" style={{ margin: "8px 12px 0", padding: "10px 12px", border: "1px solid #e8c887", borderRadius: 8, background: "#fff9e9", color: "#72551d", fontSize: 12 }}>
            <strong>No verified clean blank for this view.</strong> Artwork is placed on the saved print-area surface only. Supplier photos and generated mockups stay references and are not used as the production canvas.
          </div>}
          <div className="pe-stage" ref={stage} data-pan={panMode} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={e => { e.preventDefault(); if (!busy) void upload(e.dataTransfer.files[0]); }}
            onPointerDown={(e) => {
              gesture.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
              gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
              if (panMode || gesture.current.pointers.size > 1) e.currentTarget.setPointerCapture(e.pointerId);
              if (gesture.current.pointers.size === 2) {
                const [a, b] = [...gesture.current.pointers.values()];
                gesture.current.distance = Math.hypot(a.x - b.x, a.y - b.y);
                gesture.current.zoom = zoom;
              }
            }}
            onPointerMove={(e) => {
              if (!gesture.current.pointers.has(e.pointerId)) return;
              gesture.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (gesture.current.pointers.size === 2 && gesture.current.distance) {
                const [a, b] = [...gesture.current.pointers.values()];
                setZoom(Math.max(0.5, Math.min(3, round(gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance))));
              } else if (panMode) {
                e.currentTarget.scrollLeft -= e.clientX - gesture.current.lastX;
                e.currentTarget.scrollTop -= e.clientY - gesture.current.lastY;
              }
              gesture.current.lastX = e.clientX; gesture.current.lastY = e.clientY;
            }}
            onPointerUp={(e) => { gesture.current.pointers.delete(e.pointerId); gesture.current.distance = 0; }}
            onPointerCancel={(e) => { gesture.current.pointers.delete(e.pointerId); gesture.current.distance = 0; }}>
            <div className="pe-canvas" ref={host} />
            {ready && !layers.length && <div className="pe-start"><button onClick={() => setPanel("files")}><Upload size={15}/> Add artwork</button><button onClick={() => setPanel("text")}><Type size={15}/> Add text</button><span>or drop an image here</span></div>}
            {!ready && !error && (
              <div className="pe-loading">
                <Loader2 size={22} className="pe-spin" /> Loading product…
              </div>
            )}
            <div className="pe-zoom">
              <button onClick={() => setPanMode((value) => !value)} aria-label="Pan canvas" aria-pressed={panMode} title="Drag to pan"><Hand size={15} /></button>
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
                {viewThumbs[s.id] || referencePhotoFor(s) ? <img src={viewThumbs[s.id] ?? referencePhotoFor(s)!} alt="" /> : <ImageIcon size={18} />}
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
          {selectedLayerIds.length > 1 ? (
            <>
              <div className="pe-props-head"><h2>{selectedLayerIds.length} objects</h2><button className="pe-icon-btn pe-danger" onClick={removeSelected} aria-label="Delete selected objects"><Trash2 size={16}/></button></div>
              <section className="pe-section">
                <p className="pe-label">Arrange together</p>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "group_selection", layerIds: selectedLayerIds })}>Group</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "ungroup_selection", layerIds: selectedLayerIds })}>Ungroup</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "duplicate" })}>Duplicate</button></div>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_order", layerIds: selectedLayerIds, direction: "front" })}>To front</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_order", layerIds: selectedLayerIds, direction: "forward" })}>Forward</button></div>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_order", layerIds: selectedLayerIds, direction: "backward" })}>Backward</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_order", layerIds: selectedLayerIds, direction: "back" })}>To back</button></div>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_flags", layerIds: selectedLayerIds, hidden: true })}>Hide selection</button><button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_selection_flags", layerIds: selectedLayerIds, locked: true })}>Lock selection</button></div>
                <p className="pe-label">Align relative to</p>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={alignRelativeTo === "selection"} onClick={() => setAlignRelativeTo("selection")}>Selection</button><button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={alignRelativeTo === "canvas"} onClick={() => setAlignRelativeTo("canvas")}>Canvas</button></div>
                <div className="pe-align">{(["left", "hcenter", "right", "top", "vcenter", "bottom"] as const).map((edge) => <button key={edge} aria-label={`Align selected ${edge} to ${alignRelativeTo}`} title={`Align ${edge} to ${alignRelativeTo}`} onClick={() => void executeEditorCommand(alignRelativeTo === "canvas" ? { type: "align_canvas", layerIds: selectedLayerIds, edge } : { type: "align_selection", layerIds: selectedLayerIds, edge })}>{edge.slice(0,1).toUpperCase()}</button>)}</div>
                <p className="pe-label">Distribute evenly</p>
                <div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" disabled={selectedLayerIds.length < 3} onClick={() => void executeEditorCommand({ type: "distribute_selection", layerIds: selectedLayerIds, axis: "horizontal" })}>Horizontal</button><button className="pe-btn pe-btn-ghost pe-grow" disabled={selectedLayerIds.length < 3} onClick={() => void executeEditorCommand({ type: "distribute_selection", layerIds: selectedLayerIds, axis: "vertical" })}>Vertical</button></div>
                <p className="pe-muted pe-small">Drag the selection together on the canvas. Group keeps these layers together when selecting from Layers.</p>
                <p className="pe-label">Shared effect</p><button className="pe-btn pe-btn-ghost pe-block" onClick={() => setLayerShadow({ enabled: true })}>Add soft shadow to selection</button>
              </section>
            </>
          ) : selected ? (
            <>
              <div className="pe-props-head">
                <h2>{{ text: "Text", image: "Artwork", shape: "Shape", pattern: "Pattern", graphic: "Graphic", drawing: "Drawing" }[selected.kind]}</h2>
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
                const updated = { ...layer, printRegionId: e.target.value || undefined } as StudioLayer;
                meta.current.set(o, updated);
                if (updated.kind === "drawing") o.clipPath = printClip(surface(), updated);
              })}><option value="">All print areas</option>{currentRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></section>}
              <section className="pe-section"><p className="pe-label">Depth and shadow</p><button className="pe-btn pe-btn-ghost pe-block" aria-pressed={Boolean(selected.shadow)} onClick={() => setLayerShadow({ enabled: !selected.shadow })}>{selected.shadow ? "Remove soft shadow" : "Add soft shadow"}</button>{selected.shadow && <><label className="pe-slider"><span>Blur <b>{selected.shadow.blur}px</b></span><input type="range" min={0} max={60} step={1} value={selected.shadow.blur} onPointerDown={() => checkpoint()} onChange={(event) => setLayerShadow({ enabled: true, ...selected.shadow, blur: Number(event.target.value) }, false)}/></label><label className="pe-slider"><span>Strength <b>{Math.round(selected.shadow.opacity * 100)}%</b></span><input type="range" min={0.05} max={0.7} step={0.01} value={selected.shadow.opacity} onPointerDown={() => checkpoint()} onChange={(event) => setLayerShadow({ enabled: true, ...selected.shadow, opacity: Number(event.target.value) }, false)}/></label><label className="pe-slider"><span>Horizontal <b>{selected.shadow.offsetX}px</b></span><input type="range" min={-40} max={40} step={1} value={selected.shadow.offsetX} onPointerDown={() => checkpoint()} onChange={(event) => setLayerShadow({ enabled: true, ...selected.shadow, offsetX: Number(event.target.value) }, false)}/></label><label className="pe-slider"><span>Vertical <b>{selected.shadow.offsetY}px</b></span><input type="range" min={-40} max={40} step={1} value={selected.shadow.offsetY} onPointerDown={() => checkpoint()} onChange={(event) => setLayerShadow({ enabled: true, ...selected.shadow, offsetY: Number(event.target.value) }, false)}/></label></>}</section>
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
                  <label className="pe-num"><span>Pt</span><input type="number" min={12} max={120} step={1} aria-label="Font size" value={selected.fontSize ?? 48} onChange={(e) => { const value = Number(e.target.value); if (value >= 12 && value <= 120) changeSelected((o) => (o as IText).set({ fontSize: value })); }} /></label>
                  <label className="pe-slider"><span>Letter spacing <b>{selected.letterSpacing ?? 0}</b></span><input type="range" min={-100} max={500} step={10} value={selected.letterSpacing ?? 0} onPointerDown={() => checkpoint()} onChange={(e) => changeSelected((o) => (o as IText).set({ charSpacing: Number(e.target.value) }), false)} /></label>
                  <div className="pe-row"><label className="pe-color-input" title="Text outline"><input type="color" value={selected.outline ?? "#ffffff"} onChange={(e) => changeSelected((o) => (o as IText).set({ stroke: e.target.value }), false)} /></label><label className="pe-num"><span>Outline</span><input type="number" min={0} max={24} step={1} value={selected.outlineWidth ?? 0} onChange={(e) => changeSelected((o) => (o as IText).set({ stroke: e.target.value ? selected.outline ?? "#ffffff" : null, strokeWidth: Number(e.target.value) }))} /></label></div>
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
                  <p className="pe-label">Image mask</p><div className="pe-row"><button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={!selected.mask} onClick={() => setImageMask("none")}>Original</button><button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={selected.mask === "circle"} onClick={() => setImageMask("circle")}>Oval</button><button className="pe-btn pe-btn-ghost pe-grow" aria-pressed={selected.mask === "rounded"} onClick={() => setImageMask("rounded")}>Round</button></div>
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
                  <p className="pe-label">Image adjustments</p>
                  {([ ["brightness", "Brightness", -1, 1], ["contrast", "Contrast", -1, 1], ["saturation", "Saturation", -1, 1], ["blur", "Soft focus", 0, 0.2] ] as const).map(([field, label, min, max]) => (
                    <label className="pe-slider" key={field}>
                      <span>{label}<b>{Math.round((selected.adjustments?.[field] ?? 0) * (field === "blur" ? 500 : 100))}{field === "blur" ? "%" : ""}</b></span>
                      <input type="range" min={min} max={max} step={field === "blur" ? 0.005 : 0.02} value={selected.adjustments?.[field] ?? 0} onPointerDown={() => checkpoint()} onChange={(e) => setImageAdjustment(field, Number(e.target.value), false)} />
                    </label>
                  ))}
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
                  <p className="pe-label">Gradient fills</p>
                  <div className="pe-gradient-presets">
                    <button aria-label="Coral to gold gradient" style={{ background: "linear-gradient(135deg,#ef476f,#ffd166)" }} onClick={() => setShapeGradient("#ef476f", "#ffd166")} />
                    <button aria-label="Ocean gradient" style={{ background: "linear-gradient(135deg,#06a6a6,#26547c)" }} onClick={() => setShapeGradient("#06a6a6", "#26547c")} />
                    <button aria-label="Garden gradient" style={{ background: "linear-gradient(135deg,#94c973,#1f7048)" }} onClick={() => setShapeGradient("#94c973", "#1f7048")} />
                  </div>
                  <p className="pe-label">Outline</p>
                  <div className="pe-row">
                    <label className="pe-color-input" title="Outline color"><input type="color" value={selected.stroke ?? "#ffffff"} onChange={(e) => changeSelected((o) => o.set({ stroke: e.target.value }), false)} /></label>
                    <label className="pe-num"><span>Width</span><input type="number" min={0} max={100} step={1} value={selected.strokeWidth ?? 0} onChange={(e) => changeSelected((o) => o.set({ stroke: e.target.value ? selected.stroke ?? "#ffffff" : undefined, strokeWidth: Number(e.target.value) }))} /></label>
                  </div>
                </section>
              )}

              {selected.kind === "drawing" && <section className="pe-section"><p className="pe-label">Stroke style</p><label className="pe-select"><span>Brush</span><select value={selected.brushPreset ? `custom:${selected.brushPreset.id}` : selected.brush ?? "pencil"} onChange={(event) => { const preset = brushPresets.find((item) => `custom:${item.id}` === event.target.value); setDrawingStyle(preset ? { brush: preset.baseBrush, brushPreset: preset } : { brush: studioDrawBrush(event.target.value), brushPreset: null }); }}>{STUDIO_DRAW_BRUSHES.map((brush) => <option key={brush.id} value={brush.id}>{brush.label}</option>)}{selected.brushPreset && !brushPresets.some((preset) => preset.id === selected.brushPreset?.id) && <option value={`custom:${selected.brushPreset.id}`}>{selected.brushPreset.name}</option>}<optgroup label="Saved texture brushes">{brushPresets.map((preset) => <option key={preset.id} value={`custom:${preset.id}`}>{preset.name}</option>)}</optgroup></select></label><div className="pe-row"><label className="pe-color-input" title="Stroke color"><input type="color" value={selected.stroke ?? drawColor} onPointerDown={() => checkpoint()} onChange={(event) => setDrawingStyle({ stroke: event.target.value }, false)} /></label><label className="pe-slider pe-grow"><span>Size <b>{selected.strokeWidth ?? drawWidth}px</b></span><input type="range" min={1} max={50} step={1} value={selected.strokeWidth ?? drawWidth} onPointerDown={() => checkpoint()} onChange={(event) => setDrawingStyle({ strokeWidth: Number(event.target.value) }, false)}/></label></div><p className="pe-muted pe-small">The brush recipe and pressure samples are saved with this artwork. Erase strokes with the stroke eraser, or remove this whole stroke below.</p><button className="pe-btn pe-btn-ghost pe-block" onClick={removeSelected}><Eraser size={15}/>Erase this stroke</button></section>}

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
                <p className="pe-label">Align to canvas</p>
                <div className="pe-align">
                  {(["left", "hcenter", "right", "top", "vcenter", "bottom"] as const).map((edge, index) => {
                    const Icon = [AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal][index];
                    return <button key={edge} onClick={() => void executeEditorCommand({ type: "align_canvas", layerIds: selectedLayerIds.slice(0, 1), edge })} aria-label={`Align ${edge} to canvas`} title={`Align ${edge} to canvas`}><Icon size={16}/></button>;
                  })}
                </div>
                <div className="pe-row">
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_layer_order", layerId: selectedLayerIds[0], direction: "forward" })}>
                    <ArrowUp size={14} /> Forward
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_layer_order", layerId: selectedLayerIds[0], direction: "backward" })}>
                    <ArrowDown size={14} /> Backward
                  </button>
                </div>
                <div className="pe-row">
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_layer_order", layerId: selectedLayerIds[0], direction: "front" })}>To front</button>
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => void executeEditorCommand({ type: "set_layer_order", layerId: selectedLayerIds[0], direction: "back" })}>To back</button>
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
              <h2>{previewHasProductionBlank ? "Product preview" : "Print-area preview"}</h2>
              <button className="pe-icon-btn" onClick={() => setPreview(null)} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>
            <div className="pe-preview-body">
              <div className="pe-preview-main">{previewImage && <img src={previewImage} alt={previewHasProductionBlank ? "Product mockup" : "Artwork on the saved print-area surface"} />}</div>
              <div className="pe-preview-side">
                {!previewHasProductionBlank && <p className="pe-production-boundary" role="status"><strong>No verified clean production blank for this view.</strong> This is artwork over the saved print-area geometry, not a product mockup. Supplier photos and generated previews remain references.</p>}
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
                {mode === "creator" ? (
                  <button className="pe-btn pe-btn-primary pe-block pe-mt" disabled={Boolean(busy) || !PublishPanel} onClick={() => { setPreview(null); setPublishOpen(true); }}>
                    Sell it →
                  </button>
                ) : (
                  <button className="pe-btn pe-btn-primary pe-block pe-mt" disabled={Boolean(busy) || !preview.views[0]?.hasProductionBlank} title={!preview.views[0]?.hasProductionBlank ? "Prepare a verified clean blank before continuing to pricing." : undefined} onClick={() => void save(true)}>
                    Continue to pricing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {recovered && (
        <div className="pe-recover" role="status">
          <span>
            Unsaved work from {new Date(recovered.at).toLocaleString()} — {recovered.layers} {recovered.layers === 1 ? "layer" : "layers"}.
          </span>
          <button
            className="pe-btn pe-btn-primary"
            onClick={async () => {
              try {
                const raw = localStorage.getItem(draftKey);
                const draft = raw ? (JSON.parse(raw) as { name?: string; studio: StudioLayout }) : null;
                if (!draft) return;
                doc.current = studioLayoutSchema.parse(draft.studio);
                if (draft.name) setName(draft.name);
                history.current = []; setUndoCount(0); future.current = []; setRedoCount(0);
                setSurfaces([...doc.current.surfaces]);
                await loadSurface(doc.current.surfaces[0].id);
                dirty.current = true;
              } catch {
                setError("That saved copy couldn't be opened.");
              } finally {
                setRecovered(null);
              }
            }}
          >
            Restore it
          </button>
          <button className="pe-btn pe-btn-ghost" onClick={() => { clearDraft(); setRecovered(null); }}>
            Discard
          </button>
        </div>
      )}

      {publishOpen && PublishPanel && <PublishPanel api={publishApi()} />}

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
            <p className="pe-muted">Catalog photos stay references; uploads remain unverified. Prepare a blank with the existing background-removed product setup flow to use a photo on this canvas.</p>
            {catalogPhotos.length > 0 && !Object.keys(photoScores).length && (
              <p className="pe-muted pe-small">
                <Loader2 size={13} className="pe-spin" /> Finding the best photos…
              </p>
            )}
            <div className="pe-photo-grid">
              {[...catalogPhotos]
                .sort((a, b) => (photoScores[b] ?? -9) - (photoScores[a] ?? -9))
                .map((src, i) => (
                  <button key={src} disabled={Boolean(busy)} onClick={() => void chooseViewPhoto({ imageUrl: src })}>
                    <img src={sizedPhoto(src, 400)} alt="" />
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
                  if (f) void chooseViewPhoto({ file: f });
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
