"use client";
import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X } from "lucide-react";

export type CropPixels = { x: number; y: number; width: number; height: number };

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Original", value: null },
  { label: "Square", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

/** Crop an artwork layer (react-easy-crop); the result is a pixel window on the source image. */
export function CropDialog({
  src,
  natural,
  onApply,
  onReset,
  onClose,
}: {
  src: string;
  natural: { width: number; height: number };
  onApply: (px: CropPixels) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | null>(null);
  const [pixels, setPixels] = useState<Area | null>(null);

  return (
    <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Crop">
      <div className="pe-modal-card pe-crop">
        <div className="pe-modal-head">
          <h2>Crop</h2>
          <button className="pe-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="pe-crop-area">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect ?? natural.width / natural.height}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, px) => setPixels(px)}
            objectFit="contain"
            showGrid
          />
        </div>
        <div className="pe-crop-controls">
          <div className="pe-positions">
            {ASPECTS.map((a) => (
              <button key={a.label} aria-pressed={aspect === a.value} onClick={() => setAspect(a.value)}>
                {a.label}
              </button>
            ))}
          </div>
          <label className="pe-crop-zoom">
            Zoom
            <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
        </div>
        <div className="pe-row pe-end">
          <button className="pe-btn pe-btn-ghost" onClick={onReset}>
            Reset crop
          </button>
          <button
            className="pe-btn pe-btn-primary"
            disabled={!pixels}
            onClick={() => pixels && onApply({ x: Math.round(pixels.x), y: Math.round(pixels.y), width: Math.round(pixels.width), height: Math.round(pixels.height) })}
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
