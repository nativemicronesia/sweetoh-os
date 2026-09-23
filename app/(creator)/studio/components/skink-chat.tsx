"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Brain, Check, Copy, Search, Sparkles, Lightbulb, Package, Square, Wrench } from "lucide-react";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import type { AiLevel } from "@/lib/domains/creator/plans";
import type { SkinkEvent } from "@/lib/domains/skink/agent";
import { RichText } from "./rich-text";

export type ChatTurn = { role: "user" | "assistant"; content: string; events?: SkinkEvent[] };

const EVENT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  remember: Brain,
  forget: Brain,
  research: Search,
  think_it_through: Lightbulb,
  find_products: Package,
  prepare_handoff: Wrench,
};

const LEVELS: { id: AiLevel; label: string; hint: string }[] = [
  { id: "light", label: "Quick", hint: "Fast answers, fewest credits" },
  { id: "smart", label: "Smart", hint: "Strategy and research on stronger models" },
  { id: "deep", label: "Deep", hint: "OpenAI's most capable model (Pro)" },
];

export function SkinkChat({
  initialTurns = [],
  threadId: initialThreadId = null,
  suggestions = [],
  levels,
  syncUrl = false,
  greeting,
  compact = false,
}: {
  initialTurns?: ChatTurn[];
  threadId?: string | null;
  suggestions?: string[];
  levels: AiLevel[];
  /** Keep ?thread= in the URL (the full Skink page). */
  syncUrl?: boolean;
  greeting: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [threadId, setThreadId] = useState(initialThreadId);
  const [input, setInput] = useState("");
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [level, setLevel] = useState<AiLevel>(levels.includes("smart") ? "smart" : "light");
  const [pending, setPending] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<SkinkEvent[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTurns(initialTurns);
    setThreadId(initialThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, streamed, pending]);

  useEffect(() => () => abort.current?.abort(), []);

  // Esc stops a running answer, like every other AI app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abort.current) abort.current.abort();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const send = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim();
      if (!message || pending) return;
      setError(null);
      setInput("");
      setStreamed("");
      setLiveEvents([]);
      setStatus("Thinking…");
      setTurns((t) => [...t, { role: "user", content: message }]);
      setPending(true);
      const controller = new AbortController();
      abort.current = controller;
      let answer = "";
      const events: SkinkEvent[] = [];
      try {
        const res = await fetch("/api/skink/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, threadId, level }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          setError({ text: body.error ?? "Skink couldn't answer just now.", code: body.code });
          setStatus(null);
          setPending(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const event = /^event: (.+)$/m.exec(chunk)?.[1];
            const payload = /^data: (.+)$/m.exec(chunk)?.[1];
            if (!event || !payload) continue;
            const data = JSON.parse(payload);
            if (event === "delta") {
              answer += data.delta;
              setStreamed(answer);
              setStatus(null);
            } else if (event === "status") {
              setStatus(data.status);
            } else if (event === "event") {
              events.push(data);
              setLiveEvents([...events]);
            } else if (event === "done") {
              answer = data.reply || answer;
              if (!threadId && data.threadId) {
                setThreadId(data.threadId);
                if (syncUrl) router.replace(`/studio/skink?thread=${data.threadId}`, { scroll: false });
              }
            } else if (event === "error") {
              setError({ text: data.error, code: data.code });
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError({ text: "Connection dropped. Try again." });
      } finally {
        abort.current = null;
        setStatus(null);
        setPending(false);
        if (answer.trim()) setTurns((t) => [...t, { role: "assistant", content: answer, events }]);
        setStreamed("");
        setLiveEvents([]);
        router.refresh();
      }
    },
    [input, pending, threadId, level, syncUrl, router],
  );

  const eventChips = (items: SkinkEvent[]) => (
    <div className="cs-events">
      {items.map((e, k) => {
        const Icon = EVENT_ICON[e.tool] ?? Sparkles;
        return e.href ? (
          <Link key={k} href={e.href} className="cs-event">
            <Icon size={12} /> {e.summary}
          </Link>
        ) : (
          <span key={k} className="cs-event">
            <Icon size={12} /> {e.summary}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="cs-chat" style={{ height: "100%" }}>
      <div className="cs-chat-log" ref={logRef} style={compact ? { maxHeight: 420, minHeight: 220 } : undefined} aria-live="polite">
        <div className="cs-msg cs-msg-skink">
          <MascotCharacter size={34} />
          <div className="cs-bubble">
            <RichText text={greeting} />
          </div>
        </div>
        {turns.length === 0 && suggestions.length > 0 && (
          <div className="cs-suggest" style={{ paddingLeft: 44 }}>
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="cs-msg cs-msg-user">
              <div className="cs-bubble">{t.content}</div>
            </div>
          ) : (
            <div key={i} className="cs-msg cs-msg-skink">
              <MascotCharacter size={34} />
              <div style={{ minWidth: 0 }}>
                <div className="cs-bubble">
                  <RichText text={t.content} />
                </div>
                {t.events && t.events.length > 0 && eventChips(t.events)}
                <button
                  type="button"
                  className="cs-copy"
                  aria-label="Copy this answer"
                  onClick={async () => {
                    await navigator.clipboard.writeText(t.content).catch(() => undefined);
                    setCopied(i);
                    setTimeout(() => setCopied((c) => (c === i ? null : c)), 2000);
                  }}
                >
                  {copied === i ? <Check size={13} /> : <Copy size={13} />} {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ),
        )}
        {(streamed || pending) && (
          <div className="cs-msg cs-msg-skink">
            <MascotCharacter size={34} />
            <div style={{ minWidth: 0 }}>
              {streamed ? (
                <div className="cs-bubble">
                  <RichText text={streamed} />
                  <span className="cs-caret" aria-hidden />
                </div>
              ) : (
                <div className="cs-bubble cs-typing" aria-label={status ?? "Skink is thinking"}>
                  <i />
                  <i />
                  <i />
                </div>
              )}
              {liveEvents.length > 0 && eventChips(liveEvents)}
              {status && <p className="cs-status" role="status">{status}</p>}
            </div>
          </div>
        )}
        {error && (
          <div className="cs-alert" role="alert">
            {error.text}{" "}
            {error.code === "credits" && (
              <Link href="/studio/plans" className="cs-link">
                See plans →
              </Link>
            )}
          </div>
        )}
      </div>
      <form
        className="cs-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            ref={boxRef}
            value={input}
            rows={1}
            placeholder="Ask Skink anything…"
            aria-label="Message Skink"
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
            }}
            disabled={false}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="cs-between" style={{ gap: 8 }}>
            <div className="cs-levels" role="group" aria-label="How hard Skink thinks">
              {LEVELS.map((l) => {
                const allowed = levels.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={level === l.id}
                    disabled={!allowed}
                    title={allowed ? l.hint : `${l.hint} — upgrade to use`}
                    onClick={() => setLevel(l.id)}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            <span className="cs-muted cs-hint" style={{ fontSize: 12 }}>
              Enter to send · Shift+Enter for a new line
            </span>
          </div>
        </div>
        {pending ? (
          <button type="button" className="cs-btn cs-btn-ghost" style={{ width: 46, padding: 0, height: 46 }} onClick={() => abort.current?.abort()} aria-label="Stop">
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" className="cs-btn cs-btn-primary" style={{ width: 46, padding: 0, height: 46 }} disabled={!input.trim()} aria-label="Send">
            <ArrowUp size={20} />
          </button>
        )}
      </form>
    </div>
  );
}
