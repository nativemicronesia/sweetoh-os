"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { buildPackAction, saveResultAction, saveToolsAction } from "../actions/tools";

type Tool = { id: string; name: string; kind: string; url: string; good: string };
type Task = { id: string; label: string; blurb: string; askFor: string; kinds: string[] };

const KIND_LABEL: Record<string, string> = { ai: "AI assistants", design: "Design apps", production: "Printing", store: "Stores" };

export function MyTools({ tools, tasks, mine }: { tools: Tool[]; tasks: Task[]; mine: string[] }) {
  const [picked, setPicked] = useState<string[]>(mine);
  const [saved, setSaved] = useState(false);
  const [tool, setTool] = useState<string>(mine.find((id) => tools.find((t) => t.id === id)?.kind === "ai") ?? "");
  const [task, setTask] = useState<string>(tasks[0]?.id ?? "");
  const [brief, setBrief] = useState("");
  const [pack, setPack] = useState<{ text: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState("");
  const [filed, setFiled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const current = tasks.find((t) => t.id === task);
  const usable = tools.filter((t) => picked.includes(t.id) && (current ? current.kinds.includes(t.kind) : t.kind === "ai" || t.kind === "design"));

  function toggle(id: string) {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    setSaved(false);
    start(async () => {
      await saveToolsAction(next);
      setSaved(true);
    });
  }

  function prepare() {
    setError(null);
    setPack(null);
    setFiled(false);
    start(async () => {
      const r = await buildPackAction({ toolId: tool, taskId: task, brief });
      if (!r.ok) setError(r.error);
      else setPack({ text: r.pack, url: r.url });
    });
  }

  return (
    <div className="cs-stack" style={{ gap: 22 }}>
      <section className="cs-card cs-pad">
        <div className="cs-between" style={{ marginBottom: 12 }}>
          <h2 className="cs-h2">What do you already have?</h2>
          {saved && <span className="cs-badge cs-badge-green"><Check size={12} /> Saved — Skink knows</span>}
        </div>
        {["ai", "design", "production", "store"].map((kind) => (
          <div key={kind} style={{ marginBottom: 14 }}>
            <p className="cs-label" style={{ marginBottom: 8 }}>{KIND_LABEL[kind]}</p>
            <div className="cs-row" style={{ gap: 8 }}>
              {tools.filter((t) => t.kind === kind).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-pressed={picked.includes(t.id)}
                  title={t.good}
                  className={`cs-btn ${picked.includes(t.id) ? "cs-btn-lime" : "cs-btn-ghost"} cs-btn-sm`}
                >
                  {picked.includes(t.id) && <Check size={14} />} {t.name}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="cs-muted" style={{ fontSize: 13, margin: 0 }}>Skink uses these when they&apos;re the better tool — so your subscriptions do more and your credits last longer.</p>
      </section>

      <section className="cs-card cs-pad">
        <h2 className="cs-h2" style={{ marginBottom: 4 }}>Hand work to your own tool</h2>
        <p className="cs-muted" style={{ fontSize: 14, marginTop: 0 }}>Free — this never uses your Sweet&apos;Oh credits.</p>

        <label className="cs-field">
          <span className="cs-label">What do you want done?</span>
          <select className="cs-select" value={task} onChange={(e) => { setTask(e.target.value); setPack(null); }}>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.label} — {t.blurb}</option>)}
          </select>
        </label>

        <label className="cs-field">
          <span className="cs-label">{current?.askFor ?? "Details"}</span>
          <textarea className="cs-textarea" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Chuukese mwaramwar florals for mothers and aunties in the diaspora" maxLength={1200} />
        </label>

        <label className="cs-field">
          <span className="cs-label">Which of your tools?</span>
          {picked.length === 0 ? (
            <p className="cs-muted" style={{ fontSize: 14, margin: 0 }}>Pick your tools above first.</p>
          ) : usable.length === 0 ? (
            <p className="cs-muted" style={{ fontSize: 14, margin: 0 }}>None of your tools fit this job — Skink can do it here instead.</p>
          ) : (
            <select className="cs-select" aria-label="Which of your tools" value={tool} onChange={(e) => { setTool(e.target.value); setPack(null); }}>
              <option value="">Choose one of your tools…</option>
              {usable.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.good}</option>
              ))}
            </select>
          )}
        </label>

        <button type="button" className="cs-btn cs-btn-primary" disabled={pending || !tool || !brief.trim()} onClick={prepare}>
          {pending ? <Loader2 size={16} className="pe-spin" /> : <Sparkles size={16} />} Prepare it for me
        </button>
        {error && <p className="cs-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}

        {pack && (
          <div style={{ marginTop: 18 }}>
            <div className="cs-between" style={{ marginBottom: 8 }}>
              <strong>Copy this into {tools.find((t) => t.id === tool)?.name}</strong>
              <div className="cs-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="cs-btn cs-btn-ghost cs-btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(pack.text).catch(() => undefined);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                </button>
                {pack.url && (
                  <a className="cs-btn cs-btn-lime cs-btn-sm" href={pack.url} target="_blank" rel="noreferrer">
                    Open {tools.find((t) => t.id === tool)?.name} <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
            <textarea className="cs-textarea" readOnly rows={10} value={pack.text} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} aria-label="Prepared prompt" />

            <div style={{ marginTop: 18 }}>
              <span className="cs-label">Bring the answer back</span>
              <textarea className="cs-textarea" rows={5} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Paste what your tool gave you — Skink will remember it and keep going." maxLength={4000} />
              <div className="cs-row" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="cs-btn cs-btn-primary"
                  disabled={pending || !result.trim()}
                  onClick={() =>
                    start(async () => {
                      const r = await saveResultAction({ taskId: task, toolId: tool, title: brief.slice(0, 60), result });
                      if (!r.ok) setError(r.error ?? "Couldn't save that.");
                      else {
                        setFiled(true);
                        setResult("");
                      }
                    })
                  }
                >
                  Save it to my brand
                </button>
                {filed && (
                  <span className="cs-row" style={{ gap: 8 }}>
                    <span className="cs-badge cs-badge-green"><Check size={12} /> Saved</span>
                    <Link href="/studio/skink" className="cs-link">Keep going with Skink <ArrowRight size={14} /></Link>
                  </span>
                )}
              </div>
              {task === "artwork" && (
                <p className="cs-muted" style={{ fontSize: 13, marginTop: 10 }}>
                  Made an image? Upload the PNG in the Studio&apos;s Uploads panel and use it on any product.{" "}
                  <Link href="/studio/catalog" className="cs-link">Open the catalog →</Link>
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
