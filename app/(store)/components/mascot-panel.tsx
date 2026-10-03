"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SkinkAvatar } from "./skink-avatar";
import type { SkinkMood } from "./skink-art";

type HelpLink = { label: string; href: string };
type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; links: HelpLink[] };

const GREETING = "Håfa adai, Alii, Kamorale, Iakwe, Ekamawir omo, Mauri! I'm Skink. Ask me about shipping, an order, a custom idea, or where to start.";
const STARTERS = ["Track my order", "My custom requests", "Shipping", "Custom order", "What do you sell?"];

/**
 * Skink, the shop helper. Answers come from /api/skink/help — the shop's own
 * FAQ, products and (for signed-in customers) their orders. No AI model, so
 * it's instant and free to run.
 */
export function MascotPanel({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [chips, setChips] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prog, setProg] = useState({ text: "", n: 0 });
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Skink says one thing at a time: the latest answer types itself out beside the avatar.
  const last = [...turns].reverse().find((t) => t.role === "assistant");
  const lastUser = turns.length && turns[turns.length - 1].role === "user" ? turns[turns.length - 1] : null;
  const text = last ? last.content : GREETING;
  const shown = prog.text === text ? prog.n : reduced ? text.length : 0;
  useEffect(() => {
    if (shown >= text.length) return;
    const t = setTimeout(() => setProg({ text, n: Math.min(text.length, shown + 2) }), 22);
    return () => clearTimeout(t);
  }, [shown, text]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const talking = !pending && shown < text.length;
  const mood: SkinkMood = pending ? "thinking" : talking ? "speaking" : focused && input ? "listening" : "idle";

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setPending(true);
    try {
      const res = await fetch("/api/skink/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.text) {
        setError(data?.error ?? "Skink couldn't answer just now.");
        return;
      }
      setTurns((prev) => [...prev, { role: "assistant", content: data.text, links: data.links ?? [] }]);
      setChips(data.chips?.length ? data.chips : STARTERS);
    } catch {
      setError("Connection dropped. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sx-skink-stage" role="dialog" aria-label="Skink, the shop helper">
      <button type="button" className="sx-skink-scrim" onClick={onClose} aria-label="Close Skink" tabIndex={-1} />
      <div className="sx-skink-card">
        <button type="button" onClick={onClose} aria-label="Close Skink" className="sx-skink-close">×</button>
        <div className="sx-skink-figure"><SkinkAvatar size={210} mood={mood} perch /></div>
        <div className="sx-skink-talk">
          {lastUser && !last?.content?.length ? null : null}
          {lastUser && <p className="sx-skink-you">{lastUser.content}</p>}
          <div className="sx-skink-bubble" aria-live="polite" aria-atomic="true">
            {pending ? <span className="sx-skink-dots" aria-label="Skink is thinking"><i /><i /><i /></span> : <p>{text.slice(0, shown)}{talking && <span className="sx-skink-caret" aria-hidden />}</p>}
            {!pending && last && shown >= text.length && last.links.length > 0 && (
              <div className="sx-skink-links">
                {last.links.map((link) => {
                  const external = /^https?:/.test(link.href);
                  return (
                    <Link key={link.href + link.label} href={link.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={external ? undefined : onClose} className="sx-skink-link">{link.label} →</Link>
                  );
                })}
              </div>
            )}
          </div>
          {error && <p role="alert" className="so-alert">{error}</p>}
          {!pending && (
            <div className="sx-skink-chips">
              {chips.map((c) => <button key={c} type="button" className="sx-chip" onClick={() => void send(c)}>{c}</button>)}
            </div>
          )}
          <form className="sx-skink-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} maxLength={500} placeholder="Ask Skink anything" aria-label="Message Skink" className="so-input" style={{ marginTop: 0 }} />
            <button type="submit" disabled={pending || !input.trim()} className="so-btn-primary">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
