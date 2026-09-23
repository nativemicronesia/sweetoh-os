"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";

/**
 * Sweet'Oh AI (Skink) for the partner — persistent chat bar — docked above the workspace in the partner
 * layout, so its conversation survives navigating between Overview, Create,
 * Review, and Orders.
 *
 * It talks to /api/studio-chat/stream (SSE); tool results arrive as their own
 * events and render as confirmation cards rather than raw JSON, so the
 * operator can see that telling it to do something actually did it. Any write
 * triggers router.refresh() so the workspace underneath reflects the change.
 */

type ChatTurn = { role: "user" | "assistant"; content: string };

type ToolCard = { name: string; ok: boolean; summary: string };

type LogEntry =
  | { kind: "user"; id: string; content: string }
  | { kind: "assistant"; id: string; content: string }
  | { kind: "tool"; id: string; card: ToolCard }
  | { kind: "error"; id: string; content: string };

const WRITE_TOOLS = new Set([
  "remember",
  "forget",
  "create_draft_from_text",
  "publish_draft",
  "reject_draft",
  "update_order_status",
]);

const SUGGESTIONS = [
  "What's waiting on me?",
  "Show me today's orders",
  "What should I price a hoodie at?",
  "What's selling in island designs right now?",
];

let entrySeq = 0;
function nextId(): string {
  entrySeq += 1;
  return `entry-${entrySeq}`;
}

export function StudioChat({ panel = false }: { panel?: boolean } = {}) {
  const router = useRouter();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(panel);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, open]);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || pending) return;

      const history: ChatTurn[] = log
        .filter(
          (entry): entry is Extract<LogEntry, { kind: "user" | "assistant" }> =>
            entry.kind === "user" || entry.kind === "assistant",
        )
        .map((entry) => ({ role: entry.kind, content: entry.content }));

      setInput("");
      setOpen(true);
      setPending(true);
      setLog((prev) => [...prev, { kind: "user", id: nextId(), content: message }]);

      const assistantId = nextId();
      let didWrite = false;
      let sawText = false;

      const appendAssistant = (delta: string) => {
        setLog((prev) => {
          const existing = prev.find((entry) => entry.id === assistantId);
          if (!existing) {
            return [
              ...prev,
              { kind: "assistant", id: assistantId, content: delta },
            ];
          }
          return prev.map((entry) =>
            entry.id === assistantId && entry.kind === "assistant"
              ? { ...entry, content: entry.content + delta }
              : entry,
          );
        });
      };

      try {
        const response = await fetch("/api/studio-chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history }),
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error ?? "Sweet'Oh AI is unavailable right now.",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Minimal SSE frame parser — frames are separated by a blank line.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let split = buffer.indexOf("\n\n");
          while (split !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            split = buffer.indexOf("\n\n");

            const eventLine = frame
              .split("\n")
              .find((line) => line.startsWith("event: "));
            const dataLine = frame
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!eventLine || !dataLine) continue;

            const event = eventLine.slice(7).trim();
            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(dataLine.slice(6));
            } catch {
              continue;
            }

            if (event === "tool") {
              const card = payload as unknown as ToolCard;
              if (WRITE_TOOLS.has(card.name) && card.ok) didWrite = true;
              setLog((prev) => [...prev, { kind: "tool", id: nextId(), card }]);
            } else if (event === "delta") {
              sawText = true;
              appendAssistant(String(payload.delta ?? ""));
            } else if (event === "done") {
              const text = String(payload.text ?? "");
              if (!sawText && text) appendAssistant(text);
            } else if (event === "error") {
              setLog((prev) => [
                ...prev,
                {
                  kind: "error",
                  id: nextId(),
                  content: String(payload.error ?? "Something went wrong."),
                },
              ]);
            }
          }
        }
      } catch (error) {
        setLog((prev) => [
          ...prev,
          {
            kind: "error",
            id: nextId(),
            content:
              error instanceof Error
                ? error.message
                : "Sweet'Oh AI is unavailable right now.",
          },
        ]);
      } finally {
        setPending(false);
        if (didWrite) router.refresh();
      }
    },
    [log, pending, router],
  );

  return (
    <div
      className={panel ? "studio-chat studio-chat-panel" : "studio-chat border-b"}
      style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
    >
      {open ? (
        <div
          ref={logRef}
          className="max-h-72 space-y-2 overflow-y-auto px-4 pt-4"
          aria-live="polite"
        >
          {log.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
              Your shop, your memory, your research — ask for anything you can click, or anything you want to figure out.
            </p>
          ) : null}

          {log.map((entry) => {
            if (entry.kind === "user") {
              return (
                <p
                  key={entry.id}
                  className="ml-auto max-w-[80%] rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: "var(--so-surface)",
                    color: "var(--so-cream)",
                  }}
                >
                  {entry.content}
                </p>
              );
            }

            if (entry.kind === "assistant") {
              return (
                <p
                  key={entry.id}
                  className="max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm"
                  style={{
                    background: "var(--so-black)",
                    color: "var(--so-cream)",
                  }}
                >
                  {entry.content}
                </p>
              );
            }

            if (entry.kind === "tool") {
              return (
                <p
                  key={entry.id}
                  className="flex max-w-[85%] items-start gap-2 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: entry.card.ok
                      ? "var(--so-gold-dim)"
                      : "var(--so-rose-dim)",
                    background: entry.card.ok
                      ? "rgba(201,168,76,0.13)"
                      : "rgba(196,103,122,0.14)",
                    color: "var(--so-cream)",
                  }}
                >
                  <span
                    style={{
                      color: entry.card.ok
                        ? "var(--so-gold)"
                        : "var(--so-rose)",
                    }}
                  >
                    {entry.card.ok ? "✓" : "✗"}
                  </span>
                  <span>{entry.card.summary}</span>
                </p>
              );
            }

            return (
              <p
                key={entry.id}
                className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                style={{
                  background: "rgba(196,103,122,0.16)",
                  color: "var(--so-cream)",
                }}
                role="alert"
              >
                {entry.content}
              </p>
            );
          })}

          {pending ? (
            <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
              Working…
            </p>
          ) : null}

          {log.length === 0 ? (
            <div className="flex flex-wrap gap-2 pb-1">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: "var(--so-border)",
                    color: "var(--so-cream-dim)",
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        className="flex items-center gap-2 px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <span
          className="flex shrink-0 items-center gap-2 text-xs font-medium"
          style={{ color: "var(--so-gold)" }}
        >
          <MascotCharacter size={26} />
          <span className="hidden sm:inline">Sweet&apos;Oh AI</span>
        </span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ask for anything — “what's waiting on me?”"
          aria-label="Ask Sweet'Oh AI"
          className="flex-1 rounded-full border px-4 py-2 text-sm outline-none"
          style={{
            borderColor: "var(--so-border)",
            background: "var(--so-black)",
            color: "var(--so-cream)",
          }}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
        >
          {pending ? "…" : "Send"}
        </button>
        {log.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-full border px-3 py-2 text-xs"
            style={{
              borderColor: "var(--so-border)",
              color: "var(--so-cream-dim)",
            }}
          >
            {open ? "Hide" : "Show"}
          </button>
        ) : null}
      </form>
    </div>
  );
}
