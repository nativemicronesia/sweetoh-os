import { createHash } from "node:crypto";
import sharp from "sharp";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiCreationSession, auditEvent, product } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";
import { approveAsset, createAssetWithUpload, getAssetById, getAssetSignedUrl, validateImageUpload } from "@/lib/domains/assets/service";
import { addProductMediaUpload } from "@/lib/domains/catalog/service";
import { downloadFromBucket } from "@/lib/storage/client";
import { researchProduct, generateBlankMockup } from "@/lib/integrations/ai/product-research";
import { ValidationError } from "@/lib/shared/errors";
import { refundCredits, spendCredits } from "@/lib/domains/creator/credits";
import { actionCreditsForKey } from "@/lib/domains/creator/plans";
import { getActorProductDraft, listActorProductDrafts, persistDraftProduct } from "./service";
import { builderRecord, type BuilderRecord, type ProductResearch } from "./product-research-schema";
import { plainCatalogDescription } from "@/lib/integrations/printify/catalog";

export function assertBuilderRole(session: SessionUser) {
  // Creators manage blanks inside their own private workspace (session.ventureId).
  if (session.role !== "partner" && session.role !== "owner" && session.role !== "creator") throw new ValidationError("Sign in to manage product blanks.");
}

/**
 * Durable reservation: parallel clicks and multiple server instances share the same budget.
 * Creators pay in credits (see lib/domains/creator/plans.ts); the partner keeps her daily
 * allowance. Returns a refund callback for when the AI call itself fails.
 */
export async function reservePartnerAi(session: SessionUser, key: string): Promise<() => Promise<void>> {
  assertBuilderRole(session);
  if (session.role === "creator") {
    const ledgerId = await spendCredits({ userId: session.appUser.id, amount: actionCreditsForKey(key), reason: studioReason(key), metadata: { key: key.slice(0, 200) } });
    return () => refundCredits(session.appUser.id, ledgerId).catch(() => undefined);
  }
  await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${session.appUser.id}))`);
    const recent = await tx.select().from(auditEvent).where(and(
      eq(auditEvent.ventureId, session.ventureId), eq(auditEvent.actorUserId, session.appUser.id),
      eq(auditEvent.action, "partner_ai.reserved"), gte(auditEvent.createdAt, new Date(Date.now() - 86400000)),
    ));
    const configured = Number(process.env.PARTNER_AI_DAILY_LIMIT ?? 150);
    const limit = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 150;
    if (recent.length >= limit) throw new ValidationError("Today's AI allowance has been reached. Your saved blanks, artwork, and manual editing are still available.");
    if (recent.some(r => r.createdAt.getTime() > Date.now() - 180000 && (r.metadata as { key?: string })?.key === key)) {
      throw new ValidationError("That request is already being prepared. Check your saved drafts before trying again in a few minutes.");
    }
    await tx.insert(auditEvent).values({ ventureId: session.ventureId, actorUserId: session.appUser.id,
      action: "partner_ai.reserved", entityType: "partner_builder", entityId: session.appUser.id, metadata: { key } });
  });
  return async () => undefined;
}

function studioReason(key: string) {
  const prefix = key.split(":")[0].replace(/^premium-/, "");
  return ({ art: "AI design", pattern: "AI pattern", edit: "AI edit", bg: "Remove background", "blank-cutout": "Product cutout",
    "blank-screen": "Read product photo", "blank-understand": "Find print areas", blank: "Blank preview" } as Record<string, string>)[prefix] ?? "Product research";
}

export async function preparePartnerProduct(session: SessionUser, input: {
  file: Buffer; mimeType: string; notes: string; sourceUrl: string;
  purpose: "blank" | "finished"; useAi: boolean; name: string;
}) {
  assertBuilderRole(session);
  validateImageUpload({ mimeType: input.mimeType, sizeBytes: input.file.length });
  // Decode and normalize before sending to providers; strip camera metadata.
  const image = await sharp(input.file, { limitInputPixels: 40_000_000 }).rotate().resize(1800, 1800, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const fingerprint = createHash("sha256").update(image).update(JSON.stringify([input.notes, input.sourceUrl, input.purpose, input.useAi, input.name])).digest("hex");
  const previous = await listActorProductDrafts({ ventureId: session.ventureId, actorUserId: session.appUser.id });
  const cached = previous.find(row => row.product.draftStatus !== "archived" && row.product.draftStatus !== "rejected" && builderRecord(row.session.rawResponse)?.fingerprint === fingerprint);
  if (cached) return cached.product;
  let research: ProductResearch | null = null;
  if (input.useAi) {
    await reservePartnerAi(session, fingerprint);
    research = await researchProduct({ image, mimeType: "image/png", notes: [input.name, input.notes].filter(Boolean).join("\n"), sourceUrl: input.sourceUrl, purpose: input.purpose });
  }
  const name = research?.title || input.name.trim();
  if (!name) throw new ValidationError("Give your product a name when saving without AI.");
  const source = await createAssetWithUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
    uploadedById: session.appUser.id, name: `${name} — reference photo`, assetType: "product_asset",
    file: image, filename: "reference.png", mimeType: "image/png", notes: "Original partner product reference; not reusable artwork." });
  const record: BuilderRecord = { kind: "partner_product_builder", purpose: input.purpose, fingerprint, research,
    confirmed: false };
  const saved = await persistDraftProduct({ ventureId: session.ventureId, actorUserId: session.appUser.id,
    mode: "visual_intake", prompt: input.useAi ? "Partner product research" : "Partner manual product entry (no AI)",
    rawResponse: record, sourceAssetId: source.id, primaryAssetId: source.id,
    output: { title: name, description: research?.description || plainCatalogDescription(input.notes ?? ""), shortDescription: research?.description.slice(0, 160) || "",
      seoTitle: name.slice(0, 60), seoDescription: research?.description.slice(0, 160) || "", category: research?.category || "custom",
      suggestedTags: [], suggestedCollections: [], suggestedPriceCents: 0,
      internalNotes: research ? [research.evidence, ...research.unknowns].join("\n") : input.notes },
  });
  // Finished products use the real photograph. Blank previews stay private assets.
  if (input.purpose === "finished") await addProductMediaUpload({ ventureId: session.ventureId,
    ventureSlug: session.ventureSlug, productId: saved.product.id, actorUserId: session.appUser.id,
    file: image, filename: "product.png", mimeType: "image/png", assetId: source.id });
  return saved.product;
}

export async function getOwnedBuilder(session: SessionUser, productId: string) {
  assertBuilderRole(session);
  const row = await getActorProductDraft({ ventureId: session.ventureId, actorUserId: session.appUser.id, productId });
  const record = builderRecord(row?.session.rawResponse);
  if (!row || !record) throw new ValidationError("This product is not in your builder workspace.");
  return { ...row, record };
}

export async function confirmBuilderProduct(session: SessionUser, productId: string) {
  const row = await getOwnedBuilder(session, productId);
  if (row.product.sourceAssetId) await approveAsset({ ventureId: session.ventureId, assetId: row.product.sourceAssetId, approvedById: session.appUser.id });
  await getDb().update(aiCreationSession).set({ rawResponse: { ...row.record, confirmed: true } }).where(eq(aiCreationSession.id, row.session.id));
}

export async function prepareBlankPreview(session: SessionUser, productId: string) {
  const row = await getOwnedBuilder(session, productId);
  if (row.record.purpose !== "blank" || !row.product.sourceAssetId) throw new ValidationError("Upload a product photo before generating its blank.");
  if (row.record.mockupAssetId) return row.record.mockupAssetId;
  if (!row.record.confirmed) throw new ValidationError("Confirm the product match before generating a blank preview.");
  await reservePartnerAi(session, `blank:${productId}`);
  const source = await getAssetById({ ventureId: session.ventureId, assetId: row.product.sourceAssetId });
  const bytes = await downloadFromBucket({ bucket: source.bucket, objectKey: source.objectKey });
  const preview = await generateBlankMockup(Buffer.from(bytes), source.mimeType || "image/png", row.record.research ?? { mockupPrompt: row.product.name });
  const image = await createAssetWithUpload({ ventureId: session.ventureId, ventureSlug: session.ventureSlug,
    uploadedById: session.appUser.id, name: `${row.product.name} — generated blank preview`, assetType: "product_asset",
    file: preview, filename: "blank-preview.png", mimeType: "image/png", notes: "AI-generated visual preview. Verify appearance and print area before production." });
  await getDb().update(aiCreationSession).set({ rawResponse: { ...row.record, mockupAssetId: image.id } }).where(eq(aiCreationSession.id, row.session.id));
  return image.id;
}

export async function listBuilderBlanks(session: SessionUser) {
  const rows = await listActorProductDrafts({ ventureId: session.ventureId, actorUserId: session.appUser.id });
  return Promise.all(rows.filter(row => {
    const data = builderRecord(row.session.rawResponse);
    return data?.purpose === "blank" && data.confirmed && row.product.draftStatus !== "archived";
  }).map(async row => {
    const data = builderRecord(row.session.rawResponse)!;
    const assetId = data.mockupAssetId || row.product.sourceAssetId;
    return { id: row.product.id, name: row.product.name, category: row.product.category, description: row.product.description, printArea: row.product.printArea,
      variantOptions: row.product.variantOptions, catalogSource: row.product.catalogSource,
      imageUrl: row.product.printArea?.surfaces?.[0]?.imageUrl ?? (assetId ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId }) : null) };
  }));
}
