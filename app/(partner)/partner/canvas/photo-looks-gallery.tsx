"use client";

import styles from "./photo-looks-gallery.module.css";

export type PhotoLook = {
  label: string;
  swatch: string;
  values: { brightness?: number; contrast?: number; saturation?: number; temperature?: number; blur?: number };
};

export function PhotoLooksGallery({
  source,
  looks,
  adjustments,
  onApply,
}: {
  source?: string | null;
  looks: readonly PhotoLook[];
  adjustments?: PhotoLook["values"];
  onApply: (values: PhotoLook["values"]) => void;
}) {
  return (
    <div className={styles.grid} role="group" aria-label="Photo looks">
      {looks.map((look) => {
        const active = Object.entries(look.values).every(([key, value]) => adjustments?.[key as keyof PhotoLook["values"]] === value)
          && Object.entries(adjustments ?? {}).every(([key, value]) => !value || look.values[key as keyof PhotoLook["values"]] === value);
        const values = look.values;
        const previewFilter = [
          `brightness(${1 + (values.brightness ?? 0)})`,
          `contrast(${1 + (values.contrast ?? 0)})`,
          `saturate(${1 + (values.saturation ?? 0)})`,
          `blur(${(values.blur ?? 0) * 60}px)`,
        ].join(" ");
        const temperature = values.temperature ?? 0;

        return (
          <button
            key={look.label}
            className={styles.look}
            type="button"
            aria-pressed={active}
            aria-label={`Apply ${look.label} photo look`}
            title={`Apply ${look.label}`}
            onClick={() => onApply(look.values)}
          >
            <span className={styles.preview} style={{ background: look.swatch }}>
              {source && <img src={source} alt="" loading="lazy" decoding="async" style={{ filter: previewFilter }} />}
              {temperature !== 0 && <i aria-hidden="true" style={{ background: temperature > 0 ? "#ff9138" : "#498cdb", opacity: Math.abs(temperature) * 0.3 }} />}
            </span>
            <span className={styles.label}>{look.label}</span>
          </button>
        );
      })}
    </div>
  );
}
