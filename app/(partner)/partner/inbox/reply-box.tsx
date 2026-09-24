"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { draftReplyAction, sendReplyAction, type InboxFormState } from "../actions/inbox";

/** One-tap starts she can edit — the things a print shop says every day. */
const QUICK = [
  { label: "Thanks!", text: "Thank you so much for reaching out! " },
  { label: "On the press", text: "Good news — your order is on the press now. I'll let you know as soon as it ships. " },
  { label: "Shipped", text: "Your order is on its way! " },
  { label: "Ready for pickup", text: "Your order is ready for pickup! " },
  { label: "Need details", text: "I'd love to make this for you. Could you send me the sizes, colors and quantity you need, and your date? " },
  { label: "Quote", text: "Here's what that would cost: " },
];

export function ReplyBox({ threadId, firstName, canSend }: { threadId: string; firstName: string | null; canSend: boolean }) {
  const [state, send, sending] = useActionState<InboxFormState, FormData>(sendReplyAction, null);
  const [draftState, draft, drafting] = useActionState<InboxFormState, FormData>(draftReplyAction, null);
  const [body, setBody] = useState("");
  const [hint, setHint] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const greeting = firstName ? `Hi ${firstName},\n\n` : "Hi,\n\n";

  useEffect(() => {
    if (state?.sent) setBody("");
  }, [state]);
  useEffect(() => {
    if (draftState?.draft) setBody(draftState.draft);
  }, [draftState]);

  const add = (text: string) => {
    setBody((current) => (current.trim() ? `${current.trimEnd()} ${text}` : greeting + text));
    requestAnimationFrame(() => area.current?.focus());
  };

  return (
    <div className="ib-reply">
      <div className="ib-quick" aria-label="Quick starts">
        {QUICK.map((q) => (
          <button key={q.label} type="button" onClick={() => add(q.text)}>
            {q.label}
          </button>
        ))}
      </div>

      <form action={draft} className="ib-ai">
        <input type="hidden" name="threadId" value={threadId} />
        <Sparkles size={15} aria-hidden />
        <input
          name="hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Tell Sweet'Oh AI what to say (optional) — e.g. “yes, $18 a shirt, 2 weeks”"
          aria-label="What the reply should say"
        />
        <button type="submit" disabled={drafting}>
          {drafting ? <Loader2 size={14} className="pe-spin" /> : null}
          {drafting ? "Writing…" : "Draft it"}
        </button>
      </form>
      {draftState?.error && <p className="ib-error">{draftState.error}</p>}

      <form action={send} className="ib-compose">
        <input type="hidden" name="threadId" value={threadId} />
        <textarea
          ref={area}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={canSend ? "Write your reply…" : "Replies switch on once the shop's sending address is set."}
          rows={6}
          required
          disabled={!canSend}
        />
        <div className="ib-compose-foot">
          <span>
            {state?.error ? <span className="ib-error">{state.error}</span> : state?.sent ? "Sent ✓" : "Sends from your shop address, not your Gmail."}
          </span>
          <button type="submit" className="pf-btn pf-btn-primary" disabled={sending || !canSend || !body.trim()}>
            {sending ? <Loader2 size={15} className="pe-spin" /> : <Send size={15} />}
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function NewMessageForm({ canSend, to }: { canSend: boolean; to?: string }) {
  const [state, send, sending] = useActionState<InboxFormState, FormData>(sendReplyAction, null);
  return (
    <form action={send} className="ib-new">
      <label>
        To
        <input name="to" type="email" defaultValue={to} placeholder="customer@example.com" required />
      </label>
      <label>
        Subject
        <input name="subject" placeholder="Your Sweet'Oh order" required />
      </label>
      <label>
        Message
        <textarea name="body" rows={10} placeholder="Hi…" required disabled={!canSend} />
      </label>
      <div className="ib-compose-foot">
        <span>{state?.error ? <span className="ib-error">{state.error}</span> : "Sends from your shop address."}</span>
        <button type="submit" className="pf-btn pf-btn-primary" disabled={sending || !canSend}>
          {sending ? <Loader2 size={15} className="pe-spin" /> : <Send size={15} />}
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
