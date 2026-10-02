"use client";

import { useEffect } from "react";
import { loadCatalogFont, studioFont } from "@/lib/studio/fonts";
import { contrastRatio, TEXT_STYLE_PRESETS, type TextStylePreset } from "@/lib/studio/text-styles";

const GROUPS = ["Headlines", "Retro & groovy", "Script & hand", "Elegant", "Outline & shadow", "Badges & curves", "Clean & minimal"] as const;

const DARK_CARD = "#102a2d";
function darker(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, "0");
  return `#${c(16)}${c(8)}${c(0)}`;
}
/** A readable way to show a style's color on its card: as is on white, on a dark card, or slightly deepened. Insertion keeps the real color. */
export function previewTone(accent: string | undefined): { color: string; dark: boolean } {
  const color = accent ?? "#173e39";
  if (contrastRatio(color, "#ffffff") >= 4.5) return { color, dark: false };
  if (contrastRatio(color, DARK_CARD) >= 4.5) return { color, dark: true };
  let deeper = color;
  for (let step = 1; step <= 10 && contrastRatio(deeper, "#ffffff") < 4.5; step++) deeper = darker(color, step * 0.06);
  return { color: deeper, dark: false };
}

function Preview({ preset }: { preset: TextStylePreset }) {
  const font = studioFont(preset.font);
  // Fit the sample to the card: roughly 0.58em per character, plus tracking.
  const tracking = (preset.letterSpacing ?? 0) / 1000;
  const size = Math.max(12, Math.min(30, preset.size * 0.38, 112 / (preset.sample.length * (0.74 + tracking))));
  const { color, dark } = previewTone(preset.accent);
  const style = {
    fontFamily: font.family,
    fontSize: size,
    fontWeight: preset.bold && font.bold ? 700 : 400,
    fontStyle: preset.italic ? "italic" : "normal",
    color,
    letterSpacing: preset.letterSpacing ? `${preset.letterSpacing / 1000}em` : undefined,
    WebkitTextStroke: preset.outline && !dark ? `${Math.max(1, (preset.outlineWidth ?? 4) * 0.35)}px ${preset.outline}` : undefined,
    paintOrder: "stroke fill",
  } as const;
  if (preset.curve) {
    const arch = preset.curve > 0;
    const d = arch ? "M 12 46 Q 90 -6 168 46" : "M 12 8 Q 90 60 168 8";
    return (
      <svg viewBox="0 0 180 56" className="ts-curve" aria-hidden>
        <defs><path id={`ts-${preset.id}`} d={d} /></defs>
        <text style={style} textAnchor="middle"><textPath href={`#ts-${preset.id}`} startOffset="50%">{preset.sample}</textPath></text>
      </svg>
    );
  }
  return <span style={style} className="ts-sample">{preset.sample}</span>;
}

export function TextStylesGallery({ disabled, onPick }: { disabled: boolean; onPick: (preset: TextStylePreset) => void }) {
  useEffect(() => { for (const preset of TEXT_STYLE_PRESETS) void loadCatalogFont(preset.font, Boolean(preset.bold)); }, []);
  return (
    <div className="ts">
      {GROUPS.map((group) => (
        <section key={group} aria-label={group}>
          <p className="pe-label">{group}</p>
          <div className="ts-grid">
            {TEXT_STYLE_PRESETS.filter((preset) => preset.group === group).map((preset) => (
              <button key={preset.id} type="button" className="ts-card" data-dark={previewTone(preset.accent).dark} disabled={disabled} onClick={() => onPick(preset)} aria-label={`Add ${preset.label} text`}>
                <Preview preset={preset} />
                <small>{preset.label}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
