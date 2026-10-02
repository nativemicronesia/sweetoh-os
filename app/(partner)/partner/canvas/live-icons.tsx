"use client";

import { useEffect, useRef, useState } from "react";
import { ICON_PREFIXES, ICON_SETS, ICON_SHELVES, STICKER_PREFIXES, STICKER_SHELVES, iconPreviewUrl, searchIcons } from "@/lib/studio/icon-sets";

const PAGE = 60;
const PREVIEW_TINT = "#173e39";

function IconTile({ id, mode, disabled, onAdd }: { id: string; mode: "icons" | "stickers"; disabled: boolean; onAdd: (id: string) => void }) {
  const name = id.split(":")[1].replace(/-/g, " ");
  return (
    <div className="el-tile">
      <button type="button" className="el-add" disabled={disabled} onClick={() => onAdd(id)} aria-label={`Add ${name}`} title={`${name} · ${ICON_SETS[id.split(":")[0]]?.name ?? ""}`}>
        {/* Open icon served by Iconify. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconPreviewUrl(id, mode === "icons" ? PREVIEW_TINT : undefined)} alt="" loading="lazy" decoding="async" draggable={false} onLoad={(e) => { e.currentTarget.dataset.loaded = "1"; }} />
      </button>
    </div>
  );
}

/** One horizontally scrolling shelf, fetched only when it scrolls into view. */
function Shelf({ title, query, mode, prefixes, disabled, onAdd, onSeeAll }: { title: string; query: string; mode: "icons" | "stickers"; prefixes: readonly string[]; disabled: boolean; onAdd: (id: string) => void; onSeeAll: (query: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [ids, setIds] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      searchIcons(query, prefixes, 12).then((found) => { if (live) setIds(found); }).catch(() => { if (live) setFailed(true); });
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [query, prefixes]);
  if (failed) return null;
  return (
    <section ref={ref} className="el-shelf" aria-label={title}>
      <header><div><h3>{title}</h3></div><button type="button" onClick={() => onSeeAll(query)}>See all</button></header>
      <div className="el-row">
        {ids ? ids.map((id) => <IconTile key={id} id={id} mode={mode} disabled={disabled} onAdd={onAdd} />) : Array.from({ length: 6 }, (_, i) => <div key={i} className="el-tile" aria-hidden />)}
      </div>
    </section>
  );
}

/** Live, searchable icon and sticker libraries from open sets. */
export function LiveIcons({ mode, query, disabled, onAdd, onSeeAll }: { mode: "icons" | "stickers"; query: string; disabled: boolean; onAdd: (id: string) => void; onSeeAll: (query: string) => void }) {
  const [activeSet, setActiveSet] = useState<string>("all");
  const allPrefixes = mode === "icons" ? ICON_PREFIXES : STICKER_PREFIXES;
  const prefixes = activeSet === "all" || !allPrefixes.includes(activeSet) ? allPrefixes : [activeSet];
  const term = query.trim();
  const [page, setPage] = useState<{ key: string; ids: string[]; more: boolean; failed: boolean; loading: boolean }>({ key: "", ids: [], more: false, failed: false, loading: false });
  const key = `${mode}|${prefixes.join(",")}|${term}`;
  useEffect(() => {
    if (!term) return;
    let live = true;
    queueMicrotask(() => { if (live) setPage({ key, ids: [], more: false, failed: false, loading: true }); });
    searchIcons(term, prefixes, PAGE, 0)
      .then((ids) => { if (live) setPage({ key, ids, more: ids.length >= PAGE, failed: false, loading: false }); })
      .catch(() => { if (live) setPage({ key, ids: [], more: false, failed: true, loading: false }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = page.key === key ? page : { key, ids: [], more: false, failed: false, loading: Boolean(term) };
  async function more() {
    try {
      const next = await searchIcons(term, prefixes, PAGE, current.ids.length);
      setPage({ key, ids: [...new Set([...current.ids, ...next])], more: next.length >= PAGE, failed: false, loading: false });
    } catch { setPage({ ...current, more: false }); }
  }
  return (
    <div className="el-live">
      {mode === "icons" && (
        <div className="el-topics" role="group" aria-label="Icon style">
          <button type="button" aria-pressed={activeSet === "all"} onClick={() => setActiveSet("all")}>All styles</button>
          {ICON_PREFIXES.slice(0, 7).map((prefix) => <button key={prefix} type="button" aria-pressed={activeSet === prefix} onClick={() => setActiveSet(prefix)}>{ICON_SETS[prefix].name}</button>)}
        </div>
      )}
      {term ? (
        current.failed ? <p className="el-empty">Search is unavailable right now. Check your connection and try again.</p>
        : current.loading ? <div className="el-grid">{Array.from({ length: 12 }, (_, i) => <div key={i} className="el-tile" aria-hidden />)}</div>
        : current.ids.length ? (
          <>
            <div className="el-grid">{current.ids.map((id) => <IconTile key={id} id={id} mode={mode} disabled={disabled} onAdd={onAdd} />)}</div>
            {current.more && <button type="button" className="pe-btn pe-btn-ghost pe-block" onClick={() => void more()}>Show more</button>}
          </>
        ) : <p className="el-empty">No {mode} match “{term}”. Try a simpler word.</p>
      ) : (
        <div className="el-shelves">
          {(mode === "icons" ? ICON_SHELVES : STICKER_SHELVES).map((shelf) => <Shelf key={shelf.title} title={shelf.title} query={shelf.query} mode={mode} prefixes={prefixes} disabled={disabled} onAdd={onAdd} onSeeAll={onSeeAll} />)}
        </div>
      )}
      <p className="el-count">Open-licensed sets via Iconify ({(mode === "icons" ? ICON_PREFIXES : STICKER_PREFIXES).map((p) => ICON_SETS[p].name).slice(0, 3).join(", ")} and more).</p>
    </div>
  );
}
