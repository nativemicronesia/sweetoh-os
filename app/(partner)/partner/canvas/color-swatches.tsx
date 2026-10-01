"use client";

import { useEffect, useState } from "react";
import { Pipette } from "lucide-react";

const RECENTS_KEY = "sweetoh:studio:colors:recent:v1";
/** Four rows of six: neutrals, ocean, earth and sun, accents. */
export const STUDIO_PALETTE = [
  "#101828", "#3d4a52", "#7a8790", "#c9d0d4", "#f1f3f2", "#ffffff",
  "#12263f", "#1f4f8a", "#2a86c8", "#2aa6a0", "#7fd1c0", "#d6f0ea",
  "#244234", "#4a7c59", "#a9b86a", "#e8d9a8", "#f2b84b", "#d9822b",
  "#c8102e", "#e8795f", "#e7407c", "#7c5cc4", "#4b2e83", "#8a5a3c",
] as const;

function readRecents(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 10) : [];
  } catch { return []; }
}
function remember(color: string) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify([color.toLowerCase(), ...readRecents().filter((c) => c !== color.toLowerCase())].slice(0, 10))); } catch { /* optional */ }
}

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/**
 * One color control for text, shapes and backgrounds: colors already in the design,
 * a curated palette, recent colors, an eyedropper, and a custom picker.
 */
export function ColorSwatches({ value, docColors = [], onPick, onBeforeCustom, label }: {
  value?: string;
  docColors?: string[];
  onPick: (color: string, record?: boolean) => void;
  onBeforeCustom?: () => void;
  label?: string;
}) {
  const [recents, setRecents] = useState<string[]>([]);
  useEffect(() => { queueMicrotask(() => setRecents(readRecents())); }, []);
  const current = value?.toLowerCase();
  const dropper = typeof window !== "undefined" ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;
  const pick = (color: string) => { remember(color); setRecents(readRecents()); onPick(color); };
  const swatch = (color: string, key: string) => (
    <button key={key} type="button" className="cs-swatch" aria-label={color} title={color} aria-pressed={current === color.toLowerCase()} style={{ background: color }} onClick={() => pick(color)} />
  );
  return (
    <div className="cs" aria-label={label ?? "Color"}>
      {docColors.length > 0 && (
        <div className="cs-group"><p>In this design</p><div className="cs-row">{docColors.map((c) => swatch(c, `d-${c}`))}</div></div>
      )}
      <div className="cs-group">
        <p>Palette</p>
        <div className="cs-row cs-palette">
          {STUDIO_PALETTE.map((c) => swatch(c, `p-${c}`))}
        </div>
      </div>
      {recents.length > 0 && (
        <div className="cs-group"><p>Recent</p><div className="cs-row">{recents.map((c) => swatch(c, `r-${c}`))}</div></div>
      )}
      <div className="cs-tools">
        <label className="cs-custom" title="Custom color">
          <input type="color" value={current && /^#[0-9a-f]{6}$/i.test(current) ? current : "#101828"} onPointerDown={() => onBeforeCustom?.()} onChange={(e) => onPick(e.target.value, false)} onBlur={(e) => { remember(e.target.value); setRecents(readRecents()); }} />
          <span>Custom</span>
        </label>
        {dropper && (
          <button type="button" className="cs-eye" onClick={() => { void new dropper().open().then((result) => pick(result.sRGBHex)).catch(() => undefined); }}>
            <Pipette size={14} /> Pick from screen
          </button>
        )}
      </div>
    </div>
  );
}
