"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { FONT_CATEGORIES, FONT_MOODS } from "@/lib/studio/font-catalog";
import { STUDIO_FONTS, loadCatalogFont, studioFont, type StudioFontOption } from "@/lib/studio/fonts";

const RECENTS_KEY = "sweetoh:studio:fonts:recent:v1";
const CHUNK = 50;

function readRecents(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string").slice(0, 12) : [];
  } catch { return []; }
}
function rememberFont(key: string) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify([key, ...readRecents().filter((value) => value !== key)].slice(0, 12))); } catch { /* optional */ }
}

/** One font row; the family is only fetched when the row scrolls into view. */
function FontRow({ font, active, onPick }: { font: StudioFontOption; active: boolean; onPick: (key: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(font.origin === "bundled");
  useEffect(() => {
    if (ready) return;
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      void loadCatalogFont(font.key).then(() => { if (live) setReady(true); });
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => { live = false; io.disconnect(); };
  }, [font.key, ready]);
  return (
    <button ref={ref} type="button" className="fb-row" data-ready={ready} aria-pressed={active} onClick={() => onPick(font.key)}>
      <span className="fb-name" style={{ fontFamily: ready ? font.family : undefined }}>{font.label}</span>
      {active && <Check size={14} aria-hidden />}
    </button>
  );
}

/** Searchable, filterable browser over the whole font library. */
export function FontBrowser({ value, onPick, compact = false }: { value?: string; onPick: (key: string) => void; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [mood, setMood] = useState<string>("All");
  const filterKey = `${query}|${category}|${mood}`;
  const [paging, setPaging] = useState({ key: "", limit: CHUNK });
  const limit = paging.key === filterKey ? paging.limit : CHUNK;
  const [recents, setRecents] = useState<string[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { queueMicrotask(() => setRecents(readRecents())); }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STUDIO_FONTS
      .filter((font) => (category === "All" || font.category === category) && (mood === "All" || font.mood === mood) && (!q || font.label.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (q) return Number(b.label.toLowerCase().startsWith(q)) - Number(a.label.toLowerCase().startsWith(q)) || a.label.localeCompare(b.label);
        return Number(b.origin === "bundled") - Number(a.origin === "bundled") || a.label.localeCompare(b.label);
      });
  }, [query, category, mood]);
  const shown = results.slice(0, limit);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) setPaging({ key: filterKey, limit: limit + CHUNK }); }, { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length, results.length, filterKey, limit]);

  function pick(key: string) {
    rememberFont(key);
    setRecents(readRecents());
    onPick(key);
  }
  const recentFonts = !query && category === "All" && mood === "All" ? recents.map((key) => STUDIO_FONTS.find((font) => font.key === key)).filter((font): font is StudioFontOption => Boolean(font)).slice(0, 5) : [];

  return (
    <div className={`fb${compact ? " fb-compact" : ""}`}>
      <label className="fb-search">
        <Search size={15} aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${STUDIO_FONTS.length} fonts`} aria-label="Search fonts" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
      </label>
      <div className="fb-chips" role="group" aria-label="Font category">
        {["All", ...FONT_CATEGORIES].map((c) => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}
      </div>
      <div className="fb-chips fb-moods" role="group" aria-label="Font style">
        {["All", ...FONT_MOODS].map((m) => <button key={m} type="button" aria-pressed={mood === m} onClick={() => setMood(m)}>{m === "All" ? "Any style" : m}</button>)}
      </div>
      <div className="fb-list" role="list">
        {recentFonts.length > 0 && <>
          <p className="fb-heading">Recently used</p>
          {recentFonts.map((font) => <FontRow key={`r-${font.key}`} font={font} active={value === font.key} onPick={pick} />)}
          <p className="fb-heading">All fonts</p>
        </>}
        {shown.map((font) => <FontRow key={font.key} font={font} active={value === font.key} onPick={pick} />)}
        {shown.length < results.length && <div ref={sentinel} className="fb-more" aria-hidden>Loading more…</div>}
        {results.length === 0 && <p className="fb-empty">No fonts match “{query}”.</p>}
      </div>
      <p className="fb-count">{results.length} {results.length === 1 ? "font" : "fonts"}</p>
    </div>
  );
}

/** The current font as a button that opens the browser in a popover. */
export function FontPickerButton({ value, onPick, disabled }: { value?: string; onPick: (key: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const font = studioFont(value);
  useEffect(() => {
    if (font.origin === "catalog") void loadCatalogFont(font.key);
  }, [font.key, font.origin]);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="fb-picker" ref={root}>
      <button type="button" className="fb-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span style={{ fontFamily: font.family }}>{font.label}</span>
        <ChevronDown size={15} aria-hidden />
      </button>
      {open && (
        <div className="fb-popover" role="dialog" aria-label="Choose a font">
          <FontBrowser compact value={value} onPick={(key) => { onPick(key); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
