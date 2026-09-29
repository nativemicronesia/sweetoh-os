"use client";

import { SubmitButton } from "../../components/submit-button";
import { addPartnerProductPhotoAction, removePartnerProductPhotoAction } from "../../actions/product-media";

type Photo = { id: string; url: string | null; color: string | null };

export function ProductMediaManager({ productId, productName, photos, canEdit, maxPhotos }: {
  productId: string;
  productName: string;
  photos: Photo[];
  canEdit: boolean;
  maxPhotos: number;
}) {
  return <section className="mt-5 border-t pt-4" style={{ borderColor: "var(--so-border)" }} aria-labelledby="product-photos-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="product-photos-title" className="text-sm font-semibold" style={{ color: "var(--so-cream)" }}>Product photos <span className="font-normal" style={{ color: "var(--so-cream-dim)" }}>{photos.length} of {maxPhotos}</span></h3>
      {canEdit && photos.length < maxPhotos && <form action={addPartnerProductPhotoAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="productId" value={productId} />
        <label className="grid gap-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>Add a product photo<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" required /></label>
        <SubmitButton pendingLabel="Adding…" variant="outline">Add photo</SubmitButton>
      </form>}
    </div>
    {photos.length ? <ul className="mt-3 flex flex-wrap gap-3">{photos.map((photo, index) => <li key={photo.id} className="w-24">
      {photo.url ? <img src={photo.url} alt={`${index === 0 ? "Main product photo" : `Product photo ${index + 1}`}${photo.color ? `, ${photo.color}` : ""}`} className="aspect-square w-full rounded-lg object-cover" /> : <div className="flex aspect-square items-center justify-center rounded border text-center text-xs" style={{ borderColor: "var(--so-border)", color: "var(--so-cream-dim)" }}>Photo unavailable</div>}
      <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>{index === 0 ? "Main photo" : `Photo ${index + 1}`}{photo.color ? ` · ${photo.color}` : ""}</p>
      {canEdit && <form action={removePartnerProductPhotoAction} className="mt-1" onSubmit={event => { if (!window.confirm(`Remove this photo from ${productName}?`)) event.preventDefault(); }}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="mediaId" value={photo.id} />
        <SubmitButton pendingLabel="Removing…" variant="outline">Remove</SubmitButton>
      </form>}
    </li>)}</ul> : <p className="mt-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>No product photos saved. Add one when you’re ready; this draft stays private.</p>}
    {canEdit && <p className="mt-2 text-xs" style={{ color: "var(--so-cream-dim)" }}>The first photo is the main shop photo. Changes save to this private draft immediately.</p>}
  </section>;
}
