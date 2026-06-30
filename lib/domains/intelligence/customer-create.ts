import { createCustomerRequestImageUpload } from "@/lib/domains/assets/service";
import { createStudioProject, addStudioProjectAsset } from "@/lib/domains/studio/service";
import { sendCustomRequestReceivedEmail } from "@/lib/integrations/email/resend";
import { aiOutputAuditFields } from "@/lib/domains/audit/output";
import { aiPromptAuditFields } from "@/lib/domains/audit/prompt";
import { aiTimestampAuditFields } from "@/lib/domains/audit/timestamp";
import { aiCustomerAuditFields } from "@/lib/domains/audit/user";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { isMockAiEnabled, isOpenAiConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import { generateProductDraft } from "./product-builder";

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
  aiSummary?: string | null;
}): string {
  return [
    "Customer customization request (submitted via /create)",
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

/**
 * Guest /create flow — saves to Sweet'Oh Studio (studio_project). OpenAI is optional.
 */
export async function submitCustomerCustomizationRequest(input: {
  ventureId: string;
  ventureSlug: string;
  customerEmail: string;
  customerName?: string | null;
  prompt: string;
  referenceImage?: {
    file: Buffer;
    filename: string;
    mimeType: string;
  } | null;
}) {
  const prompt = input.prompt.trim();
  const email = input.customerEmail.trim().toLowerCase();
  const customerName = input.customerName?.trim() || null;

  if (!prompt) {
    throw new ValidationError("Describe what you would like to create.");
  }

  if (!email || !isValidEmail(email)) {
    throw new ValidationError("A valid email address is required.");
  }

  let projectName = `Request: ${summarizePrompt(prompt)}`;
  let aiSummary: string | null = null;
  let aiOutput: Awaited<ReturnType<typeof generateProductDraft>>["output"] | null =
    null;

  if (isOpenAiConfigured() || isMockAiEnabled()) {
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
  }

  const notes = buildCustomerNotes({
    email,
    customerName,
    prompt,
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

  if (input.referenceImage) {
    const asset = await createCustomerRequestImageUpload({
      ventureId: input.ventureId,
      ventureSlug: input.ventureSlug,
      studioProjectId: project.id,
      file: input.referenceImage.file,
      filename: input.referenceImage.filename,
      mimeType: input.referenceImage.mimeType,
    });

    await addStudioProjectAsset({
      ventureId: input.ventureId,
      projectId: project.id,
      assetId: asset.id,
      role: "reference",
      actorUserId: null,
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
      aiEnriched: Boolean(aiOutput),
      hasReferenceImage: Boolean(input.referenceImage),
      ...aiPromptAuditFields({ prompt }),
      ...(aiOutput ? aiOutputAuditFields({ output: aiOutput }) : {}),
      ...aiTimestampAuditFields(),
      ...aiCustomerAuditFields({ email, name: customerName }),
    },
  });

  return {
    projectId: project.id,
    title: aiOutput?.title ?? summarizePrompt(prompt),
  };
}
