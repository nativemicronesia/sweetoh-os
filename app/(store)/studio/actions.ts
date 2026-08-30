"use server";

import { getDefaultVenture } from "@/lib/domains/identity/service";
import {
  submitCustomerCustomizationRequest,
  type StudioDesignMode,
} from "@/lib/domains/intelligence/customer-create";
import { createProductFromGeneratedDesign } from "@/lib/domains/studio/product-conversion";
import { getPrimaryProductImageUrl } from "@/lib/domains/catalog/service";
import { transcribeVoicePrompt } from "@/lib/integrations/ai/openai";
import { ValidationError } from "@/lib/shared/errors";

export async function generateDesignPreview(
  formData: FormData,
): Promise<
  | { ok: true; projectId: string; mockupPreviewUrl: string | null }
  | { ok: false; error: string }
> {
  const venture = await getDefaultVenture();

  const prompt = String(formData.get("prompt") ?? "");
  const customerEmail = String(formData.get("customerEmail") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim() || null;
  const blankProductName =
    String(formData.get("blankProductName") ?? "").trim() || null;
  const blankProductId =
    String(formData.get("blankProductId") ?? "").trim() || null;
  const designModeRaw = String(formData.get("designMode") ?? "ai");
  const designMode = (
    designModeRaw === "upload" ||
    designModeRaw === "library" ||
    designModeRaw === "ai" ||
    designModeRaw === "place"
      ? designModeRaw
      : "ai"
  ) as StudioDesignMode;
  const libraryAssetId =
    String(formData.get("libraryAssetId") ?? "").trim() || null;
  const referenceFile = formData.get("referenceImage");

  const referenceImage =
    referenceFile instanceof File && referenceFile.size > 0
      ? {
          file: Buffer.from(await referenceFile.arrayBuffer()),
          filename: referenceFile.name,
          mimeType: referenceFile.type || "image/png",
        }
      : null;

  try {
    const result = await submitCustomerCustomizationRequest({
      ventureId: venture.id,
      ventureSlug: venture.slug,
      customerEmail,
      customerName,
      prompt,
      designMode,
      blankProductName,
      blankProductId,
      libraryAssetId,
      referenceImage,
    });

    if (!result.mockupPreviewUrl) {
      return {
        ok: false,
        error:
          designMode === "ai"
            ? "Sweet'Oh AI couldn't generate a preview right now — try upload or library, or try again shortly."
            : "Couldn't build a preview from that design — try another file.",
      };
    }

    return { ok: true, projectId: result.projectId, mockupPreviewUrl: result.mockupPreviewUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ValidationError ? error.message : "Something went wrong.",
    };
  }
}

export async function confirmDesignAndAddToCart(input: {
  projectId: string;
  basedOnProductId: string;
}): Promise<
  | {
      ok: true;
      productId: string;
      slug: string;
      name: string;
      priceCents: number;
      imageUrl: string | null;
    }
  | { ok: false; error: string }
> {
  const venture = await getDefaultVenture();

  try {
    const created = await createProductFromGeneratedDesign({
      ventureId: venture.id,
      ventureSlug: venture.slug,
      projectId: input.projectId,
      basedOnProductId: input.basedOnProductId,
    });

    const imageUrl = await getPrimaryProductImageUrl(created.id);

    return {
      ok: true,
      productId: created.id,
      slug: created.slug,
      name: created.name,
      priceCents: created.priceCents,
      imageUrl,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ValidationError ? error.message : "Something went wrong.",
    };
  }
}

export async function transcribeVoiceNote(
  formData: FormData,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return { ok: false, error: "No audio received." };
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const text = await transcribeVoicePrompt({
    audioBuffer: buffer,
    mimeType: audio.type || "audio/webm",
  });

  if (!text) {
    return { ok: false, error: "Couldn't transcribe that — try typing instead." };
  }

  return { ok: true, text };
}
