"use client";

import { useState } from "react";
import { addPartnerInspirationAction } from "../actions/captures";

type Item = { id: string; name: string; note: string | null; previewUrl: string; createdAt: Date };

export function InspirationWorkspace({ initialItems, initialError }: { initialItems: Item[]; initialError: string | null }) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setBusy(true); setMessage("");
    const result = await addPartnerInspirationAction(form);
    setBusy(false);
    if (!result.ok) { setMessage(result.error); return; }
    setMessage("Saved privately as inspiration. It is not a Studio asset or approved artwork.");
    window.location.reload();
  }
  return <section>
    <header className="studio-page-heading"><div><p className="studio-kicker">PRIVATE WORKSPACE</p><h1>Inspiration</h1><p>Keep screenshots and images that help explain what you like or want to make. References stay private and are never published or added to your reusable asset library.</p></div></header>
    <form action={submit} className="pf-card" style={{ maxWidth: 720, display: "grid", gap: 12, padding: 20 }}>
      <label>Image or screenshot<input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" required /></label>
      <label>Optional note<textarea name="note" maxLength={1000} rows={3} placeholder="What do you like, want to learn from, or hope to create?" /></label>
      <button className="pf-btn pf-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save inspiration"}</button>
      {message && <p role="status">{message}</p>}
      <small>Private reference only · not approved Creative Library material · not used as artwork automatically</small>
    </form>
    <h2 style={{ marginTop: 28 }}>Saved references</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
      {items.map(item => <article className="pf-card" key={item.id} style={{ overflow: "hidden" }}><img src={item.previewUrl} alt={`Private inspiration: ${item.name}`} style={{ width: "100%", height: 150, objectFit: "cover" }} /><div style={{ padding: 12 }}><strong>{item.name}</strong>{item.note && <p>{item.note}</p>}<small>Private reference</small></div></article>)}
      {!items.length && <p>No inspiration saved yet.</p>}
    </div>
  </section>;
}
