import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiCreationSession, pieTemplates } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import {
  normalizePieOutput,
  type PieProductTemplate,
} from "./pie-output";
import { compoundPilOnTemplateApprove } from "./pil-service";

export type PieTemplateStatus = "draft" | "approved" | "archived";

export function extractTemplateFromSession(input: {
  intakeDetection: unknown;
  pieOutput?: unknown;
}): PieProductTemplate | null {
  const output = normalizePieOutput(input.pieOutput ?? input.intakeDetection);
  if (!output) {
    return null;
  }

  if (
    output.template &&
    (output.template.productType ||
      output.template.variantSlots?.length ||
      output.template.notes)
  ) {
    return output.template;
  }

  const { detection } = output;
  if (!detection.productType && !detection.variants?.length) {
    return null;
  }

  return {
    productType: detection.productType ?? detection.shape,
    variantSlots: detection.variants,
    personalizationSupported: undefined,
    notes: output.spec?.summary ?? output.spec?.productionNotes,
  };
}

export async function getPieTemplateForSourceProduct(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(pieTemplates)
    .where(
      and(
        eq(pieTemplates.ventureId, input.ventureId),
        eq(pieTemplates.sourceProductId, input.productId),
      ),
    )
    .orderBy(desc(pieTemplates.createdAt))
    .limit(1);

  return row ?? null;
}

export async function listPieTemplatesForVenture(ventureId: string) {
  const db = getDb();
  return db
    .select()
    .from(pieTemplates)
    .where(eq(pieTemplates.ventureId, ventureId))
    .orderBy(desc(pieTemplates.updatedAt));
}

export async function promotePieTemplateFromProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
  name: string;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new ValidationError("Template name is required.");
  }

  const db = getDb();

  const [session] = await db
    .select()
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.ventureId, input.ventureId),
        eq(aiCreationSession.productId, input.productId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  if (!session) {
    throw new ValidationError(
      "No Product Intelligence session found for this product.",
    );
  }

  const templateBody = extractTemplateFromSession({
    intakeDetection: session.intakeDetection,
    pieOutput: session.pieOutput,
  });

  if (!templateBody) {
    throw new ValidationError(
      "No template metadata on this draft. Run visual or text intake first.",
    );
  }

  const existing = await getPieTemplateForSourceProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  if (existing && existing.status !== "archived") {
    throw new ValidationError(
      "A template was already promoted from this product. Approve or archive it in PIE Templates.",
    );
  }

  const [row] = await db
    .insert(pieTemplates)
    .values({
      ventureId: input.ventureId,
      name,
      productType: templateBody.productType ?? null,
      template: templateBody,
      sourceSessionId: session.id,
      sourceProductId: input.productId,
      status: "draft",
      createdByUserId: input.actorUserId,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to promote PIE template");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product_intelligence.template_defined",
    entityType: "pie_template",
    entityId: row.id,
    metadata: {
      productId: input.productId,
      sessionId: session.id,
      templateName: name,
      status: row.status,
    },
  });

  return row;
}

export async function approvePieTemplate(input: {
  ventureId: string;
  templateId: string;
  actorUserId: string;
}) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(pieTemplates)
    .where(
      and(
        eq(pieTemplates.id, input.templateId),
        eq(pieTemplates.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("PIE template not found");
  }

  if (existing.status === "approved") {
    return existing;
  }

  const [row] = await db
    .update(pieTemplates)
    .set({
      status: "approved",
      approvedByUserId: input.actorUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pieTemplates.id, input.templateId))
    .returning();

  if (!row) {
    throw new Error("Failed to approve PIE template");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "pie_template.approved",
    entityType: "pie_template",
    entityId: row.id,
    metadata: {
      templateName: row.name,
      sourceProductId: row.sourceProductId,
    },
  });

  await compoundPilOnTemplateApprove({
    ventureId: input.ventureId,
    templateId: row.id,
    approvedByUserId: input.actorUserId,
  });

  return row;
}
