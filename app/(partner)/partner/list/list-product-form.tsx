"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Palette, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import {
  listOwnProductAction,
  makeBlankFromPhotoAction,
  prepareListingAction,
  type PreparedListing,
} from "../actions/listing";

type Category = { value: string; label: string };
type Photo = { file: File; url: string };
type Prepared = Extract<PreparedListing, { ok: true }>;
type Done = { productId: string; published: boolean; name: string };
type BlankState = { status: "working" } | { status: "ready"; id: string; reused: boolean } | { status: "failed"; error: string };

const fieldStyle = { borderColor: "var(--pf-border)" };

/**
 * Photograph something she already sells → Skink prepares it → she checks → published.
 *
 * 1. Photos in (laptop drag-and-drop or phone camera roll).
 * 2. Skink writes the listing and makes a clean shop photo that keeps her design.
 * 3. She checks one screen and publishes (or saves a draft).
 * 4. Her original photo becomes a design blank automatically, ready in the Studio.
 */
export function ListProductForm({ categories, maxPhotos, designs }: { categories: Category[]; maxPhotos: number; designs: { id: string; name: string }[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [useShot, setUseShot] = useState(true);
  const [done, setDone] = useState<Done | null>(null);
  const [blank, setBlank] = useState<BlankState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const blankFor = useRef<string | null>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  // Once it's listed, her original photo becomes a design blank — no extra tap.
  useEffect(() => {
    if (!done || !photos[0] || blankFor.current === done.productId) return;
    blankFor.current = done.productId;
    setBlank({ status: "working" });
    const data = new FormData();
    data.set("photo", photos[0].file);
    data.set("name", done.name);
    makeBlankFromPhotoAction(data)
      .then((r) => setBlank(r.ok ? { status: "ready", id: r.blankId, reused: Boolean(r.reused) } : { status: "failed", error: r.error }))
      .catch(() => setBlank({ status: "failed", error: "The blank couldn't be made. Try again from My products." }));
  }, [done, photos]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= maxPhotos) break;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos(next);
    setError(null);
  }

  function reset() {
    setPhotos([]);
    setPrepared(null);
    setManualEntry(false);
    setUseShot(true);
    setDone(null);
    setBlank(null);
    setError(null);
    blankFor.current = null;
    formRef.current?.reset();
  }

  function prepare() {
    if (!photos.length) {
      setError("Add at least one photo of your product.");
      return;
    }
    const data = new FormData();
    data.set("photo", photos[0].file);
    setError(null);
    setBusy("Skink is writing your listing and making a clean shop photo… (about a minute)");
    start(async () => {
      try {
        const result = await prepareListingAction(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPrepared(result);
        setManualEntry(false);
        setUseShot(Boolean(result.productShot));
      } catch {
        setError("Couldn't prepare this listing. Your photos are still here — try again or enter the details yourself.");
      } finally {
        setBusy(null);
      }
    });
  }

  function submit(publish: boolean) {
    const form = formRef.current;
    if (!form || !prepared) return;
    const data = new FormData(form);
    setError(null);
    setBusy(publish ? "Publishing to your shop…" : "Saving…");
    start(async () => {
      try {
        data.delete("photos");
        if (useShot && prepared.productShot) {
          const response = await fetch(prepared.productShot);
          if (!response.ok) throw new Error("The prepared shop photo couldn't be read.");
          const blob = await response.blob();
          data.append("photos", new File([blob], "shop-photo.jpg", { type: "image/jpeg" }));
        }
        const room = maxPhotos - data.getAll("photos").length;
        for (const p of photos.slice(0, room)) data.append("photos", p.file);
        data.set("publish", String(publish));
        const result = await listOwnProductAction(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setDone({ productId: result.productId, published: result.published, name: String(data.get("name") ?? "Your product").trim() });
        router.refresh();
      } catch {
        setError("Couldn't save this product. Your photos and details are still here — try again.");
      } finally {
        setBusy(null);
      }
    });
  }

  // ── 4. Listed; the blank is being made ────────────────────────────────────
  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--pf-border)" }}>
        <p role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 17 }}>
          <Check size={20} color="var(--pf-primary)" aria-hidden="true" /> {done.published ? `“${done.name}” is live in your shop.` : `“${done.name}” is saved as a draft.`}
        </p>
        <p className="text-sm" style={{ color: "var(--pf-muted)", marginTop: 6 }}>
          {done.published ? "Customers can buy it now." : "Publish it any time from My products."}
        </p>

        <div className="rounded-xl border p-4" style={{ ...fieldStyle, marginTop: 16 }}>
          {blank?.status === "working" && (
            <p role="status" aria-live="polite" className="text-sm"><Loader2 size={14} className="pe-spin" /> Skink is making a design blank from your photo — your design is erased so you can print new ones on the same product…</p>
          )}
          {blank?.status === "ready" && (
            <p className="text-sm" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={16} color="var(--pf-primary)" /> {blank.reused ? "You already had a design blank for this one." : "Design blank ready — it's in your Catalog under Saved blanks."}
            </p>
          )}
          {blank?.status === "failed" && <p role="alert" className="print-error">{blank.error}</p>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {blank?.status === "ready" && (
            <Link className="pe-btn pe-btn-primary" href={`/partner/canvas?blank=${blank.id}`}>
              <Palette size={16} /> Design on it now
            </Link>
          )}
          <Link className="pe-btn pe-btn-ghost" href={`/partner/review/${done.productId}`}>Edit the listing</Link>
          <button type="button" className="pe-btn pe-btn-ghost" onClick={reset}>
            <Plus size={16} /> Add another product
          </button>
        </div>
      </div>
    );
  }

  // ── 3. Check what Skink prepared ──────────────────────────────────────────
  if (prepared) {
    const s = prepared.suggestion;
    return (
      <form ref={formRef} className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(!manualEntry); }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {prepared.productShot && (
            <button
              type="button"
              onClick={() => setUseShot(!useShot)}
              aria-pressed={useShot}
              style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: `2px solid ${useShot ? "var(--pf-primary)" : "var(--pf-border)"}`, background: "#fff", textAlign: "left" }}
            >
              <img src={prepared.productShot} alt="Clean shop photo" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", opacity: useShot ? 1 : 0.5 }} />
              <span style={{ position: "absolute", left: 6, top: 6, background: useShot ? "var(--pf-primary)" : "rgba(0,0,0,.6)", color: "white", fontSize: 10, padding: "3px 7px", borderRadius: 99 }}>
                <Sparkles size={10} style={{ display: "inline" }} /> {useShot ? "Main shop photo" : "Not used — tap to use"}
              </span>
            </button>
          )}
          {photos.map((p, i) => (
            <div key={p.url} style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid var(--pf-border)", background: "#fff" }}>
              <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
              {i === 0 && (!useShot || !prepared.productShot) && (
                <span style={{ position: "absolute", left: 6, top: 6, background: "var(--pf-primary)", color: "white", fontSize: 10, padding: "3px 7px", borderRadius: 99 }}>Main shop photo</span>
              )}
            </div>
          ))}
        </div>
        {prepared.productShot && (
          <p className="text-sm" style={{ color: "var(--pf-muted)" }}>
            Skink made the first one from your photo — same product, same design, clean background. Tap it to use your own photo as the main one instead.
          </p>
        )}
        {prepared.notes.map((n) => (
          <p key={n} className="text-sm" style={{ color: "var(--pf-muted)" }}>{n}</p>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Name
            <input name="name" required maxLength={180} defaultValue={s?.name ?? ""} placeholder="e.g. Engraved tumbler — hibiscus" className="mt-2 w-full rounded-xl border p-3" style={fieldStyle} />
          </label>
          <label className="block text-sm">
            Your price (USD){s?.priceCents ? <span style={{ color: "var(--pf-muted)" }}> · Skink suggests ${(s.priceCents / 100).toFixed(2)}</span> : <span style={{ color: "var(--pf-muted)" }}> · optional for a private draft</span>}
            <input
              name="priceDollars"
              inputMode="decimal"
              defaultValue={s?.priceCents ? (s.priceCents / 100).toFixed(2) : ""}
              placeholder="35.00"
              className="mt-2 w-full rounded-xl border p-3"
              style={fieldStyle}
            />
          </label>
        </div>

        <label className="block text-sm">
          Category
          <select name="category" defaultValue={s?.category ?? categories[0]?.value} className="mt-2 w-full rounded-xl border p-3" style={fieldStyle}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Description
          <textarea name="description" rows={5} maxLength={2000} defaultValue={s?.description ?? ""} placeholder="Say what makes it special…" className="mt-2 w-full rounded-xl border p-3" style={fieldStyle} />
        </label>
        <label className="block text-sm">Attach approved SweetOh artwork (optional)
          <select name="artworkAssetId" defaultValue="" className="mt-2 w-full rounded-xl border p-3" style={fieldStyle}>
            <option value="">No artwork selected</option>
            {designs.map((design) => <option key={design.id} value={design.id}>{design.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Colors (optional, comma-separated)
            <input name="variantColors" maxLength={600} placeholder="Black, White, Navy" className="mt-2 w-full rounded-xl border p-3" style={fieldStyle} />
          </label>
          <label className="block text-sm">Sizes (optional, comma-separated)
            <input name="variantSizes" maxLength={300} placeholder="S, M, L, XL, 2XL" className="mt-2 w-full rounded-xl border p-3" style={fieldStyle} />
          </label>
        </div>

        {error && <p role="alert" className="print-error">{error}</p>}
        {busy && <p role="status" aria-live="polite" className="text-sm" style={{ color: "var(--pf-muted)" }}><Loader2 size={14} className="pe-spin" /> {busy}</p>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="submit" className="pe-btn pe-btn-primary" disabled={pending}>
            <Camera size={16} /> {manualEntry ? "Save private draft" : "Publish to my shop"}
          </button>
          <button type="button" className="pe-btn pe-btn-ghost" disabled={pending} onClick={() => submit(false)}>
            Save as draft
          </button>
          <button type="button" className="pe-btn pe-btn-ghost" disabled={pending} onClick={reset}>
            <RotateCcw size={15} /> Start over
          </button>
        </div>
        <p className="text-sm" style={{ color: "var(--pf-muted)" }}>
          Publishing is your choice. Set a price before publishing; a private draft can wait until you decide.
        </p>
      </form>
    );
  }

  // ── 1–2. Photos in, Skink prepares ────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
      >
        <label className="studio-photo-drop" style={{ minHeight: photos.length ? 140 : 220 }}>
          <span className="studio-upload-symbol" aria-hidden>＋</span>
          <strong>{photos.length ? "Add more photos" : "Drag photos here, or click to choose"}</strong>
          <span>{photos.length ? `${photos.length} of ${maxPhotos} · Skink works from the first one` : `Up to ${maxPhotos} · straight off your camera or phone is fine`}</span>
          <input type="file" accept="image/*" multiple aria-label="Product photos" disabled={pending} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </label>
        {photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 12 }}>
            {photos.map((p, i) => (
              <div key={p.url} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--pf-border)", background: "#fff" }}>
                <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                {i === 0 && <span style={{ position: "absolute", left: 6, top: 6, background: "var(--pf-primary)", color: "white", fontSize: 10, padding: "3px 7px", borderRadius: 99 }}>Main photo</span>}
                <button
                  type="button"
                  aria-label="Remove photo"
                  disabled={pending}
                  onClick={() => setPhotos(photos.filter((_, k) => k !== i))}
                  style={{ position: "absolute", right: 6, top: 6, background: "rgba(0,0,0,.6)", color: "white", borderRadius: 99, width: 24, height: 24, display: "grid", placeItems: "center" }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p role="alert" className="print-error">{error}</p>}
      {busy && <p role="status" aria-live="polite" className="text-sm" style={{ color: "var(--pf-muted)" }}><Loader2 size={14} className="pe-spin" /> {busy}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="pe-btn pe-btn-primary" disabled={pending || !photos.length} onClick={prepare}>
          <Sparkles size={16} /> Let Skink prepare it
        </button>
        <button type="button" className="pe-btn pe-btn-ghost" disabled={pending || !photos.length} onClick={() => { setPrepared({ ok: true, suggestion: null, productShot: null, notes: [] }); setManualEntry(true); setUseShot(false); }}>
          Enter details myself
        </button>
        {photos.length > 0 && (
          <button type="button" className="pe-btn pe-btn-ghost" disabled={pending} onClick={() => setPhotos([])}>
            <Trash2 size={15} /> Clear photos
          </button>
        )}
      </div>
    </div>
  );
}
