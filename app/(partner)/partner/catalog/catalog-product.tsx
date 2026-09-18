"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "../components/submit-button";
import { startCatalogDesign } from "../actions/catalog";
export function CatalogProduct({ product }: { product: { id: number; name: string; description: string; brand: string; model: string; images: string[]; category: string } }) {
  const [index, setIndex] = useState(0);
  const [more, setMore] = useState(false);
  return <section className="catalog-detail"><div><div className="catalog-detail-image"><img src={product.images[index]} alt={product.name} /></div>
    <div className="catalog-thumbnails" aria-label="Product images">{product.images.map((src,i)=><button key={src} aria-label={`Product view ${i+1}`} aria-pressed={index===i} onClick={()=>setIndex(i)}><img src={src} alt="" loading="lazy" /></button>)}</div>
  </div><div className="space-y-5 py-4"><Badge variant="secondary">{product.category}</Badge><h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1><p className="text-muted-foreground">{[product.brand,product.model].filter(Boolean).join(" · ")}</p>
    <div className="catalog-provider"><MapPin size={20}/><div><strong>Sweet’Oh · Local production</strong><p>Choose a blank you stock and print locally.</p></div></div>
    <form action={startCatalogDesign} className="space-y-3"><input type="hidden" name="blueprintId" value={product.id}/><input type="hidden" name="imageIndex" value={index}/><SubmitButton pendingLabel="Preparing your product…">Start designing →</SubmitButton><p className="text-xs text-muted-foreground">Use this view as your product mockup. Set your selling price after designing.</p></form>
    <div className="catalog-description"><h2>Product details</h2><p data-clamped={!more} className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{product.description}</p>{product.description.length > 420 && <button type="button" className="catalog-more" onClick={()=>setMore(!more)}>{more ? "Show less" : "Show more"}</button>}</div>
  </div></section>;
}
