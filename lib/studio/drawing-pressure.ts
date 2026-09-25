import type { StudioDrawBrush, StudioBrushPreset } from "./drawing-brushes";

export type PressureSample = { x: number; y: number; pressure: number };
export type LocalPressureSample = { x: number; y: number; pressure: number };
export type PressureSegment = { pathData: string; width: number; opacity: number; startIndex?: number };

export const MAX_PRESSURE_SAMPLES = 240;
export const FALLBACK_PRESSURE = 0.5;

/** Ignore mouse and ordinary touch pressure; use a steady fallback for both. */
export function pointerPressure(event: { pointerType?: string; pressure?: number }): number {
  if (event.pointerType !== "pen" || !Number.isFinite(event.pressure) || !event.pressure) return FALLBACK_PRESSURE;
  return Math.max(0, Math.min(1, event.pressure!));
}

export function compactPressureSamples(samples: PressureSample[], limit = MAX_PRESSURE_SAMPLES): PressureSample[] {
  if (samples.length <= limit) return samples.map((sample) => ({ ...sample }));
  return Array.from({ length: limit }, (_, index) => samples[Math.round(index * (samples.length - 1) / (limit - 1))]).map((sample) => ({ ...sample }));
}

export function normalizePressureSamples(samples: PressureSample[]): { x: number; y: number; points: LocalPressureSample[] } {
  const points = compactPressureSamples(samples);
  const x = Math.min(...points.map((point) => point.x));
  const y = Math.min(...points.map((point) => point.y));
  return { x, y, points: points.map((point) => ({ x: point.x - x, y: point.y - y, pressure: Math.max(0, Math.min(1, point.pressure)) })) };
}

/** Pressure response used by both the live brush preview and saved Fabric paths. */
export function pressureSegment(sampleA: LocalPressureSample, sampleB: LocalPressureSample, baseWidth: number, brush: StudioDrawBrush, preset?: StudioBrushPreset): PressureSegment {
  const pressure = (sampleA.pressure + sampleB.pressure) / 2;
  const pressureMode = preset?.pressureMode ?? (brush === "marker" ? "size-opacity" : "size");
  return {
    pathData: `M ${sampleA.x.toFixed(2)} ${sampleA.y.toFixed(2)} L ${sampleB.x.toFixed(2)} ${sampleB.y.toFixed(2)}`,
    width: Math.max(0.5, baseWidth * (pressureMode === "size" || pressureMode === "size-opacity" ? 0.4 + pressure * 1.2 : 1)),
    opacity: pressureMode === "opacity" || pressureMode === "size-opacity" ? 0.25 + pressure * 0.75 : 1,
  };
}

export function pressureSegments(points: LocalPressureSample[], baseWidth: number, brush: StudioDrawBrush, preset?: StudioBrushPreset): PressureSegment[] {
  if (points.length < 2) return [];
  return points.slice(1).map((point, index) => ({
    ...pressureSegment(points[index], point, baseWidth, brush, preset),
    startIndex: index,
    ...(brush === "dashed" && index % 3 !== 0 ? { opacity: 0 } : {}),
  }));
}
