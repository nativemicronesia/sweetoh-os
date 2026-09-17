"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { prepareProductAction } from "../actions/builder";

export function ProductBuilderForm() {
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);
  const [purpose, setPurpose] = useState("blank");
  const [useAi, setUseAi] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  useEffect(() => { if (!photo) { setPreview(undefined); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  const field = "mt-2 w-full rounded-xl border border-[var(--so-border)] bg-[var(--so-surface)] p-3";
  return <form className="space-y-5 rounded-3xl border border-[var(--so-border)] bg-[var(--so-dark)] p-5 sm:p-8" onSubmit={event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(undefined);
    startTransition(async () => {
      try { const result = await prepareProductAction(form);
      if (result.error) setError(result.error);
      else if (result.productId) router.push(`/partner/builder/${result.productId}`); } catch { setError("Couldn’t prepare your product. Your photo is still here; please try again."); }
    });
  }}>
    <fieldset disabled={pending || !interactive} className="space-y-5">
      <legend className="sr-only">Prepare a product</legend>
      <div className="grid gap-3 sm:grid-cols-2">{[
        ["blank", "Design my own product", "Turn any product photo into a reusable blank. Clean it with AI in the next step."],
        ["finished", "List a finished product", "Keep your real photos and let AI help write the listing."],
      ].map(([value, title, description]) => <label key={value} className={`cursor-pointer rounded-2xl border p-5 ${purpose === value ? "border-[var(--so-gold)] bg-[var(--so-surface)]" : "border-[var(--so-border)]"}`}>
        <input type="radio" name="purpose" value={value} checked={purpose === value} onChange={() => setPurpose(value)} className="mr-2" />
        <span className="font-semibold">{title}</span><p className="mt-2 text-sm so-muted">{description}</p>
      </label>)}</div>
      <label className={`studio-photo-drop ${preview ? "has-photo" : ""}`}>
        {preview ? <img src={preview} alt="Your selected product" /> : <span className="studio-upload-symbol" aria-hidden="true">＋</span>}
        <strong>{photo ? photo.name : "Choose a product photo"}</strong><span>{photo ? "Click to choose a different photo" : "or click to browse · JPG, PNG, WebP · up to 10 MB"}</span>
        <input type="file" name="photo" aria-label="Product photo" accept="image/jpeg,image/png,image/webp" required onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      <label className="block text-sm">Product name {!useAi ? "(required)" : "(optional)"}<input name="name" required={!useAi} maxLength={180} className={field} placeholder="e.g. Heavyweight cotton tee" /></label>
      <details className="studio-optional"><summary>Add supplier link or notes (optional)</summary><div className="mt-4 space-y-4">
        <label className="block text-sm">Supplier link<input name="sourceUrl" type="url" className={field} placeholder="https://…" /></label>
        <label className="block text-sm">Notes<textarea name="notes" maxLength={4000} className={field} rows={3} placeholder="Brand, model, or anything you already know…" /></label>
      </div></details>
      <label className="flex items-start gap-3"><input type="checkbox" name="useAi" checked={useAi} onChange={e => setUseAi(e.target.checked)} className="mt-1" />
        <span><span className="font-medium">Also research supplier details with AI (optional)</span><span className="block text-sm so-muted">Searches supplier information and prepares copy. Switch off to save your own details without AI usage.</span></span>
      </label>
      <button disabled={pending} className="so-btn-primary disabled:opacity-50">{pending ? "Saving your product…" : useAi ? "Prepare my product" : "Save my product"}</button>
    </fieldset>
    {pending && <p role="status" className="text-sm so-muted">This may take a minute. Keep this page open; your product will stay private.</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>;
}
