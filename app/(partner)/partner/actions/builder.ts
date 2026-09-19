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
