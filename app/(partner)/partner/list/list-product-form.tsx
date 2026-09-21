"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Palette, Plus, Sparkles, Trash2, X } from "lucide-react";
import { listOwnProductAction, makeBlankFromProductAction } from "../actions/listing";

type Category = { value: string; label: string };
type Photo = { file: File; url: string };

/**
 * One screen: photos, name, her price, publish. Everything else is optional.
 * Works the same on her laptop (drag photos in) and on a phone (camera roll).
 */
export function ListProductForm({ categories, maxPhotos }: { categories: Category[]; maxPhotos: number }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ productId: string; published: boolean; name: string } | null>(null);
  const [blank, setBlank] = useState<{ id: string; reused: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

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

  function submit(publish: boolean) {
    const form = formRef.current;
    if (!form) return;
    if (!photos.length) {
      setError("Add at least one photo of your product.");
      return;
    }
    const data = new FormData(form);
    data.delete("photos");
    for (const p of photos) data.append("photos", p.file);
    data.set("publish", String(publish));
    setError(null);
    setBusy(publish ? "Publishing to your shop…" : "Saving…");
    start(async () => {
      const result = await listOwnProductAction(data);
      setBusy(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({ productId: result.productId, published: result.published, name: String(data.get("name") ?? "Your product") });
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "var(--pf-border)" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 17 }}>
          <Check size={20} color="var(--pf-primary)" /> {done.published ? `“${done.name}” is live in your shop.` : `“${done.name}” is saved as a draft.`}
        </p>
        <p className="text-sm" style={{ color: "var(--pf-muted)", marginTop: 6 }}>
          {done.published ? "Customers can buy it now." : "Publish it any time from My products."}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="pe-btn pe-btn-primary"
            disabled={pending || Boolean(blank)}
            onClick={() =>
              start(async () => {
                setBusy("Skink is making a blank you can design on…");
                const r = await makeBlankFromProductAction(done.productId);
                setBusy(null);
                if (!r.ok) setError(r.error);
                else setBlank({ id: r.blankId, reused: Boolean(r.reused) });
              })
            }
          >
            {blank ? <Check size={16} /> : <Sparkles size={16} />} {blank ? (blank.reused ? "You already have one" : "Blank ready") : "Make a design blank"}
          </button>
          {blank && (
            <Link className="pe-btn pe-btn-ghost" href={`/partner/canvas?blank=${blank.id}`}>
              <Palette size={16} /> Design on it now
            </Link>
          )}
          <Link className="pe-btn pe-btn-ghost" href={`/partner/review/${done.productId}`}>Edit the listing</Link>
          <button
            type="button"
            className="pe-btn pe-btn-ghost"
            onClick={() => {
              setPhotos([]);
              setDone(null);
              setBlank(null);
              formRef.current?.reset();
            }}
          >
            <Plus size={16} /> Add another product
          </button>
        </div>
        {busy && <p className="text-sm" style={{ marginTop: 12, color: "var(--pf-muted)" }}><Loader2 size={14} className="pe-spin" /> {busy}</p>}
        {error && <p role="alert" className="print-error" style={{ marginTop: 12 }}>{error}</p>}
        <p className="text-sm" style={{ color: "var(--pf-muted)", marginTop: 14 }}>
          A design blank takes your photo, cleans it up and marks where you print. It lives under <strong>Saved blanks</strong> in My products and in your Catalog, ready for every future design.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(true); }}>
      {/* Photos */}
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
          <span>{photos.length ? `${photos.length} of ${maxPhotos} · the first one is your shop image` : `Up to ${maxPhotos} · straight off your camera or phone is fine`}</span>
          <input type="file" accept="image/*" multiple aria-label="Product photos" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          What is it?
          <input name="name" required maxLength={180} placeholder="e.g. Engraved tumbler — hibiscus" className="mt-2 w-full rounded-xl border p-3" style={{ borderColor: "var(--pf-border)" }} />
        </label>
        <label className="block text-sm">
          Your price (USD)
          <input name="priceDollars" required inputMode="decimal" placeholder="35.00" className="mt-2 w-full rounded-xl border p-3" style={{ borderColor: "var(--pf-border)" }} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Category
          <select name="category" defaultValue={categories[0]?.value} className="mt-2 w-full rounded-xl border p-3" style={{ borderColor: "var(--pf-border)" }}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Description (optional)
          <textarea name="description" rows={2} maxLength={2000} placeholder="Say what makes it special…" className="mt-2 w-full rounded-xl border p-3" style={{ borderColor: "var(--pf-border)" }} />
        </label>
      </div>

      {error && <p role="alert" className="print-error">{error}</p>}
      {busy && <p className="text-sm" style={{ color: "var(--pf-muted)" }}><Loader2 size={14} className="pe-spin" /> {busy}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="submit" className="pe-btn pe-btn-primary" disabled={pending}>
          <Camera size={16} /> Publish to my shop
        </button>
        <button type="button" className="pe-btn pe-btn-ghost" disabled={pending} onClick={() => submit(false)}>
          Save as draft
        </button>
        {photos.length > 0 && (
          <button type="button" className="pe-btn pe-btn-ghost" disabled={pending} onClick={() => setPhotos([])}>
            <Trash2 size={15} /> Clear photos
          </button>
        )}
      </div>
    </form>
  );
}
