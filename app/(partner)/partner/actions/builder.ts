"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { z } from "zod";
import { requirePartnerWorkspace, requireStudioWorkspace } from "@/lib/domains/identity/service";
import { assertBuilderRole, preparePartnerProduct, confirmBuilderProduct, prepareBlankPreview, reservePartnerAi } from "@/lib/domains/intelligence/partner-builder";
import { safeSourceUrl } from "@/lib/domains/intelligence/product-research-schema";
import { generatePartnerArtwork } from "@/lib/integrations/ai/product-research";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { ValidationError } from "@/lib/shared/errors";
import { getAssetSignedUrl, createAssetWithUpload, validateImageUpload } from "@/lib/domains/assets/service";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { designLibraryObjectKey, STORAGE_BUCKETS } from "@/lib/storage/paths";
import { downloadFromBucket, removeFromBucket } from "@/lib/storage/client";
import { importArtwork, validateArtworkImport, type ImportReport } from "@/lib/studio/artwork-import";

function message(error: unknown) {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof OpenAI.APIError) {
    console.error("partner_ai_provider_failed", { status: error.status, code: error.code });
    if (error.status === 401 || error.status === 403) return "AI access isn't enabled for this shop's connection. Your saved work and manual tools are still available.";
    if (error.status === 429) return "AI is busy or the shop's AI allowance needs attention. Please try later; your saved work is still available.";
    return "The AI service couldn't complete this request. Try again shortly; your saved work is still available.";
  }
  console.error("Partner builder failed", error instanceof Error ? error.name : "unknown");
  return "Couldn't finish that step. Your saved work is still available. Please try again.";
}

export async function prepareProductAction(form: FormData): Promise<{ productId?: string; error?: string }> {
  const session = await requirePartnerWorkspace();
  try {
    assertBuilderRole(session);
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) throw new ValidationError("Choose a product photo.");
    if (file.size > 10 * 1024 * 1024) throw new ValidationError("Choose a photo smaller than 10 MB.");
    const sourceUrl = String(form.get("sourceUrl") || "").trim();
    if (sourceUrl && !safeSourceUrl(sourceUrl)) throw new ValidationError("Use a public HTTPS supplier link.");
    const row = await preparePartnerProduct(session, { file: Buffer.from(await file.arrayBuffer()), mimeType: file.type,
      notes: String(form.get("notes") || "").slice(0, 4000), sourceUrl,
      purpose: form.get("purpose") === "blank" ? "blank" : "finished", useAi: form.get("useAi") === "on",
      name: String(form.get("name") || "").slice(0, 180) });
    revalidatePath("/partner"); revalidatePath("/partner/review");
    return { productId: row.id };
  } catch (error) { return { error: message(error) }; }
}

export async function confirmProductAction(id: string) {
  const session = await requirePartnerWorkspace();
  try {
    await confirmBuilderProduct(session, z.string().uuid().parse(id));
    revalidatePath(`/partner/builder/${id}`); revalidatePath("/partner/canvas");
    return { ok: true };
  } catch (error) { return { error: message(error) }; }
}

export async function generateBlankAction(id: string) {
  const session = await requirePartnerWorkspace();
  try {
    await prepareBlankPreview(session, z.string().uuid().parse(id));
    revalidatePath(`/partner/builder/${id}`); revalidatePath("/partner/canvas");
    return { ok: true };
  } catch (error) { return { error: message(error) }; }
}

export async function generateArtworkAction(prompt: string): Promise<{ assetId?: string; previewUrl?: string | null; name?: string; error?: string }> {
  const session = await requireStudioWorkspace();
  try {
    assertBuilderRole(session);
    const brief = z.string().trim().min(8).max(2000).parse(prompt);
    const refund = await reservePartnerAi(session, `art:${brief}`);
    const bytes = await generatePartnerArtwork(brief).catch(async (error) => { await refund(); throw error; });
    const art = await uploadPartnerDesign({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id, name: brief.slice(0, 100), notes: `AI artwork. Brief: ${brief}`,
      file: bytes, filename: "artwork.png", mimeType: "image/png", autoApprove: false });
    revalidatePath("/partner/library");
    return { assetId: art.id, name: art.name, previewUrl: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: art.id }) };
  } catch (error) { return { error: message(error) }; }
}

export async function uploadCanvasArtworkAction(form: FormData): Promise<{ assetId?: string; previewUrl?: string | null; name?: string; error?: string }> {
  const session = await requireStudioWorkspace();
  try {
    const file = form.get("artwork");
    if (!(file instanceof File)) throw new ValidationError("Choose an artwork file.");
    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
    const art = await uploadPartnerDesign({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id, name: file.name.replace(/\.[^.]+$/, ""), notes: null,
      file: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: file.type, autoApprove: false });
    revalidatePath("/partner/library");
    return { assetId: art.id, name: art.name, previewUrl: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: art.id }) };
  } catch (error) { return { error: message(error) }; }
}

/**
 * Artwork from other tools goes straight to storage on a signed URL (a server
 * action body is capped at a few MB on Vercel, and print-size PNGs are bigger),
 * then finishArtworkImportAction checks and normalizes it.
 */
export async function prepareArtworkImportAction(input: { name: string; type: string; size: number }): Promise<{ ok: true; key: string; url: string } | { ok: false; error: string }> {
  const session = await requireStudioWorkspace();
  try {
    const data = z.object({ name: z.string().min(1).max(160), type: z.string().max(60), size: z.number().int().positive() }).parse(input);
    validateArtworkImport({ mimeType: data.type, sizeBytes: data.size });
    const safe = data.name.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80).toLowerCase() || "artwork";
    const key = designLibraryObjectKey(session.ventureSlug, `import-${crypto.randomUUID()}`, safe);
    const { data: signed, error } = await createAdminClient().storage.from(STORAGE_BUCKETS.designLibrary).createSignedUploadUrl(key);
    if (error || !signed) throw error ?? new Error("upload url");
    return { ok: true, key, url: signed.signedUrl };
  } catch (error) { return { ok: false, error: message(error) }; }
}

export async function finishArtworkImportAction(input: { key: string; name: string; targetWidthPx?: number }): Promise<{ ok: true; assetId: string; name: string; previewUrl: string | null; report: ImportReport } | { ok: false; error: string }> {
  const session = await requireStudioWorkspace();
  let staged: string | null = null;
  try {
    const data = z.object({ key: z.string().max(300), name: z.string().min(1).max(160), targetWidthPx: z.number().int().min(300).max(6000).optional() }).parse(input);
    // Only this workspace's own staged imports can be finished.
    if (!data.key.startsWith(`${session.ventureSlug}/import-`) || data.key.includes("..")) throw new ValidationError("That upload isn't available. Try again.");
    staged = data.key;
    const bytes = await downloadFromBucket({ bucket: STORAGE_BUCKETS.designLibrary, objectKey: data.key });
    const mimeType = /\.svg$/i.test(data.key) ? "image/svg+xml" : /\.jpe?g$/i.test(data.key) ? "image/jpeg" : /\.webp$/i.test(data.key) ? "image/webp" : /\.gif$/i.test(data.key) ? "image/gif" : /\.hei[cf]$/i.test(data.key) ? "image/heic" : "image/png";
    const art = await importArtwork(bytes, mimeType, { targetWidthPx: data.targetWidthPx });
    const base = data.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Imported artwork";
    const saved = await uploadPartnerDesign({ ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id, name: base, notes: `Imported (${art.report.source}). ${art.report.issues.map((i) => i.message).join(" ")}`.slice(0, 500), file: art.bytes, filename: `${base.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase()}.${art.extension}`, mimeType: art.mimeType, autoApprove: false });
    revalidatePath("/partner/library");
    return { ok: true, assetId: saved.id, name: saved.name, previewUrl: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: saved.id }), report: art.report };
  } catch (error) { return { ok: false, error: message(error) }; }
  finally { if (staged) await removeFromBucket({ bucket: STORAGE_BUCKETS.designLibrary, objectKey: staged }).catch(() => undefined); }
}

export async function uploadSurfaceAction(form: FormData) {
  const session = await requireStudioWorkspace();
  try {
    assertBuilderRole(session);
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) throw new ValidationError("Choose a surface photo.");
    validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
    const asset = await createAssetWithUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id, name: file.name, assetType: "product_asset", file: Buffer.from(await file.arrayBuffer()), filename: file.name, mimeType: file.type });
    return { assetId: asset.id, previewUrl: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: asset.id }) };
  } catch (error) { return { error: message(error) }; }
}
