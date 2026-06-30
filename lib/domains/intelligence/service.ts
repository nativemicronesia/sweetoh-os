import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  aiCreationSession,
  aiCreationSessionAsset,
  appUser,
  asset,
  product,
  productMedia,
} from "@/lib/db/schema";
import { createAssetWithUpload } from "@/lib/domains/assets/service";
import { addProductMediaUpload } from "@/lib/domains/catalog/service";
import type { ProductCategory } from "@/lib/domains/catalog/publish";
import { REVIEW_QUEUE_DRAFT_STATUSES } from "@/lib/domains/catalog/draft-status";
import { aiOutputAuditFields } from "@/lib/domains/audit/output";
import { aiPromptAuditFields } from "@/lib/domains/audit/prompt";
import { aiTimestampAuditFields } from "@/lib/domains/audit/timestamp";
import { resolveAiUserAuditFields } from "@/lib/domains/audit/user";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { analyzeProductImage } from "@/lib/domains/intelligence/intake-service";
import type { ProductDraftOutput } from "@/lib/integrations/ai/types";
import type { VisualIntakeOutput } from "@/lib/integrations/ai/intake-types";
import { ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import { applyMockDraftPublishFixtures } from "./mock-fixtures";
import { generateProductDraft } from "./product-builder";
import {
  getPieOutputForSession,
  parsePieOutputJson,
  pieOutputFromDetection,
  pieOutputToLegacyDetection,
  type PieOutputV1,
} from "./pie-output";

type DbClient = ReturnType<typeof getDb>;

const VALID_CATEGORIES: ProductCategory[] = [
  "baby_me",
  "toys_sensory",
  "sweetoh_creations",
  "originals",
];

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "product";
}

async function generateUniqueSlug(
  db: DbClient,
  ventureId: string,
  title: string,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const [existing] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.ventureId, ventureId), eq(product.slug, candidate)))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

function normalizeCategory(category: ProductCategory): ProductCategory {
  if (!VALID_CATEGORIES.includes(category)) {
    logger.warn("ai_product_draft_invalid_category", { returned: category });
    return "sweetoh_creations";
  }

  return category;
}

function inferFulfillmentType(category: ProductCategory): "dropship" | "sweetoh" {
  return category === "sweetoh_creations" ? "sweetoh" : "dropship";
}

function buildVisualIntakeSessionPrompt(input: {
  title: string;
  filename: string;
  textPrompt?: string | null;
  inputMode: "image_only" | "image_and_prompt";
}): string {
  if (input.inputMode === "image_and_prompt" && input.textPrompt?.trim()) {
    return input.textPrompt.trim();
  }

  return `Visual intake (image only): analyze ${input.filename} and draft "${input.title}".`;
}

async function persistDraftProduct(input: {
  ventureId: string;
  actorUserId: string;
  output: ProductDraftOutput;
  rawResponse: unknown;
  mode: "text_prompt" | "visual_intake";
  prompt: string;
  operatorNotes?: string | null;
  confidenceScore?: number | null;
  intakeDetection?: VisualIntakeOutput["detection"] | null;
  pieOutput?: PieOutputV1 | null;
  sourceAssetId?: string | null;
  primaryAssetId?: string | null;
  fulfillmentType?: "dropship" | "sweetoh";
}) {
  const db = getDb();
  const category = normalizeCategory(input.output.category);
  const slug = await generateUniqueSlug(db, input.ventureId, input.output.title);

  const pieOutput =
    input.pieOutput ??
    pieOutputFromDetection(input.intakeDetection ?? undefined);
  const legacyDetection = pieOutputToLegacyDetection(pieOutput);

  const { productRow, sessionRow } = await db.transaction(async (tx) => {
    const [insertedProduct] = await tx
      .insert(product)
      .values({
        ventureId: input.ventureId,
        slug,
        name: input.output.title,
        description: input.output.description,
        shortDescription: input.output.shortDescription,
        seoTitle: input.output.seoTitle,
        seoDescription: input.output.seoDescription,
        internalNotes: input.output.internalNotes,
        suggestedTags: input.output.suggestedTags,
        suggestedCollections: input.output.suggestedCollections,
        category,
        fulfillmentType:
          input.fulfillmentType ?? inferFulfillmentType(category),
        sourceAssetId: input.sourceAssetId ?? null,
        priceCents: Math.max(0, Math.round(input.output.suggestedPriceCents ?? 0)),
        active: false,
        draftStatus: "draft",
      })
      .returning();

    if (!insertedProduct) {
      throw new Error("Failed to create draft product");
    }

    const [insertedSession] = await tx
      .insert(aiCreationSession)
      .values({
        ventureId: input.ventureId,
        actorUserId: input.actorUserId,
        mode: input.mode,
        prompt: input.prompt,
        operatorNotes: input.operatorNotes ?? null,
        confidenceScore: input.confidenceScore ?? null,
        intakeDetection: legacyDetection,
        pieOutput,
        productId: insertedProduct.id,
        rawResponse: input.rawResponse,
      })
      .returning();

    if (!insertedSession) {
      throw new Error("Failed to record AI creation session");
    }

    if (input.primaryAssetId) {
      await tx.insert(aiCreationSessionAsset).values({
        sessionId: insertedSession.id,
        assetId: input.primaryAssetId,
        role: "primary",
      });
    }

    return { productRow: insertedProduct, sessionRow: insertedSession };
  });

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "ai_creation_session.created",
    entityType: "ai_creation_session",
    entityId: sessionRow.id,
    metadata: {
      productId: productRow.id,
      mode: input.mode,
      productName: productRow.name,
      category: productRow.category,
      confidenceScore: input.confidenceScore ?? null,
      ...aiPromptAuditFields({
        prompt: input.prompt,
        operatorNotes: input.operatorNotes,
        mode: input.mode,
      }),
      ...aiOutputAuditFields({ output: input.output }),
      ...aiTimestampAuditFields(sessionRow.createdAt),
      ...actorFields,
    },
  });

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.ai_drafted",
    entityType: "product",
    entityId: productRow.id,
    metadata: {
      sessionId: sessionRow.id,
      mode: input.mode,
      productName: productRow.name,
      category: productRow.category,
      suggestedTags: input.output.suggestedTags,
      suggestedCollections: input.output.suggestedCollections,
      ...aiPromptAuditFields({
        prompt: input.prompt,
        operatorNotes: input.operatorNotes,
        mode: input.mode,
      }),
      ...aiOutputAuditFields({ output: input.output }),
      ...aiTimestampAuditFields(sessionRow.createdAt),
      ...actorFields,
    },
  });

  logger.info("product_ai_drafted", {
    productId: productRow.id,
    ventureId: input.ventureId,
    mode: input.mode,
  });

  return { product: productRow, session: sessionRow };
}

/** Confirms the draft row and AI session exist — required for dashboard + review queue visibility. */
export async function verifySavedAiProductDraft(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();
  const [productRow] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!productRow) {
    throw new ValidationError(
      "Product draft failed to save. Check database connectivity and run npm run db:migrate.",
    );
  }

  const [sessionRow] = await db
    .select()
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.productId, input.productId),
        eq(aiCreationSession.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!sessionRow) {
    throw new ValidationError(
      "AI session failed to save. The product may not appear in the review queue.",
    );
  }

  return { product: productRow, session: sessionRow };
}

/** Inactive AI-backed drafts for owner review (all actors). */
export async function listVentureAiDraftsForReview(ventureId: string) {
  const db = getDb();

  return db
    .select({
      product,
      session: aiCreationSession,
      actorEmail: appUser.email,
      actorRole: appUser.role,
    })
    .from(aiCreationSession)
    .innerJoin(product, eq(aiCreationSession.productId, product.id))
    .leftJoin(appUser, eq(aiCreationSession.actorUserId, appUser.id))
    .where(
      and(
        eq(aiCreationSession.ventureId, ventureId),
        eq(product.active, false),
        inArray(product.draftStatus, [...REVIEW_QUEUE_DRAFT_STATUSES]),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt));
}

/** Partner (or owner) AI drafts — read-only handoff list; partners cannot publish. */
export async function listActorProductDrafts(input: {
  ventureId: string;
  actorUserId: string;
}) {
  const db = getDb();

  return db
    .select({
      product,
      session: aiCreationSession,
    })
    .from(aiCreationSession)
    .innerJoin(product, eq(aiCreationSession.productId, product.id))
    .where(
      and(
        eq(aiCreationSession.ventureId, input.ventureId),
        eq(aiCreationSession.actorUserId, input.actorUserId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt));
}

/** Partner-owned AI draft by product id (null if not owned). */
export async function getActorProductDraft(input: {
  ventureId: string;
  actorUserId: string;
  productId: string;
}) {
  const rows = await listActorProductDrafts({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
  });

  return rows.find((row) => row.product.id === input.productId) ?? null;
}

export async function createProductDraftFromPrompt(input: {
  ventureId: string;
  ventureSlug: string;
  actorUserId: string;
  prompt: string;
}) {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new ValidationError("Describe the product you want to create.");
  }

  const { output, rawResponse } = await generateProductDraft({ prompt });

  const { product: productRow } = await persistDraftProduct({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    output,
    rawResponse,
    mode: "text_prompt",
    prompt,
  });

  await applyMockDraftPublishFixtures({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    productId: productRow.id,
    actorUserId: input.actorUserId,
    fulfillmentType: productRow.fulfillmentType as "dropship" | "sweetoh",
  });

  await verifySavedAiProductDraft({
    ventureId: input.ventureId,
    productId: productRow.id,
  });

  return productRow;
}

export async function createProductDraftFromVisualIntake(input: {
  ventureId: string;
  ventureSlug: string;
  actorUserId: string;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
  /** @deprecated use textPrompt */
  operatorNotes?: string | null;
  textPrompt?: string | null;
  inputMode?: "image_only" | "image_and_prompt";
}) {
  if (!input.mimeType.startsWith("image/")) {
    throw new ValidationError("Visual intake requires an image file.");
  }

  const textPrompt =
    input.textPrompt?.trim() || input.operatorNotes?.trim() || null;
  const inputMode =
    input.inputMode ?? (textPrompt ? "image_and_prompt" : "image_only");

  if (inputMode === "image_and_prompt" && !textPrompt) {
    throw new ValidationError(
      "Image + text mode requires operator context in the text field.",
    );
  }

  const imageBase64 = Buffer.from(input.file).toString("base64");

  const { output, rawResponse } = await analyzeProductImage({
    imageBase64,
    mimeType: input.mimeType,
    operatorNotes: textPrompt ?? undefined,
    inputMode,
  });

  const intakeAsset = await createAssetWithUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    uploadedById: input.actorUserId,
    name: `Visual intake — ${output.title}`,
    assetType: "product_asset",
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
    notes: textPrompt,
  });

  const sessionPrompt = buildVisualIntakeSessionPrompt({
    title: output.title,
    filename: input.filename,
    textPrompt,
    inputMode,
  });

  const { product: productRow } = await persistDraftProduct({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    output,
    rawResponse,
    mode: "visual_intake",
    prompt: sessionPrompt,
    operatorNotes: textPrompt,
    confidenceScore: output.confidenceScore,
    intakeDetection: output.detection,
    sourceAssetId: intakeAsset.id,
    primaryAssetId: intakeAsset.id,
  });

  await addProductMediaUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    productId: productRow.id,
    actorUserId: input.actorUserId,
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
    assetId: intakeAsset.id,
  });

  await applyMockDraftPublishFixtures({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    productId: productRow.id,
    actorUserId: input.actorUserId,
    fulfillmentType: productRow.fulfillmentType as "dropship" | "sweetoh",
    sourceAssetId: intakeAsset.id,
  });

  await verifySavedAiProductDraft({
    ventureId: input.ventureId,
    productId: productRow.id,
  });

  return productRow;
}

export async function getAiCreationSessionForProduct(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();

  const [session] = await db
    .select()
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.productId, input.productId),
        eq(aiCreationSession.ventureId, input.ventureId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  if (!session) {
    return null;
  }

  const sessionAssets = await db
    .select({ sessionAsset: aiCreationSessionAsset, asset })
    .from(aiCreationSessionAsset)
    .innerJoin(asset, eq(aiCreationSessionAsset.assetId, asset.id))
    .where(eq(aiCreationSessionAsset.sessionId, session.id));

  const media = await db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, input.productId))
    .orderBy(productMedia.sortOrder);

  return { session, sessionAssets, media };
}

export async function updatePieOutputForProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
  pieOutput: unknown;
}) {
  const db = getDb();
  const parsed = parsePieOutputJson(input.pieOutput);
  const legacyDetection = pieOutputToLegacyDetection(parsed);

  const [session] = await db
    .select()
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.productId, input.productId),
        eq(aiCreationSession.ventureId, input.ventureId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  if (!session) {
    throw new ValidationError("No Product Intelligence session for this product.");
  }

  const [row] = await db
    .update(aiCreationSession)
    .set({
      pieOutput: parsed,
      intakeDetection: legacyDetection,
    })
    .where(eq(aiCreationSession.id, session.id))
    .returning();

  if (!row) {
    throw new Error("Failed to update PIE output");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.ai_outputs_edited",
    entityType: "ai_creation_session",
    entityId: session.id,
    metadata: {
      productId: input.productId,
      version: parsed.version,
    },
  });

  return row;
}
