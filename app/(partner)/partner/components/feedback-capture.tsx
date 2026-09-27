"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { submitPartnerFeedbackAction } from "../actions/captures";

export function FeedbackCapture() {
  const path = usePathname();
  const search = useSearchParams();
  const notice = search.get("feedback");
  return <>
    <details className="pf-feedback-details" open={notice === "sent" || notice === "error"}>
      <summary className="pf-btn pf-btn-ghost" aria-label="Send feedback"><MessageSquareText size={16} /><span className="pf-hide-sm">Feedback</span></summary>
      <div role="dialog" aria-label="Share feedback" className="pf-feedback-popover">
      <div className="pf-feedback-head"><strong>Share feedback</strong><span>✦</span></div>
      <p>Report a problem, friction, missing capability, or idea. This goes to the improvement inbox; it is not an AI chat.</p>
      <form action={submitPartnerFeedbackAction}>
        <input type="hidden" name="pagePath" value={path} />
        <label>Type<select name="category" defaultValue="idea"><option value="problem">Problem</option><option value="friction">Something felt difficult</option><option value="missing_capability">Missing capability</option><option value="idea">Idea</option></select></label>
        <label htmlFor="partner-feedback-note">Your note</label><textarea id="partner-feedback-note" name="message" aria-label="Your note" required minLength={3} maxLength={3000} rows={4} placeholder="What happened or what would help?" />
        <label>Workflow context (optional)<input name="workflowContext" maxLength={500} placeholder="For example: editing a product design" /></label>
        <small>Current page is attached automatically: {path}</small>
        <button className="pf-btn pf-btn-primary">Send feedback</button>
        {notice === "sent" && <p role="status">Sent to the improvement inbox. No AI was used.</p>}
        {notice === "error" && <p role="alert">{search.get("feedbackMessage") ?? "Couldn’t save that. Please try again."}</p>}
      </form>
      </div>
    </details>
  </>;
}
