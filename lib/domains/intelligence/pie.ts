import { ValidationError } from "@/lib/shared/errors";
import { assertPieImageIntakeReady } from "./pie-readiness";
import { runProductIntelligenceIntake } from "./product-intelligence-service";
import {
  createProductDraftFromPrompt,
  createProductDraftFromVisualIntake,
} from "./service";

/**
 * Dekaz Capability: Product Intelligence Engine v1.
 * Internal-only — owner/partner draft creation; never auto-publishes.
 */
export type PieInputMode = "text_prompt" | "image_only" | "image_and_prompt";

export type PieDraftInput = {
  ventureId: string;
  ventureSlug: string;
  actorUserId: string;
  textPrompt?: string | null;
  file?: {
    buffer: Buffer | Uint8Array;
    filename: string;
    mimeType: string;
  } | null;
  /** When set (owner multi-column UI), skip resolvePieInputMode inference. */
  enforcedMode?: PieInputMode | null;
};

export function resolvePieInputMode(input: {
  textPrompt?: string | null;
  hasImage: boolean;
}): PieInputMode {
  const prompt = input.textPrompt?.trim() ?? "";

  if (prompt && input.hasImage) {
    return "image_and_prompt";
  }

  if (input.hasImage) {
    return "image_only";
  }

  if (prompt) {
    return "text_prompt";
  }

  throw new ValidationError(
    "Provide a text prompt, an uploaded image, or both.",
  );
}

export function describePieInputMode(mode: PieInputMode): string {
  switch (mode) {
    case "text_prompt":
      return "Text prompt";
    case "image_only":
      return "Uploaded image";
    case "image_and_prompt":
      return "Uploaded image + text prompt";
  }
}

export async function createPieProductDraft(input: PieDraftInput) {
  const textPrompt = input.textPrompt?.trim() || null;
  const hasImage = Boolean(input.file);

  const mode =
    input.enforcedMode ??
    resolvePieInputMode({ textPrompt, hasImage });

  if (mode === "image_only" || mode === "image_and_prompt") {
    if (!hasImage) {
      throw new ValidationError("This intake lane requires a product photo.");
    }
  }

  if (mode === "text_prompt" && !textPrompt) {
    throw new ValidationError("This intake lane requires a text prompt.");
  }

  if (mode === "text_prompt") {
    return createProductDraftFromPrompt({
      ventureId: input.ventureId,
      ventureSlug: input.ventureSlug,
      actorUserId: input.actorUserId,
      prompt: textPrompt!,
    });
  }

  const file = input.file!;

  if (!file.mimeType.startsWith("image/")) {
    throw new ValidationError(
      "Visual intake requires an image file (JPEG, PNG, etc.).",
    );
  }

  await assertPieImageIntakeReady();

  // Event flow: Upload -> PIE run, ahead of this domain's own draft
  // analysis. This codebase is the Product Intelligence Engine's first
  // consumer (see ports/product-intelligence-port.ts) -- a PIE failure
  // never blocks the existing draft pipeline.
  await runProductIntelligenceIntake({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    actorUserId: input.actorUserId,
    file: file.buffer,
    filename: file.filename,
    mimeType: file.mimeType,
  });

  return createProductDraftFromVisualIntake({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    actorUserId: input.actorUserId,
    file: file.buffer,
    filename: file.filename,
    mimeType: file.mimeType,
    textPrompt,
    inputMode: mode,
  });
}
