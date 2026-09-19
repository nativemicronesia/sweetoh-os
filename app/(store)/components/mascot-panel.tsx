"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { askSkink } from "@/app/(creator)/studio/actions/skink";
import { RichText } from "@/app/(creator)/studio/components/rich-text";
import { MascotCharacter } from "./mascot-character";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = ["How does print-on-demand work?", "Can I sell my own designs?", "What's your shipping like?"];

export function MascotPanel({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    const history = turns;
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    startTransition(async () => {
      const result = await askSkink({ message, history, threadId });
      if (!result.ok) {
        setError({ text: result.error, code: result.code });
        return;
      }
      if (result.threadId) setThreadId(result.threadId);
      setTurns((prev) => [...prev, { role: "assistant", content: result.reply }]);
    });
  }

  return (
    <div
      className="flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
      style={{ borderColor: "#e9e2d3", color: "#17201b" }}
      role="dialog"
      aria-label="Skink — Sweet'Oh AI"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: "linear-gradient(135deg, #133f28, #2e8b4f)", color: "white" }}>
        <div className="flex items-center gap-2">
          <MascotCharacter size={32} />
          <div>
            <div className="text-sm font-semibold leading-tight">Skink</div>
            <div className="text-[11px] leading-tight" style={{ color: "#cfe6c9" }}>Sweet&apos;Oh AI</div>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-xl leading-none opacity-80 hover:opacity-100">
          ×
        </button>
      </div>

      <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto p-3" style={{ background: "#fbf8f1" }} aria-live="polite">
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border bg-white px-3 py-2 text-sm" style={{ borderColor: "#e9e2d3" }}>
          Hafa adai, kaselehlie, ran allim! I&apos;m Skink. Ask me about our products — or about starting your own print-on-demand brand.
        </div>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-white px-3 py-1.5 text-xs hover:border-[#2e8b4f]" style={{ borderColor: "#e9e2d3" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, index) => (
          <div
            key={index}
            className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${turn.role === "user" ? "ml-auto rounded-br-md text-white" : "rounded-tl-md border bg-white"}`}
            style={turn.role === "user" ? { background: "#133f28" } : { borderColor: "#e9e2d3" }}
          >
            {turn.role === "user" ? turn.content : <RichText text={turn.content} />}
          </div>
        ))}
        {pending && <div className="max-w-[88%] rounded-2xl rounded-tl-md border bg-white px-3 py-2 text-sm text-neutral-500" style={{ borderColor: "#e9e2d3" }}>Skink is thinking…</div>}
        {error && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ background: "#ffe6de", color: "#8c2f14" }}>
            {error.text}{" "}
            {error.code === "limit" && <Link href="/studio/join" className="font-semibold underline">Create a free account</Link>}
          </p>
        )}
      </div>

      <form
        className="flex gap-2 border-t p-3"
        style={{ borderColor: "#e9e2d3" }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
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
