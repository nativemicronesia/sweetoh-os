"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MascotCharacter } from "./mascot-character";

type HelpLink = { label: string; href: string };
type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; links: HelpLink[] };

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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

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
    <div
      className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
      style={{ borderColor: "#e9e2d3", color: "#17201b" }}
      role="dialog"
      aria-label="Skink — shop helper"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: "linear-gradient(135deg, #133f28, #2e8b4f)", color: "white" }}>
        <div className="flex items-center gap-2">
          <MascotCharacter size={32} />
          <div>
            <div className="text-sm font-semibold leading-tight">Skink</div>
            <div className="text-[11px] leading-tight" style={{ color: "#cfe6c9" }}>Sweet&apos;Oh shop helper</div>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-xl leading-none opacity-80 hover:opacity-100">
          ×
        </button>
      </div>

      <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-3" style={{ background: "#fbf8f1" }} aria-live="polite">
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border bg-white px-3 py-2 text-sm" style={{ borderColor: "#e9e2d3" }}>
          Hafa adai, kaselehlie, ran allim! I&apos;m Skink. I can help you find something, explain shipping and returns, check on your orders and custom requests, or get a request to the shop.
        </div>
        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <div key={index} className="ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3 py-2 text-sm text-white" style={{ background: "#133f28" }}>
              {turn.content}
            </div>
          ) : (
            <div key={index} className="max-w-[92%] space-y-2">
              <div className="whitespace-pre-line rounded-2xl rounded-tl-md border bg-white px-3 py-2 text-sm" style={{ borderColor: "#e9e2d3" }}>
                {turn.content}
              </div>
              {turn.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {turn.links.map((link) => {
                    const external = /^https?:/.test(link.href);
                    return (
                      <Link
                        key={link.href + link.label}
                        href={link.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        onClick={external ? undefined : onClose}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: "#2e8b4f" }}
                      >
                        {link.label} →
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ),
        )}
        {pending && (
          <div className="max-w-[88%] rounded-2xl rounded-tl-md border bg-white px-3 py-2 text-sm text-neutral-500" style={{ borderColor: "#e9e2d3" }}>
            …
          </div>
        )}
        {!pending && (
          <div className="flex flex-wrap gap-2">
            {chips.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border bg-white px-3 py-1.5 text-xs hover:border-[#2e8b4f]" style={{ borderColor: "#e9e2d3" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ background: "#ffe6de", color: "#8c2f14" }}>
            {error}
          </p>
        )}
      </div>

      <form
        className="flex gap-2 border-t p-3"
        style={{ borderColor: "#e9e2d3" }}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={500}
          placeholder="Ask Skink…"
          aria-label="Message Skink"
          className="flex-1 rounded-xl border bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#2e8b4f]"
          style={{ borderColor: "#e9e2d3" }}
        />
        <button type="submit" disabled={pending || !input.trim()} className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#133f28" }}>
          Send
        </button>
      </form>
    </div>
  );
}
