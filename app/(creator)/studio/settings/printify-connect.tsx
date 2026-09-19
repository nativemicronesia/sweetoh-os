"use client";

import { useState, useTransition } from "react";
import { choosePrintifyShopAction, connectPrintifyAction, disconnectPrintifyAction } from "../actions/publish";

export function PrintifyConnect({ connected, shopTitle, shopChosen }: { connected: boolean; shopTitle: string | null; shopChosen: boolean }) {
  const [shops, setShops] = useState<{ id: number; title: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (connected && shopChosen && !shops) {
    return (
      <div className="cs-between">
        <p style={{ margin: 0 }}>Products you send go to <strong>{shopTitle}</strong>.</p>
        <div className="cs-row">
          <form action={disconnectPrintifyAction}><button className="cs-btn cs-btn-quiet cs-btn-sm">Disconnect</button></form>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-stack" style={{ gap: 12 }}>
      {shops && shops.length === 0 && <p className="cs-alert">Your Printify account has no stores yet. Add one in Printify (it can be a “manual” store), then connect again.</p>}
      {shops && shops.length > 1 && (
        <div>
          <p className="cs-label">Which store should Sweet&apos;Oh send products to?</p>
          <div className="cs-row">
            {shops.map((s) => (
              <button key={s.id} type="button" className="cs-btn cs-btn-ghost" disabled={pending} onClick={() => start(async () => { const r = await choosePrintifyShopAction(String(s.id)); if (!r.ok) setError(r.error); else setShops(null); })}>
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}
      {!shops && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const r = await connectPrintifyAction(form);
              if (!r.ok) setError(r.error);
              else setShops(r.shops.length === 1 ? null : r.shops);
            });
          }}
        >
          <label className="cs-field">
            <span className="cs-label">Printify API token</span>
            <input name="token" className="cs-input" type="password" autoComplete="off" placeholder="Paste your token" required minLength={20} />
          </label>
          <button className="cs-btn cs-btn-primary" disabled={pending}>{pending ? "Checking with Printify…" : "Connect Printify"}</button>
        </form>
      )}
      {error && <p className="cs-alert" role="alert">{error}</p>}
      {connected && !shopChosen && !shops && <p className="cs-muted" style={{ fontSize: 14 }}>Connected — reconnect to choose which store to use.</p>}
    </div>
  );
}
