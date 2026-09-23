"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { submitCustomRequestAction } from "../account/actions";

type Photo = { file: File; url: string };

export function CustomRequestForm({ productTypes, maxPhotos, defaultPhone }: { productTypes: string[]; maxPhotos: number; defaultPhone: string }) {
  const [state, submit, sending] = useActionState(submitCustomRequestAction, undefined);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const v = state?.values;

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= maxPhotos) break;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  return (
    <form
      action={(data) => {
        data.delete("photos");
        for (const p of photos) data.append("photos", p.file);
        return submit(data);
      }}
      className="mt-10 space-y-5 rounded-2xl border p-6 sm:p-8"
      style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="so-label">
          What would you like?
          <select className="so-input" name="productType" required defaultValue={v?.productType ?? ""}>
            <option value="" disabled>Choose a product</option>
            {productTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="so-label">
          How many?
          <input className="so-input" name="quantity" type="number" min={1} max={10000} required defaultValue={v?.quantity ?? "1"} />
        </label>
      </div>

      <label className="so-label">
        Tell us about it
        <textarea
          className="so-input"
          name="description"
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          defaultValue={v?.description}
          placeholder="What it's for, the design or words, colors, sizes you need…"
        />
      </label>

      <div>
        <span className="so-label">Photos or artwork <span className="so-muted">(optional, up to {maxPhotos})</span></span>
        <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-6 text-sm so-muted" style={{ borderColor: "var(--so-border)" }}>
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          {photos.length ? `${photos.length} of ${maxPhotos} added — tap to add more` : "Tap to add a sketch, logo, or example you like"}
        </label>
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative overflow-hidden rounded-lg" style={{ background: "var(--so-surface)" }}>
                <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos(photos.filter((_, k) => k !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="so-label">
          Needed by <span className="so-muted">(optional)</span>
          <input className="so-input" type="date" name="neededBy" defaultValue={v?.neededBy} />
        </label>
        <label className="so-label">
          Budget <span className="so-muted">(optional)</span>
          <input className="so-input" name="budget" maxLength={120} placeholder="e.g. around $200" defaultValue={v?.budget} />
        </label>
        <label className="so-label">
          Phone <span className="so-muted">(optional)</span>
          <input className="so-input" type="tel" name="phone" maxLength={40} defaultValue={v?.phone ?? defaultPhone} />
        </label>
      </div>

      {state?.error && <p role="alert" className="so-alert">{state.error}</p>}
      <button type="submit" className="so-btn-primary" disabled={sending}>
        {sending ? "Sending…" : "Send to the shop"}
      </button>
    </form>
  );
}
