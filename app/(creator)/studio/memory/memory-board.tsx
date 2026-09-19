"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Brain, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { addMemoryAction, forgetMemoryAction, updateMemoryAction } from "../actions/skink";

type Memory = { id: string; kind: string; title: string; body: string; pinned: boolean; source: string; updatedAt: string };

export function MemoryBoard({ memories, kinds }: { memories: Memory[]; kinds: { id: string; label: string }[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const label = (k: string) => kinds.find((x) => x.id === k)?.label ?? k;

  const groups = kinds
    .map((k) => ({ ...k, items: memories.filter((m) => m.kind === k.id) }))
    .filter((g) => g.items.length);

  return (
    <div className="cs-stack">
      <div className="cs-row">
        <button type="button" className="cs-btn cs-btn-primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add a note
        </button>
        <span className="cs-muted" style={{ fontSize: 14 }}>{memories.length} {memories.length === 1 ? "memory" : "memories"}</span>
      </div>
      {error && <p className="cs-alert" role="alert">{error}</p>}

      {memories.length === 0 && (
        <div className="cs-empty">
          <Brain size={34} color="var(--cs-green)" />
          <h3>Nothing yet</h3>
          <p className="cs-muted" style={{ margin: "0 auto 16px", maxWidth: 420 }}>Tell Skink about your brand, who you design for and what you want to achieve — it will remember the important parts.</p>
          <Link href="/studio/skink" className="cs-btn cs-btn-primary">Talk to Skink</Link>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="cs-memory-kind" style={{ fontFamily: "var(--font-body)", marginBottom: 10 }}>{g.label}</h2>
          <div className="cs-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {g.items.map((m) =>
              editing === m.id ? (
                <form
                  key={m.id}
                  className="cs-card cs-pad"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    start(async () => {
                      const r = await updateMemoryAction(m.id, { title: String(f.get("title") ?? ""), body: String(f.get("body") ?? "") });
                      if (r.error) setError(r.error);
                      else setEditing(null);
                    });
                  }}
                >
                  <input className="cs-input" name="title" defaultValue={m.title} maxLength={120} required aria-label="Title" />
                  <textarea className="cs-textarea" name="body" defaultValue={m.body} rows={4} maxLength={1200} style={{ marginTop: 8 }} aria-label="Details" />
                  <div className="cs-row" style={{ marginTop: 10 }}>
                    <button className="cs-btn cs-btn-primary cs-btn-sm" disabled={pending}>Save</button>
                    <button type="button" className="cs-btn cs-btn-quiet cs-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <article key={m.id} className="cs-card cs-pad" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="cs-between" style={{ gap: 6 }}>
                    <strong style={{ fontSize: 15 }}>{m.title}</strong>
                    {m.pinned && <span className="cs-badge cs-badge-gold"><Pin size={11} /> Pinned</span>}
                  </div>
                  {m.body && <p style={{ margin: 0, color: "var(--cs-ink-2)", fontSize: 14, whiteSpace: "pre-wrap" }}>{m.body}</p>}
                  <div className="cs-between" style={{ marginTop: "auto", paddingTop: 8 }}>
                    <span className="cs-muted" style={{ fontSize: 12 }}>{m.source === "creator" ? "Added by you" : "Saved by Skink"} · {new Date(m.updatedAt).toLocaleDateString()}</span>
                    <span className="cs-row" style={{ gap: 2 }}>
                      <button type="button" className="cs-btn cs-btn-quiet cs-btn-sm" onClick={() => setEditing(m.id)}>Edit</button>
                      <button type="button" className="cs-btn cs-btn-quiet cs-btn-sm" aria-label={m.pinned ? "Unpin" : "Pin"} disabled={pending} onClick={() => start(async () => void (await updateMemoryAction(m.id, { pinned: !m.pinned })))}>
                        {m.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                      </button>
                      <button type="button" className="cs-btn cs-btn-quiet cs-btn-sm" aria-label="Delete" disabled={pending} onClick={() => start(() => forgetMemoryAction(m.id))}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      ))}

      {adding && (
        <div className="cs-dialog-backdrop" role="dialog" aria-modal aria-label="Add a note" onClick={(e) => e.target === e.currentTarget && setAdding(false)}>
          <form
            className="cs-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              start(async () => {
                const r = await addMemoryAction(f);
                if (r.error) setError(r.error);
                else setAdding(false);
              });
            }}
          >
            <div className="cs-between" style={{ marginBottom: 14 }}>
              <h2 className="cs-h2">Add a note for Skink</h2>
              <button type="button" className="cs-btn cs-btn-quiet cs-btn-sm" onClick={() => setAdding(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <label className="cs-field">
              <span className="cs-label">Type</span>
              <select name="kind" className="cs-select" defaultValue="brand">
                {kinds.map((k) => <option key={k.id} value={k.id}>{label(k.id)}</option>)}
              </select>
            </label>
            <label className="cs-field">
              <span className="cs-label">Title</span>
              <input name="title" className="cs-input" placeholder="e.g. Brand name" maxLength={120} required />
            </label>
            <label className="cs-field">
              <span className="cs-label">Details</span>
              <textarea name="body" className="cs-textarea" rows={4} maxLength={1200} placeholder="e.g. Isla Bloom — bright tropical florals for Chuukese and Pohnpeian families" />
            </label>
            <button className="cs-btn cs-btn-primary" disabled={pending}>Save note</button>
          </form>
        </div>
      )}
    </div>
  );
}
