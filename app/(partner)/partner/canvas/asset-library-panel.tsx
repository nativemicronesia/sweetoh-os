"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, Search, X } from "lucide-react";
import { studioAssetUrl, saveStudioLibraryIds } from "@/lib/studio/asset-library-client";
import { LIBRARY_SHELVES, LIBRARY_TYPES, LIBRARY_TOPICS, filterLibrary, libraryAssets, type LibraryAsset, type LibraryShelf, type LibraryTopic, type LibraryType } from "@/lib/studio/library-taxonomy";
import { filterStudioCreativeAssets, type StudioCreativeAssetOption } from "@/lib/studio/creative-library-browser";

const FAVORITES_KEY = "sweetoh:studio:favorites:v1";
const RECENTS_KEY = "sweetoh:studio:recent:v1";
const CHUNK = 36;
const SHELF_SIZE = 14;
const MIN_SHELF = 8;

function readIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 50) : [];
  } catch { return []; }
}
function writeIds(key: string, ids: string[]) {
  try { saveStudioLibraryIds(window.localStorage, key, ids); } catch { /* preferences are optional */ }
}

type Tab = "browse" | LibraryType | "mine";

function Tile({ asset, favorite, disabled, onAdd, onFavorite }: { asset: LibraryAsset; favorite: boolean; disabled: boolean; onAdd: (id: string) => void; onFavorite: (id: string) => void }) {
  const rights = `${asset.name} · ${asset.origin} · ${asset.licenseId ?? asset.license}`;
  return (
    <div className="el-tile" draggable={!disabled} onDragStart={(e) => { e.dataTransfer.setData("application/x-sweetoh-graphic", asset.id); e.dataTransfer.effectAllowed = "copy"; }}>
      <button type="button" className="el-add" disabled={disabled} onClick={() => onAdd(asset.id)} aria-label={`Add ${asset.name}`} title={rights}>
        {/* Same-origin Studio asset route. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={studioAssetUrl(asset.id)} alt="" loading="lazy" decoding="async" draggable={false} onLoad={(e) => { e.currentTarget.dataset.loaded = "1"; }} />
      </button>
      <button type="button" className="el-heart" data-on={favorite} onClick={() => onFavorite(asset.id)} aria-pressed={favorite} aria-label={`${favorite ? "Remove" : "Add"} ${asset.name} ${favorite ? "from" : "to"} favorites`}>
        <Heart size={13} fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function Grid({ assets, ...tile }: { assets: readonly LibraryAsset[] } & Omit<Parameters<typeof Tile>[0], "asset" | "favorite"> & { favorites: string[] }) {
  const [limit, setLimit] = useState(CHUNK);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) setLimit((n) => n + CHUNK); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [assets, limit]);
  const shown = assets.slice(0, limit);
  return (
    <>
      <div className="el-grid">{shown.map((asset) => <Tile key={asset.id} asset={asset} favorite={tile.favorites.includes(asset.id)} disabled={tile.disabled} onAdd={tile.onAdd} onFavorite={tile.onFavorite} />)}</div>
      {shown.length < assets.length && <div ref={sentinel} className="el-more" aria-hidden>Loading more…</div>}
    </>
  );
}

export function AssetLibraryPanel({ disabled, creativeAssets = [], onAddCreativeAsset, onAddGraphic }: {
  disabled: boolean;
  creativeAssets?: StudioCreativeAssetOption[];
  onAddCreativeAsset: (id: string) => void;
  onAddGraphic: (id: string) => void;
  /** Fonts live in the Text panel now; kept so existing callers still compile. */
  onAddFont?: (key: string) => void;
}) {
  const all = useMemo(() => libraryAssets(), []);
  const byId = useMemo(() => new Map(all.map((asset) => [asset.id, asset])), [all]);
  const [tab, setTab] = useState<Tab>("browse");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<LibraryTopic | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [mineQuery, setMineQuery] = useState("");
  const [mineKind, setMineKind] = useState("");
  useEffect(() => {
    const sync = () => { setFavorites(readIds(FAVORITES_KEY)); setRecent(readIds(RECENTS_KEY)); };
    queueMicrotask(sync);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function add(id: string) {
    const next = [id, ...recent.filter((value) => value !== id)].slice(0, 24);
    setRecent(next);
    writeIds(RECENTS_KEY, next);
    onAddGraphic(id);
  }
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [id, ...favorites];
    setFavorites(next);
    writeIds(FAVORITES_KEY, next);
  }
  function openShelf(shelf: LibraryShelf) {
    setTab(shelf.filter.type ?? "browse");
    setTopic(shelf.filter.topic ?? null);
    setOrigin(shelf.filter.origin ?? null);
    setTitle(shelf.title);
    setQuery("");
  }
  function reset(next: Tab) {
    setTab(next);
    setTopic(null);
    setOrigin(null);
    setTitle(null);
  }

  const searching = query.trim().length > 0;
  const drilled = tab !== "browse" || topic !== null || origin !== null || searching;
  const typeFilter = LIBRARY_TYPES.includes(tab as LibraryType) ? (tab as LibraryType) : undefined;
  const results = useMemo(
    () => (drilled && tab !== "mine" ? filterLibrary(all, { type: typeFilter, topic: topic ?? undefined, origin: origin ?? undefined, query }) : []),
    [all, drilled, tab, typeFilter, topic, origin, query],
  );
  const topicCounts = useMemo(() => {
    if (!typeFilter) return [];
    const inType = all.filter((asset) => asset.type === typeFilter);
    return LIBRARY_TOPICS.map((name) => ({ name, count: inType.filter((asset) => asset.topic === name).length })).filter((entry) => entry.count > 0);
  }, [all, typeFilter]);
  const shelves = useMemo(
    () => LIBRARY_SHELVES.map((shelf) => ({ shelf, assets: filterLibrary(all, shelf.filter) })).filter((entry) => entry.assets.length >= MIN_SHELF),
    [all],
  );
  const favoriteAssets = favorites.map((id) => byId.get(id)).filter((asset): asset is LibraryAsset => Boolean(asset));
  const recentAssets = recent.map((id) => byId.get(id)).filter((asset): asset is LibraryAsset => Boolean(asset));

  const mine = useMemo(() => filterStudioCreativeAssets(creativeAssets, { query: mineQuery, kind: mineKind, category: "", tag: "", productionMethod: "" }), [creativeAssets, mineQuery, mineKind]);
  const mineKinds = [...new Set(creativeAssets.map((asset) => asset.kind))].sort();
  const tile = { disabled, favorites, onAdd: add, onFavorite: toggleFavorite };

  return (
    <div className="pe-panel-body el">
      <label className="el-search">
        <Search size={15} aria-hidden />
        <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); if (tab === "mine") setMineQuery(e.target.value); }} placeholder={tab === "mine" ? "Search your library" : `Search ${all.length.toLocaleString()} elements`} aria-label="Search elements" />
        {query && <button type="button" onClick={() => { setQuery(""); setMineQuery(""); }} aria-label="Clear search"><X size={14} /></button>}
      </label>
      <div className="el-tabs" role="tablist" aria-label="Element types">
        {(["browse", ...LIBRARY_TYPES, "mine"] as Tab[]).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => reset(value)}>
            {value === "browse" ? "For you" : value === "mine" ? `My library${creativeAssets.length ? ` ${creativeAssets.length}` : ""}` : value}
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        <>
          {mineKinds.length > 1 && (
            <div className="el-topics" role="group" aria-label="Kind">
              <button type="button" aria-pressed={!mineKind} onClick={() => setMineKind("")}>All</button>
              {mineKinds.map((kind) => <button key={kind} type="button" aria-pressed={mineKind === kind} onClick={() => setMineKind(kind)}>{kind.replaceAll("_", " ")}</button>)}
            </div>
          )}
          {mine.length ? (
            <div className="el-grid">{mine.map((asset) => (
              <div key={asset.id} className="el-tile">
                <button type="button" className="el-add" disabled={disabled} onClick={() => onAddCreativeAsset(asset.id)} aria-label={`Add ${asset.name}`} title={`${asset.name} · ${asset.sourceName ?? "Your file"} · ${asset.licenseId ?? "Cleared for Studio"}`}>
                  {/* Signed preview of an existing workspace asset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.previewUrl} alt="" loading="lazy" decoding="async" draggable={false} />
                </button>
              </div>
            ))}</div>
          ) : <p className="el-empty">{creativeAssets.length ? "Nothing matches these filters." : "Artwork you save to your library shows up here, ready to reuse."}</p>}
        </>
      ) : drilled ? (
        <>
          {(title || topic || origin) && !searching ? (
            <button type="button" className="el-back" onClick={() => reset("browse")}><ArrowLeft size={14} /> {title ?? "Back"}</button>
          ) : null}
          {typeFilter && !searching && !origin && topicCounts.length > 1 && (
            <div className="el-topics" role="group" aria-label="Topic">
              <button type="button" aria-pressed={topic === null} onClick={() => setTopic(null)}>All</button>
              {topicCounts.map((entry) => <button key={entry.name} type="button" aria-pressed={topic === entry.name} onClick={() => setTopic(entry.name)}>{entry.name} <i>{entry.count}</i></button>)}
            </div>
          )}
          {results.length ? (
            <>
              <p className="el-count">{results.length.toLocaleString()} {results.length === 1 ? "element" : "elements"}</p>
              <Grid key={`${tab}|${topic}|${origin}|${query}`} assets={results} {...tile} />
            </>
          ) : <p className="el-empty">No elements match “{query}”. Try a simpler word like “palm” or “wave”.</p>}
        </>
      ) : (
        <div className="el-shelves">
          {favoriteAssets.length > 0 && <Shelf title="Favorites" assets={favoriteAssets.slice(0, SHELF_SIZE)} {...tile} />}
          {recentAssets.length > 0 && <Shelf title="Recently used" assets={recentAssets.slice(0, SHELF_SIZE)} {...tile} />}
          {shelves.map(({ shelf, assets }) => <Shelf key={shelf.id} title={shelf.title} subtitle={shelf.subtitle} assets={assets.slice(0, SHELF_SIZE)} total={assets.length} onSeeAll={() => openShelf(shelf)} {...tile} />)}
        </div>
      )}
    </div>
  );
}

function Shelf({ title, subtitle, assets, total, onSeeAll, ...tile }: { title: string; subtitle?: string; assets: LibraryAsset[]; total?: number; onSeeAll?: () => void } & Omit<Parameters<typeof Tile>[0], "asset" | "favorite"> & { favorites: string[] }) {
  return (
    <section className="el-shelf" aria-label={title}>
      <header>
        <div><h3>{title}</h3>{subtitle && <small>{subtitle}</small>}</div>
        {onSeeAll && <button type="button" onClick={onSeeAll}>See all{total ? ` ${total.toLocaleString()}` : ""}</button>}
      </header>
      <div className="el-row">{assets.map((asset) => <Tile key={asset.id} asset={asset} favorite={tile.favorites.includes(asset.id)} disabled={tile.disabled} onAdd={tile.onAdd} onFavorite={tile.onFavorite} />)}</div>
    </section>
  );
}
