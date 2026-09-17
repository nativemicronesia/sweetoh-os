"use client";
import { useState } from "react";
import Link from "next/link";
type Card = { id: string; name: string; image: string | null; kind: string; href: string; action: string | null };
export function WorkspaceGallery({ cards }: { cards: Card[] }) {
 const [filter, setFilter] = useState("all"); const [search, setSearch] = useState("");
 const visible = cards.filter(c => (filter === "all" || c.kind === filter) && c.name.toLowerCase().includes(search.toLowerCase()));
 return <section><div className="studio-section-heading"><h2>Saved work</h2><label className="studio-search"><span aria-hidden="true">⌕</span><input aria-label="Search your products" placeholder="Find something you made…" value={search} onChange={e=>setSearch(e.target.value)} /></label></div>
 <div className="studio-tabs" role="group" aria-label="Filter products">{[["all","All products"],["blank","My blanks"],["draft","Drafts"],["live","Published"]].map(([value,label])=><button key={value} aria-pressed={filter === value} onClick={()=>setFilter(value)}>{label}<span>{cards.filter(c=>value === "all" || c.kind === value).length}</span></button>)}</div>
 <div className="studio-product-grid">{visible.map(c=><article key={c.id} className="studio-product-card"><Link href={c.href} className="studio-product-image">{c.image ? <img src={c.image} alt={c.name} /> : <span className="studio-no-photo">Add your product photo</span>}<span className={`studio-status studio-status-${c.kind}`}>{c.kind === "blank" ? "Reusable blank" : c.kind === "live" ? "Published" : "Draft"}</span></Link><div className="studio-product-info"><Link href={c.href}><h3>{c.name}</h3></Link><Link href={c.action ?? c.href} className="studio-card-action">{c.action ? "Start designing" : c.kind === "live" ? "View listing" : "Continue creating"} <span>→</span></Link></div></article>)}</div>
 {visible.length === 0 && <p className="studio-empty">{search ? "No products match that search." : filter === "all" ? "Your first creation belongs here. Start with a product photo or a blank you already own." : "Nothing here yet. Your saved work will appear as you create."}</p>}</section>;
}
