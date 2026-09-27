"use client";

import { useEffect, useMemo, useState } from "react";
import { PRODUCT_FONTS } from "@/lib/studio/fonts";
import { STUDIO_FONT_PROVENANCE } from "@/lib/studio/font-provenance";
import { STUDIO_ASSET_MANIFEST } from "@/lib/studio/asset-manifest";
import { matchesStudioAssetQuery, studioAssetCategories, studioAssetOriginLabel, studioAssetQueryScore, studioAssetUrl } from "@/lib/studio/asset-library-client";
import { filterStudioCreativeAssets, type StudioCreativeAssetOption } from "@/lib/studio/creative-library-browser";

const FAVORITES_KEY = "sweetoh:studio:favorites:v1";
const RECENTS_KEY = "sweetoh:studio:recent:v1";
const PAGE_SIZE = 48;
const STUDIO_ASSET_CATEGORIES = studioAssetCategories();

function readIds(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(0, 50) : [];
  } catch { return []; }
}

export function AssetLibraryPanel({ disabled, creativeAssets = [], onAddCreativeAsset, onAddGraphic, onAddFont }: {
  disabled: boolean;
  creativeAssets?: StudioCreativeAssetOption[];
  onAddCreativeAsset: (id: string) => void;
  onAddGraphic: (id: string) => void;
  onAddFont: (key: string) => void;
}) {
  const [collection, setCollection] = useState<"originals" | "workspace">("originals");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [creativeKind, setCreativeKind] = useState("");
  const [creativeCategory, setCreativeCategory] = useState("");
  const [creativeTag, setCreativeTag] = useState("");
  const [productionMethod, setProductionMethod] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => { setFavorites(readIds(FAVORITES_KEY)); setRecent(readIds(RECENTS_KEY)); };
    queueMicrotask(sync);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => setVisibleLimit(PAGE_SIZE), [collection, filter, query, creativeKind, creativeCategory, creativeTag, productionMethod]);

  const entries = useMemo(() => [
    ...STUDIO_ASSET_MANIFEST.filter((asset) => asset.studioUseApproved).map((asset) => ({ id: asset.id, name: asset.name, category: asset.category, tags: asset.tags.join(" "), kind: asset.kind, preview: studioAssetUrl(asset.id), font: null as string | null, license: asset.license, source: asset.source, licenseId: asset.licenseId ?? "SweetOh original", sourceUrl: asset.sourceUrl ?? "", evidenceUrl: asset.evidenceUrl ?? "", attributionText: asset.attributionText ?? "" })),
    ...PRODUCT_FONTS.map((font) => ({ id: `font:${font.key}`, name: font.label, category: "Fonts", tags: "text typography lettering", kind: "font", preview: "", font: font.family as string | null, license: STUDIO_FONT_PROVENANCE[font.key].license, source: STUDIO_FONT_PROVENANCE[font.key].source, licenseId: STUDIO_FONT_PROVENANCE[font.key].license.includes("Apache") ? "Apache 2.0" : "OFL 1.1", sourceUrl: STUDIO_FONT_PROVENANCE[font.key].source, evidenceUrl: STUDIO_FONT_PROVENANCE[font.key].notice, attributionText: "" })),
  ], []);
  const visible = entries.filter((entry) => {
    if (filter === "Favorites" && !favorites.includes(entry.id)) return false;
    if (filter === "Recent" && !recent.includes(entry.id)) return false;
    if (!["All", "Favorites", "Recent"].includes(filter) && entry.category !== filter) return false;
    return matchesStudioAssetQuery(entry, query);
  }).sort((a, b) => filter === "Recent" ? recent.indexOf(a.id) - recent.indexOf(b.id) : studioAssetQueryScore(b, query) - studioAssetQueryScore(a, query) || a.name.localeCompare(b.name));

  function use(id: string, creative = false) {
    const next = [id, ...recent.filter((value) => value !== id)].slice(0, 24);
    setRecent(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    if (creative) onAddCreativeAsset(id);
    else if (id.startsWith("font:")) onAddFont(id.slice(5));
    else onAddGraphic(id);
  }
  function favorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  const creativeKinds = [...new Set(creativeAssets.map((asset) => asset.kind))].sort();
  const creativeCategories = [...new Set(creativeAssets.map((asset) => asset.category))].sort();
  const creativeTags = [...new Set(creativeAssets.flatMap((asset) => asset.tags))].sort();
  const productionMethods = [...new Set(creativeAssets.flatMap((asset) => asset.productionMethods))].sort();
  const visibleCreative = filterStudioCreativeAssets(creativeAssets, {
    query, kind: creativeKind, category: creativeCategory, tag: creativeTag, productionMethod,
  }).sort((a, b) => a.name.localeCompare(b.name));
  const visibleEntries = visible.slice(0, visibleLimit);
  const visibleCreativeEntries = visibleCreative.slice(0, visibleLimit);

  return <div className="pe-panel-body pe-asset-library">
    <div className="pe-asset-filters" aria-label="Library source">
      <button type="button" aria-pressed={collection === "originals"} onClick={() => setCollection("originals")}>Originals &amp; fonts</button>
      <button type="button" aria-pressed={collection === "workspace"} onClick={() => setCollection("workspace")}>My reusable assets ({creativeAssets.length})</button>
    </div>
    {collection === "originals" ? <>
      <label className="sr-only" htmlFor="studio-asset-search">Search Studio assets</label>
      <input id="studio-asset-search" className="pe-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search elements and fonts" />
      <label className="pe-small">Category<select className="pe-search" aria-label="Studio asset category" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="All">All assets ({entries.length})</option>
        <option value="Favorites">Favorites</option>
        <option value="Recent">Recent</option>
        <optgroup label="Categories">{STUDIO_ASSET_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</optgroup>
      </select></label>
      <p className="pe-muted pe-small">SweetOh originals, rights-cleared open artwork, and fonts. Add a graphic, then resize, rotate, layer, and print.</p>
      {visible.length ? <>
      <p className="pe-muted pe-small">Showing {visibleEntries.length} of {visible.length} matches.</p>
      <div className="pe-asset-grid">{visibleEntries.map((entry) => <div key={entry.id} className="pe-asset-card">
        <button type="button" disabled={disabled} onClick={() => use(entry.id)} aria-label={`Add ${entry.name}`}>
          {entry.font ? <span className="pe-asset-font" style={{ fontFamily: entry.font }}>Aa</span> : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.preview} alt="" loading="lazy" />
          )}
          <span>{entry.name}</span>
        </button>
        <button type="button" className="pe-asset-favorite" onClick={() => favorite(entry.id)} aria-label={`${favorites.includes(entry.id) ? "Remove" : "Add"} ${entry.name} ${favorites.includes(entry.id) ? "from" : "to"} favorites`} aria-pressed={favorites.includes(entry.id)}>★</button>
        <small tabIndex={0} aria-label={`${entry.source}. License: ${entry.license}. ${entry.attributionText}`} title={`${entry.source}\n${entry.license}\nSource: ${entry.sourceUrl}\nEvidence: ${entry.evidenceUrl}\n${entry.attributionText}`}>{studioAssetOriginLabel(entry)}</small>
      </div>)}</div>
      {visibleEntries.length < visible.length && <button type="button" className="pe-btn pe-btn-ghost" onClick={() => setVisibleLimit((count) => count + PAGE_SIZE)}>Show more ({visible.length - visibleEntries.length} remaining)</button>}
      </> : <p className="pe-muted">No matching assets.</p>}
    </> : <>
      <label className="sr-only" htmlFor="studio-creative-search">Search reusable assets</label>
      <input id="studio-creative-search" className="pe-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, tags, source or method" />
      <div className="grid grid-cols-2 gap-2 py-2">
        <label className="pe-small">Kind<select className="pe-search" value={creativeKind} onChange={(event) => setCreativeKind(event.target.value)}><option value="">All kinds</option>{creativeKinds.map((kind) => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}</select></label>
        <label className="pe-small">Category<select className="pe-search" value={creativeCategory} onChange={(event) => setCreativeCategory(event.target.value)}><option value="">All categories</option>{creativeCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="pe-small">Tag<select className="pe-search" value={creativeTag} onChange={(event) => setCreativeTag(event.target.value)}><option value="">All tags</option>{creativeTags.map((tag) => <option key={tag}>{tag}</option>)}</select></label>
        <label className="pe-small">Useful for<select className="pe-search" value={productionMethod} onChange={(event) => setProductionMethod(event.target.value)}><option value="">Any method</option>{productionMethods.map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}</select></label>
      </div>
      <p className="pe-muted pe-small">Only assets cleared for Studio use appear here. Adding one references its existing file; changes stay editable and undoable.</p>
      {visibleCreative.length ? <>
      <p className="pe-muted pe-small">Showing {visibleCreativeEntries.length} of {visibleCreative.length} matches.</p>
      <div className="pe-asset-grid">{visibleCreativeEntries.map((entry) => <div key={entry.id} className="pe-asset-card">
        <button type="button" disabled={disabled} onClick={() => use(entry.id, true)} aria-label={`Add ${entry.name}`}>
          {/* Existing venture asset, served through its signed preview URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.previewUrl} alt="" loading="lazy" />
          <span>{entry.name}</span>
        </button>
        <button type="button" className="pe-asset-favorite" onClick={() => favorite(entry.id)} aria-label={`${favorites.includes(entry.id) ? "Remove" : "Add"} ${entry.name} ${favorites.includes(entry.id) ? "from" : "to"} favorites`} aria-pressed={favorites.includes(entry.id)}>★</button>
        <small>{entry.category} · {entry.productionMethods.length ? entry.productionMethods.join(", ") : entry.kind.replaceAll("_", " ")}</small>
        <small title={entry.licenseId ?? "No license ID recorded"}>{entry.sourceName ?? "Source not recorded"} · {entry.licenseId ?? "Rights cleared for Studio"}</small>
      </div>)}</div>
      {visibleCreativeEntries.length < visibleCreative.length && <button type="button" className="pe-btn pe-btn-ghost" onClick={() => setVisibleLimit((count) => count + PAGE_SIZE)}>Show more ({visibleCreative.length - visibleCreativeEntries.length} remaining)</button>}
      </> : <p className="pe-muted">No rights-approved assets match these filters.</p>}
    </>}
  </div>;
}
