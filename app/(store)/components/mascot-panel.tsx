"use client";

import { useState, useTransition } from "react";
import { askMascot, type MascotChatTurn } from "../actions/mascot-chat";
import { MascotCharacter } from "./mascot-character";

export function MascotPanel({ onClose }: { onClose: () => void }) {
  const [turns, setTurns] = useState<MascotChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const message = input.trim();
    if (!message || pending) return;

    setError(null);
    setInput("");
    const history = turns;
    setTurns((prev) => [...prev, { role: "user", content: message }]);

    startTransition(async () => {
      const result = await askMascot({ message, history });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTurns((prev) => [...prev, { role: "assistant", content: result.reply }]);
    });
  }

  return (
    <div
      className="flex h-[28rem] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-xl"
      style={{ borderColor: "var(--so-border)", background: "var(--so-cream)" }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div className="flex items-center gap-2">
          <MascotCharacter size={28} />
          <span className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
            Sweet&apos;Oh AI
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-lg leading-none opacity-70 hover:opacity-100"
          style={{ color: "var(--so-cream)" }}
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 && (
          <p className="text-xs text-neutral-600">
            Ask me about products, sizing, or shipping — I&apos;m happy to help.
          </p>
        )}
        {turns.map((turn, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              turn.role === "user"
                ? "ml-auto bg-[color:var(--so-dark)] text-[color:var(--so-cream)]"
                : "bg-white text-neutral-800"
            }`}
          >
            {turn.content}
          </div>
        ))}
        {pending && (
          <div className="max-w-[85%] rounded-xl bg-white px-3 py-2 text-sm text-neutral-500">
            Thinking…
          </div>
        )}
        {error && <p className="text-xs text-[color:var(--so-rose)]">{error}</p>}
      </div>

      <div className="flex gap-2 border-t p-3" style={{ borderColor: "var(--so-border)" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
          }}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
        />
        <button
          type="button"
          onClick={send}
          disabled={pending || !input.trim()}
          className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
