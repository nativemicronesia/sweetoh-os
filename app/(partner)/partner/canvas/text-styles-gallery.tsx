"use client";

import { useEffect } from "react";
import { loadCatalogFont, studioFont } from "@/lib/studio/fonts";
import { TEXT_STYLE_PRESETS, type TextStylePreset } from "@/lib/studio/text-styles";

const GROUPS = ["Headlines", "Script & hand", "Badges & curves", "Clean & minimal"] as const;

function Preview({ preset }: { preset: TextStylePreset }) {
  const font = studioFont(preset.font);
  // Fit the sample to the card: roughly 0.58em per character, plus tracking.
  const tracking = (preset.letterSpacing ?? 0) / 1000;
  const size = Math.max(12, Math.min(30, preset.size * 0.38, 116 / (preset.sample.length * (0.58 + tracking))));
  const color = preset.accent ?? "#173e39";
  const style = {
    fontFamily: font.family,
    fontSize: size,
    fontWeight: preset.bold && font.bold ? 700 : 400,
    fontStyle: preset.italic ? "italic" : "normal",
    color,
    letterSpacing: preset.letterSpacing ? `${preset.letterSpacing / 1000}em` : undefined,
    WebkitTextStroke: preset.outline ? `${Math.max(1, (preset.outlineWidth ?? 4) * 0.35)}px ${preset.outline}` : undefined,
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
              <button key={preset.id} type="button" className="ts-card" disabled={disabled} onClick={() => onPick(preset)} aria-label={`Add ${preset.label} text`}>
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
