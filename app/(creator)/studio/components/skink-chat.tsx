"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Brain, Search, Sparkles, Lightbulb, Package } from "lucide-react";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import type { AiLevel } from "@/lib/domains/creator/plans";
import type { SkinkEvent } from "@/lib/domains/skink/agent";
import { sendSkinkMessage } from "../actions/skink";
import { RichText } from "./rich-text";

export type ChatTurn = { role: "user" | "assistant"; content: string; events?: SkinkEvent[] };

const EVENT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  remember: Brain,
  forget: Brain,
  research: Search,
  think_it_through: Lightbulb,
  find_products: Package,
};

const LEVELS: { id: AiLevel; label: string; hint: string }[] = [
  { id: "light", label: "Quick", hint: "Fast answers, fewest credits" },
  { id: "smart", label: "Smart", hint: "Strategy and research on stronger models" },
  { id: "deep", label: "Deep", hint: "Top models from Anthropic, OpenAI and Google (Pro)" },
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
  const [pending, start] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTurns(initialTurns);
    setThreadId(initialThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || pending) return;
    setError(null);
    setInput("");
    setTurns((t) => [...t, { role: "user", content: message }]);
    start(async () => {
      const result = await sendSkinkMessage({ threadId, message, level });
      if (!result.ok) {
        setError({ text: result.error, code: result.code });
        return;
      }
      setTurns((t) => [...t, { role: "assistant", content: result.reply, events: result.events }]);
      if (!threadId) {
        setThreadId(result.threadId);
        if (syncUrl) router.replace(`/studio/skink?thread=${result.threadId}`, { scroll: false });
      }
      router.refresh();
    });
  }

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
              <button key={s} type="button" onClick={() => send(s)}>
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
                {t.events && t.events.length > 0 && (
                  <div className="cs-events">
                    {t.events.map((e, k) => {
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
                )}
              </div>
            </div>
          ),
        )}
        {pending && (
          <div className="cs-msg cs-msg-skink">
            <MascotCharacter size={34} />
            <div className="cs-bubble cs-typing" aria-label="Skink is thinking">
              <i />
              <i />
              <i />
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
          send();
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            ref={boxRef}
            value={input}
            rows={1}
            placeholder="Ask Skink anything — niches, designs, pricing, Printify…"
            aria-label="Message Skink"
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
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
            <span className="cs-muted" style={{ fontSize: 12 }}>
              Enter to send · Shift+Enter for a new line
            </span>
          </div>
        </div>
        <button type="submit" className="cs-btn cs-btn-primary" style={{ width: 46, padding: 0, height: 46 }} disabled={pending || !input.trim()} aria-label="Send">
          <ArrowUp size={20} />
        </button>
      </form>
    </div>
  );
}
