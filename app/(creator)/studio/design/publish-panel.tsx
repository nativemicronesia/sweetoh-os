"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, Loader2, Printer, Store, X } from "lucide-react";
import type { EditorPublishApi, PrintFile } from "@/app/(partner)/partner/canvas/product-editor";
import { preparePrintUploadsAction, requestPrintAction, sendToPrintifyAction } from "../actions/publish";

export type PublishContext = {
  printifyShop: string | null;
  acceptingRequests: boolean;
  canRequestPrint: boolean;
  planName: string;
};

async function uploadAll(items: { name: string; kind: "print" | "mockup"; blob: Blob }[]) {
  const prepared = await preparePrintUploadsAction(items.map((i) => ({ name: i.name, kind: i.kind, size: i.blob.size })));
  if (!prepared.ok) throw new Error(prepared.error);
  await Promise.all(
    prepared.uploads.map(async (u, i) => {
      const res = await fetch(u.url, { method: "PUT", body: items[i].blob, headers: { "Content-Type": "image/png", "x-upsert": "true" } });
      if (!res.ok) throw new Error("A file didn't upload. Check your connection and try again.");
    }),
  );
  return prepared.uploads.map((u) => u.assetId);
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export function makePublishPanel(ctx: PublishContext) {
  return function PublishPanel({ api }: { api: EditorPublishApi }) {
    const [tab, setTab] = useState<"printify" | "sweetoh" | "files">(ctx.printifyShop ? "printify" : "files");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);
    const [title, setTitle] = useState(api.name);
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("29.99");
    const [qty, setQty] = useState<Record<string, number>>({});
    const [shipTo, setShipTo] = useState("");
    const [note, setNote] = useState("");
    const colors = api.blank.variantOptions?.colors ?? [];
    const sizes = api.blank.variantOptions?.sizes ?? [];
    const lineKeys = (colors.length ? colors.map((c) => c.name) : [null]).flatMap((c) => (sizes.length ? sizes : [null]).map((s) => ({ color: c, size: s, key: `${c ?? ""}|${s ?? ""}` })));

    async function run(label: string, fn: () => Promise<void>) {
      setBusy(label);
      setError(null);
      api.setBusy(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      } finally {
        setBusy(null);
      }
    }

    async function prints(): Promise<PrintFile[]> {
      const files = await api.printFiles();
      if (!files.length) throw new Error("Add artwork or text inside a print area first.");
      return files;
    }

    const sendPrintify = () =>
      run("Exporting print files and sending to Printify…", async () => {
        const cents = Math.round(Number(price) * 100);
        if (!Number.isFinite(cents) || cents < 100) throw new Error("Set a retail price of at least $1.");
        const files = await prints();
        const ids = await uploadAll(files.map((f) => ({ name: `${f.surfaceName}`, kind: "print", blob: f.blob })));
        const result = await sendToPrintifyAction({
          blankId: api.blank.id,
          title,
          description,
          priceCents: cents,
          colors: colors.map((c) => c.name),
          sizes,
          prints: files.map((f, i) => ({ assetId: ids[i], position: f.position })),
        });
        if (!result.ok) throw new Error(result.error);
        setDone(`“${title}” is in ${result.shop} on Printify (printed by ${result.provider}). Open Printify to review mockups and publish it to Etsy, Shopify or your other sales channels.`);
      });

    const requestPrint = () =>
      run("Exporting print files and sending your request…", async () => {
        const lines = lineKeys.filter((l) => (qty[l.key] ?? 0) > 0).map((l) => ({ color: l.color, size: l.size, quantity: qty[l.key] }));
        if (!lines.length) throw new Error("Choose how many to print.");
        const files = await prints();
        const mock = await api.mockups();
        const ids = await uploadAll([{ name: api.name, kind: "mockup", blob: mock.front }, ...files.map((f) => ({ name: f.surfaceName, kind: "print" as const, blob: f.blob }))]);
        const result = await requestPrintAction({
          productName: title,
          mockupAssetId: ids[0],
          files: files.map((f, i) => ({ assetId: ids[i + 1], surface: f.surfaceName, position: f.position, width: f.width, height: f.height })),
          lines,
          note: note || null,
          shipTo,
          blueprintId: api.blank.catalogSource?.provider === "printify" ? api.blank.catalogSource.blueprintId ?? null : null,
          productLabel: [api.blank.catalogSource?.brand, api.blank.catalogSource?.model].filter(Boolean).join(" ") || api.blank.name,
        });
        if (!result.ok) throw new Error(result.error);
        setDone("Request sent to Sweet'Oh! You'll get a quote on your Print with Sweet'Oh page — nothing is charged until you accept it.");
      });

    const download = () =>
      run("Exporting print files…", async () => {
        const files = await prints();
        for (const f of files) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(f.blob);
          a.download = `${api.name}-${f.surfaceName}-print.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
        }
        setDone(`${files.length} print ${files.length === 1 ? "file" : "files"} downloaded — transparent PNGs ready for Printify, Printful or any printer.`);
      });

    const total = Object.values(qty).reduce((a, b) => a + (b || 0), 0);
    const cents = Math.round(Number(price) * 100) || 0;

    return (
      <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Sell it">
        <div className="pe-modal-card" style={{ width: "min(640px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto" }}>
          <div className="pe-modal-head">
            <h2>Sell it</h2>
            <button className="pe-icon-btn" onClick={api.close} aria-label="Close"><X size={18} /></button>
          </div>
          {done ? (
            <div style={{ padding: "8px 4px 4px", textAlign: "center" }}>
              <CheckCircle2 size={44} color="#2e8b4f" />
              <p style={{ fontSize: 16, margin: "12px auto 18px", maxWidth: 460 }}>{done}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {tab === "printify" && (
                  <a className="pe-btn pe-btn-primary" href="https://printify.com/app/products" target="_blank" rel="noreferrer">Open Printify <ExternalLink size={14} /></a>
                )}
                {tab === "sweetoh" && <Link className="pe-btn pe-btn-primary" href="/studio/requests">See my requests</Link>}
                <button className="pe-btn pe-btn-ghost" onClick={() => { setDone(null); api.close(); }}>Keep designing</button>
              </div>
            </div>
          ) : (
            <>
              <div role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
                {([
                  ["printify", Store, "Your Printify store"],
                  ["sweetoh", Printer, "Print with Sweet'Oh"],
                  ["files", Download, "Download files"],
                ] as const).map(([id, Icon, label]) => (
                  <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(null); }} className="pe-btn pe-btn-ghost" style={{ flexDirection: "column", height: "auto", padding: "12px 8px", gap: 6, borderWidth: tab === id ? 2 : 1, borderColor: tab === id ? "#2e8b4f" : undefined }}>
                    <Icon size={20} />
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </button>
                ))}
              </div>

              {(tab === "printify" || tab === "sweetoh") && (
                <label className="pe-field" style={{ display: "block", marginBottom: 12 }}>
                  <span className="pe-label">Product title</span>
                  <input className="pe-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                </label>
              )}

              {tab === "printify" && (
                ctx.printifyShop ? (
                  <div>
                    <label className="pe-field" style={{ display: "block", marginBottom: 12 }}>
                      <span className="pe-label">Description (optional)</span>
                      <textarea className="pe-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder="Tell shoppers what makes it special. Skink can help you write this." />
                    </label>
                    <label className="pe-field" style={{ display: "block", marginBottom: 6 }}>
                      <span className="pe-label">Retail price (USD)</span>
                      <input className="pe-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
                    </label>
                    <p className="pe-muted pe-small" style={{ marginBottom: 14 }}>
                      Printify charges you its base cost when a customer orders; you keep the difference. Bigger sizes add their upcharge automatically. {cents >= 100 && `Shoppers pay $${dollars(cents)}.`}
                    </p>
                    <p className="pe-muted pe-small" style={{ marginBottom: 14 }}>
                      {colors.length} {colors.length === 1 ? "color" : "colors"} · {sizes.length || "one"} {sizes.length === 1 ? "size" : "sizes"} → <strong>{ctx.printifyShop}</strong>
                    </p>
                    <button className="pe-btn pe-btn-primary pe-block" disabled={Boolean(busy) || title.trim().length < 3} onClick={sendPrintify}>
                      {busy ? <><Loader2 size={16} className="pe-spin" /> {busy}</> : <>Send to Printify</>}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <p style={{ marginBottom: 14 }}>Connect your own Printify account once, and every design can go straight into your store — then out to Etsy, Shopify, TikTok Shop and more.</p>
                    <Link href="/studio/settings" className="pe-btn pe-btn-primary">Connect Printify</Link>
                    <p className="pe-muted pe-small" style={{ marginTop: 10 }}>Your design is saved when you click Save design first.</p>
                  </div>
                )
              )}

              {tab === "sweetoh" && (
                !ctx.canRequestPrint ? (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <p style={{ marginBottom: 14 }}>Have the Sweet&apos;Oh shop print your order — great for events, family reunions, church groups and first inventory. Included with Creator and Pro.</p>
                    <Link href="/studio/plans" className="pe-btn pe-btn-primary">See plans</Link>
                  </div>
                ) : !ctx.acceptingRequests ? (
                  <p className="pe-muted">Sweet&apos;Oh isn&apos;t taking print requests right now — the shop is at capacity. Send it to your Printify store instead, or check back soon.</p>
                ) : (
                  <div>
                    <p className="pe-label">How many?</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, maxHeight: 220, overflowY: "auto", marginBottom: 12 }}>
                      {lineKeys.map((l) => (
                        <label key={l.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid #e2e7e3", borderRadius: 10, padding: "6px 10px", fontSize: 13 }}>
                          <span>{[l.color, l.size].filter(Boolean).join(" · ") || "Quantity"}</span>
                          <input type="number" min={0} max={500} value={qty[l.key] ?? ""} placeholder="0" onChange={(e) => setQty({ ...qty, [l.key]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })} style={{ width: 58 }} className="pe-input" aria-label={`Quantity ${l.key}`} />
                        </label>
                      ))}
                    </div>
                    <label className="pe-field" style={{ display: "block", marginBottom: 12 }}>
                      <span className="pe-label">Ship to</span>
                      <textarea className="pe-input" rows={3} value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder={"Name\nStreet, City, State ZIP\nPhone"} />
                    </label>
                    <label className="pe-field" style={{ display: "block", marginBottom: 12 }}>
                      <span className="pe-label">Anything Sweet&apos;Oh should know? (optional)</span>
                      <input className="pe-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Needed by a date, event, packaging…" />
                    </label>
                    <button className="pe-btn pe-btn-primary pe-block" disabled={Boolean(busy) || !total} onClick={requestPrint}>
                      {busy ? <><Loader2 size={16} className="pe-spin" /> {busy}</> : <>Request a quote for {total || ""} {total === 1 ? "piece" : "pieces"}</>}
                    </button>
                    <p className="pe-muted pe-small" style={{ marginTop: 8 }}>The Sweet&apos;Oh shop (Lacey, WA) reviews every request and sends a quote. You only pay if you accept it.</p>
                  </div>
                )
              )}

              {tab === "files" && (
                <div>
                  <p style={{ marginBottom: 14 }}>Transparent, print-ready PNGs for every print area — at 300 DPI when the print size is known. Use them with Printify, Printful, Etsy or any local printer. They&apos;re yours.</p>
                  <button className="pe-btn pe-btn-primary pe-block" disabled={Boolean(busy)} onClick={download}>
                    {busy ? <><Loader2 size={16} className="pe-spin" /> {busy}</> : <><Download size={16} /> Download print files</>}
                  </button>
                </div>
              )}

              {error && <p className="pe-toast-error" role="alert" style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10 }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    );
  };
}
