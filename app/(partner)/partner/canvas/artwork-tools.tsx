"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateArtworkAction, uploadCanvasArtworkAction } from "../actions/builder";
export function ArtworkTools({ blankId }: { blankId: string }) {
 const input = useRef<HTMLInputElement>(null);
 const [brief, setBrief] = useState(""); const [error, setError] = useState<string>();
 const [pending, startTransition] = useTransition(); const router = useRouter();
 function run(action: () => Promise<{assetId?: string; error?: string}>) {
  setError(undefined); startTransition(async () => { try { const result = await action();
   if (result.error) setError(result.error);
   else if (result.assetId) { router.push(`/partner/canvas?blank=${blankId}&design=${result.assetId}`); router.refresh(); }
  } catch { setError("Couldn’t add the artwork. Please try again."); } });
 }
 return <div className="easy-artwork-tools">
  <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload artwork file" className="sr-only" tabIndex={-1} disabled={pending} onChange={e => { const file = e.target.files?.[0]; if (!file) return; const form = new FormData(); form.set("artwork", file); run(() => uploadCanvasArtworkAction(form)); e.target.value = ""; }} />
  <button type="button" className="easy-add-button" disabled={pending} onClick={() => input.current?.click()}>＋ Upload artwork</button>
  <p className="easy-help">Choose a photo or design from your device.</p>
  <details className="studio-optional"><summary>Create artwork with AI</summary><div className="mt-3 space-y-3"><label className="studio-field">Describe your design<textarea className="mt-2 w-full rounded-lg border p-2" value={brief} onChange={e => setBrief(e.target.value)} rows={3} maxLength={2000} disabled={pending} /></label><button type="button" className="so-btn-ghost" disabled={pending || brief.trim().length < 8} onClick={() => run(() => generateArtworkAction(brief))}>Generate artwork</button><p className="easy-help">Uses AI only when you click Generate.</p></div></details>
  {pending && <p role="status" className="easy-help">Adding your artwork…</p>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
 </div>;
}
