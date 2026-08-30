import {
  createCustomerRequestImageUpload,
  getAssetById,
  getAssetSignedUrl,
} from "@/lib/domains/assets/service";
import { getPrimaryProductImageBuffer } from "@/lib/domains/catalog/service";
import { createStudioProject, addStudioProjectAsset } from "@/lib/domains/studio/service";
import { sendCustomRequestReceivedEmail } from "@/lib/integrations/email/resend";
import { aiOutputAuditFields } from "@/lib/domains/audit/output";
import { aiPromptAuditFields } from "@/lib/domains/audit/prompt";
import { aiTimestampAuditFields } from "@/lib/domains/audit/timestamp";
import { aiCustomerAuditFields } from "@/lib/domains/audit/user";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { isMockAiEnabled, isOpenAiConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import { downloadFromBucket } from "@/lib/storage/client";
import { generateProductDraft } from "./product-builder";
import {
  composeBlankMockup,
  generateProductMockup,
} from "./mockup-builder";

export type StudioDesignMode = "ai" | "upload" | "library" | "place";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function summarizePrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= 60) {
    return trimmed;
  }

  return `${trimmed.slice(0, 57)}…`;
}

function buildCustomerNotes(input: {
  email: string;
  customerName: string | null;
  prompt: string;
  designMode: StudioDesignMode;
  blankProductName: string | null;
  aiSummary?: string | null;
}): string {
  return [
    "Customer Studio design (submitted via /studio)",
    `Mode: ${input.designMode}`,
    input.blankProductName ? `Blank: ${input.blankProductName}` : null,
    `Contact: ${input.customerName ?? input.email}`,
    `Email: ${input.email}`,
    "",
    "--- Customer request ---",
    input.prompt,
    input.aiSummary
      ? ["", "--- AI draft summary (owner review) ---", input.aiSummary].join("\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMockupPrompt(input: {
  prompt: string;
  blankProductName: string | null;
  designMode: StudioDesignMode;
  hasBlankImage: boolean;
  hasDesignImage: boolean;
}): string {
  const blank = input.blankProductName?.trim() || "print-on-demand product";

  if (input.designMode === "ai") {
    if (input.hasBlankImage) {
      return [
        `Edit this blank ${blank} into a photorealistic ecommerce catalog mockup.`,
        `Apply this custom design onto the printable area naturally (print texture, slight fabric wrap, correct perspective): ${input.prompt}.`,
        "Keep the product shape, color, and framing. Soft studio lighting. No watermarks, no text overlays, no extra props.",
      ].join(" ");
    }
    return `Photorealistic ecommerce mockup of a ${blank} featuring this design: ${input.prompt}. Soft studio lighting, centered, catalog style. No watermarks.`;
  }

  if (input.hasBlankImage && input.hasDesignImage) {
    return [
      `Use the first image as the blank ${blank} and the second as the artwork.`,
      "Place the artwork cleanly on the printable area with realistic print texture and perspective.",
      "Keep product shape and color. Soft studio lighting, ecommerce catalog style. No watermarks.",
      input.prompt ? `Customer notes: ${input.prompt}` : null,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return `Photorealistic product mockup of a ${blank} with the provided artwork applied cleanly on the printable area. Soft studio lighting, centered, ecommerce catalog style. ${input.prompt}`.trim();
}

/**
 * Guest Studio flow — blank + AI / upload / library / place → mockup preview.
 * Saves to Sweet'Oh Studio (studio_project). OpenAI is optional; upload/library
 * still work via sharp composite when generation is unavailable.
 */
export async function submitCustomerCustomizationRequest(input: {
  ventureId: string;
  ventureSlug: string;
  customerEmail: string;
  customerName?: string | null;
  prompt: string;
  designMode?: StudioDesignMode;
  blankProductName?: string | null;
  blankProductId?: string | null;
  libraryAssetId?: string | null;
  referenceImage?: {
    file: Buffer;
    filename: string;
    mimeType: string;
  } | null;
}) {
  const designMode: StudioDesignMode = input.designMode ?? "ai";
  const blankProductName = input.blankProductName?.trim() || null;
  const blankProductId = input.blankProductId?.trim() || null;
  let prompt = input.prompt.trim();
  const email = input.customerEmail.trim().toLowerCase();
  const customerName = input.customerName?.trim() || null;

  if (!email || !isValidEmail(email)) {
    throw new ValidationError("A valid email address is required.");
  }

  let referenceImage = input.referenceImage ?? null;

  if (designMode === "library") {
    if (!input.libraryAssetId?.trim()) {
      throw new ValidationError("Pick a design from the Sweet'Oh library.");
    }
    const libraryAsset = await getAssetById({
      ventureId: input.ventureId,
      assetId: input.libraryAssetId,
    });
    if (libraryAsset.assetType !== "sweetoh_design" || libraryAsset.status !== "approved") {
      throw new ValidationError("That library design isn't available.");
    }
    const bytes = await downloadFromBucket({
      bucket: libraryAsset.bucket,
      objectKey: libraryAsset.objectKey,
    });
    referenceImage = {
      file: bytes,
      filename: `${libraryAsset.name || "library-design"}.png`,
      mimeType: libraryAsset.mimeType || "image/png",
    };
    if (!prompt) {
      prompt = `Apply library design "${libraryAsset.name}" to the selected blank.`;
    }
  } else if (designMode === "upload" || designMode === "place") {
    if (!referenceImage) {
      throw new ValidationError(
        designMode === "place"
          ? "Place your design on the blank, then export a preview."
          : "Upload a design image to place on your blank.",
      );
    }
    if (!prompt) {
      prompt = blankProductName
        ? `Customer artwork for ${blankProductName}.`
        : "Customer uploaded artwork for a print-on-demand blank.";
    }
  } else if (!prompt) {
    throw new ValidationError("Describe what you would like to create.");
  }

  let projectName = `Request: ${summarizePrompt(prompt)}`;
  let aiSummary: string | null = null;
  let aiOutput: Awaited<ReturnType<typeof generateProductDraft>>["output"] | null =
    null;

  if (designMode === "ai" && (isOpenAiConfigured() || isMockAiEnabled())) {
    try {
      const { output } = await generateProductDraft({ prompt });
      aiOutput = output;
      projectName = `Customize: ${output.title}`;
      aiSummary = [
        output.shortDescription,
        "",
        output.description,
        output.suggestedTags.length
          ? `Suggested tags: ${output.suggestedTags.join(", ")}`
          : null,
        output.internalNotes ? `Production notes: ${output.internalNotes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    } catch {
      // Launch path: raw customer request still saves when AI is unavailable.
    }
  } else if (designMode === "library") {
    projectName = `Customize: ${summarizePrompt(prompt)}`;
  } else if (designMode === "place") {
    projectName = `Placed: ${summarizePrompt(prompt)}`;
  } else if (designMode === "upload") {
    projectName = `Upload: ${summarizePrompt(prompt)}`;
  }

  const notes = buildCustomerNotes({
    email,
    customerName,
    prompt,
    designMode,
    blankProductName,
    aiSummary,
  });

  const project = await createStudioProject({
    ventureId: input.ventureId,
    name: projectName,
    notes,
    customerEmail: email,
    customerName,
    actorUserId: null,
  });

  await sendCustomRequestReceivedEmail({
    to: email,
    customerName,
    title: aiOutput?.title ?? summarizePrompt(prompt),
    projectId: project.id,
  });

  if (referenceImage) {
    const asset = await createCustomerRequestImageUpload({
      ventureId: input.ventureId,
      ventureSlug: input.ventureSlug,
      studioProjectId: project.id,
      file: referenceImage.file,
      filename: referenceImage.filename,
      mimeType: referenceImage.mimeType,
    });

    await addStudioProjectAsset({
      ventureId: input.ventureId,
      projectId: project.id,
      assetId: asset.id,
      role: "reference",
      actorUserId: null,
    });
  }

  const blankImageBuffer = blankProductId
    ? await getPrimaryProductImageBuffer(blankProductId)
    : null;

  let mockupPreviewUrl: string | null = null;
  let mockupBytes: Buffer | null = null;
  let mockupMime = "image/png";
  let mockupSource: "place" | "composite" | "ai" | "reference" | null = null;

  // Canvas "Place" export is already blank+design — keep placement fidelity.
  if (designMode === "place" && referenceImage) {
    mockupBytes = referenceImage.file;
    mockupMime = referenceImage.mimeType || "image/png";
    mockupSource = "place";
  } else {
    const mockupPrompt = buildMockupPrompt({
      prompt,
      blankProductName,
      designMode,
      hasBlankImage: Boolean(blankImageBuffer),
      hasDesignImage: Boolean(referenceImage),
    });

    const aiMockup = await generateProductMockup({
      prompt: mockupPrompt,
      referenceImageBuffer: referenceImage?.file,
      referenceImageMimeType: referenceImage?.mimeType,
      blankImageBuffer: blankImageBuffer ?? undefined,
      blankImageMimeType: blankImageBuffer ? "image/png" : undefined,
    }).catch(() => null);

    if (aiMockup) {
      mockupBytes = aiMockup;
      mockupSource = "ai";
    } else if (blankImageBuffer && referenceImage) {
      try {
        mockupBytes = await composeBlankMockup({
          blankImageBuffer,
          designBuffer: referenceImage.file,
        });
        mockupSource = "composite";
      } catch {
        mockupBytes = referenceImage.file;
        mockupMime = referenceImage.mimeType || "image/png";
        mockupSource = "reference";
      }
    } else if (referenceImage) {
      mockupBytes = referenceImage.file;
      mockupMime = referenceImage.mimeType || "image/png";
      mockupSource = "reference";
    }
  }

  if (mockupBytes) {
    const mockupAsset = await createCustomerRequestImageUpload({
      ventureId: input.ventureId,
      ventureSlug: input.ventureSlug,
      studioProjectId: project.id,
      file: mockupBytes,
      filename: "mockup.png",
      mimeType: mockupMime,
    });

    await addStudioProjectAsset({
      ventureId: input.ventureId,
      projectId: project.id,
      assetId: mockupAsset.id,
      role: "mockup",
      actorUserId: null,
    });

    mockupPreviewUrl = await getAssetSignedUrl({
      ventureId: input.ventureId,
      assetId: mockupAsset.id,
    });
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: null,
    action: "customer_customization.submitted",
    entityType: "studio_project",
    entityId: project.id,
    metadata: {
      customerEmail: email,
      customerName,
      designMode,
      blankProductName,
      blankProductId,
      mockupSource,
      aiEnriched: Boolean(aiOutput),
      hasReferenceImage: Boolean(referenceImage),
      hasBlankImage: Boolean(blankImageBuffer),
      libraryAssetId: input.libraryAssetId ?? null,
      ...aiPromptAuditFields({ prompt }),
      ...(aiOutput ? aiOutputAuditFields({ output: aiOutput }) : {}),
      ...aiTimestampAuditFields(),
      ...aiCustomerAuditFields({ email, name: customerName }),
    },
  });

  return {
    projectId: project.id,
    title: aiOutput?.title ?? summarizePrompt(prompt),
    mockupPreviewUrl,
  };
}
