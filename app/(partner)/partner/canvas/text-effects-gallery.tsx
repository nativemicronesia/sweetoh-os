"use client";

import { useEffect, useRef } from "react";
import { ensureFont, fontFamily } from "@/lib/studio/fonts";
import { effectPadding, renderTextEffect, TEXT_EFFECT_GROUPS, TEXT_EFFECT_PRESETS, TEXT_WARP_PRESETS, warpExtraPad, type EffectPaint, type TextEffect, type TextEffectPreset, type TextWarp } from "@/lib/studio/text-effects";

const WORD = "Island";
const PREVIEW_FONT = "lilita";
const SIZE = 36;
const W = 148;
const H = 64;

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

/** Draws the sample word with the real effect renderer, so the card shows exactly what the canvas will. */
export function EffectPreview({ effect, face, bg, warp }: { effect: TextEffect | null; face: string; bg?: string; warp?: TextWarp }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let live = true;
    void ensureFont(PREVIEW_FONT).then(() => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const g = canvas.getContext("2d");
      if (!g) return;
      const family = fontFamily(PREVIEW_FONT);
      const measure = document.createElement("canvas").getContext("2d")!;
      measure.font = `${SIZE}px ${family}`;
      const width = Math.ceil(measure.measureText(WORD).width);
      const height = Math.ceil(SIZE * 1.2);
      const unit = SIZE / 40;
      const pad = effectPadding(effect, unit);
      const fit = Math.min(1, (W - 6) / (width + pad * 1.1), (H - 6) / (height + (pad + warpExtraPad(warp, height)) * 1.1));
      const paint: EffectPaint = (c, fill, stroke, strokeWidth) => {
        c.font = `${SIZE}px ${family}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.lineJoin = "round";
        if (fill) { c.fillStyle = fill; c.fillText(WORD, 0, 0); }
        if (stroke && strokeWidth > 0) { c.strokeStyle = stroke; c.lineWidth = strokeWidth; c.strokeText(WORD, 0, 0); }
      };
      const { canvas: art, scale } = renderTextEffect({ effect, warp, width, height, k: dpr * fit, unit, fill: face, stroke: null, strokeWidth: 0, paint });
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(art, Math.round(canvas.width / 2 - art.width / 2), Math.round(canvas.height / 2 - art.height / 2), art.width * (dpr * fit) / scale, art.height * (dpr * fit) / scale);
    });
    return () => { live = false; };
  }, [effect, face, warp]);
  return <canvas ref={ref} className="fxg-canvas" style={{ background: bg }} aria-hidden />;
}

const GLOW_KINDS = new Set(["neon", "glow", "glitch"]);
export function previewBackground(preset: TextEffectPreset): string {
  return GLOW_KINDS.has(preset.effect.kind) || isLight(preset.face) ? "#102a2d" : "#f4efe2";
}

export function TextEffectsGallery({ disabled, active, onPick }: { disabled: boolean; active?: TextEffect | null; onPick: (preset: TextEffectPreset) => void }) {
  return (
    <div className="fxg">
      {TEXT_EFFECT_GROUPS.map((group) => (
        <section key={group} aria-label={group}>
          <p className="pe-label">{group}</p>
          <div className="fxg-grid">
            {TEXT_EFFECT_PRESETS.filter((preset) => preset.group === group).map((preset) => (
              <button key={preset.id} type="button" className="fxg-card" disabled={disabled} aria-pressed={Boolean(active && JSON.stringify(active) === JSON.stringify(preset.effect))} onClick={() => onPick(preset)} aria-label={`${preset.name} text effect`}>
                <EffectPreview effect={preset.effect} face={preset.face} bg={previewBackground(preset)} />
                <small>{preset.name}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TextShapes({ disabled, active, onPick }: { disabled: boolean; active?: TextWarp | null; onPick: (warp: TextWarp) => void }) {
  return (
    <section className="fxg" aria-label="Text shapes">
      <p className="pe-label">Text shape</p>
      <div className="fxg-grid">
        {TEXT_WARP_PRESETS.map((preset) => (
          <button key={preset.id} type="button" className="fxg-card" disabled={disabled} aria-pressed={Boolean(active && active.kind === preset.warp.kind && Math.sign(active.amount) === Math.sign(preset.warp.amount))} onClick={() => onPick(preset.warp)} aria-label={`${preset.name} text shape`}>
            <EffectPreview effect={null} warp={preset.warp} face="#173e39" bg="#f4efe2" />
            <small>{preset.name}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
