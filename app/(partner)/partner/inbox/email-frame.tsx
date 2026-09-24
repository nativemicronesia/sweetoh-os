"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows an email's HTML in a sandboxed iframe: no scripts ever run, links open
 * in a new tab, and the frame grows to fit the message so there's no inner
 * scrollbar. Same-origin is allowed only so the height can be measured —
 * safe because scripts are blocked.
 */
export function EmailFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(160);

  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'">
<style>html,body{margin:0;padding:0;background:transparent;color:#241d14;font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;word-wrap:break-word;overflow-wrap:anywhere}
img{max-width:100%;height:auto}table{max-width:100%}a{color:#1f6f6b}blockquote{margin:8px 0;padding-left:12px;border-left:3px solid #e8dfcd;color:#786a56}</style>
</head><body>${html}</body></html>`;

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const measure = () => {
      const body = frame.contentDocument?.body;
      if (body) setHeight(Math.min(Math.max(body.scrollHeight + 8, 60), 6000));
    };
    frame.addEventListener("load", measure);
    const timer = window.setInterval(measure, 600);
    const stop = window.setTimeout(() => window.clearInterval(timer), 6000);
    return () => {
      frame.removeEventListener("load", measure);
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title="Email"
      className="ib-frame"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      style={{ height }}
    />
  );
}
