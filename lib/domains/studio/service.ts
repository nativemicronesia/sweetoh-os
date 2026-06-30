import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset, studioProject, studioProjectAsset } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { getAssetById } from "@/lib/domains/assets/service";
import { NotFoundError } from "@/lib/shared/errors";
import {
  isCustomerCustomizationRequest,
} from "./customer-request";
import type { StudioProjectAssetRole, StudioProjectStatus } from "./types";

export async function createStudioProject(input: {
  ventureId: string;
  name: string;
  notes?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  actorUserId?: string | null;
}) {
  const db = getDb();

  const [row] = await db
    .insert(studioProject)
    .values({
      ventureId: input.ventureId,
      name: input.name,
      notes: input.notes ?? null,
      customerEmail: input.customerEmail ?? null,
      customerName: input.customerName ?? null,
      createdById: input.actorUserId ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create studio project");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "studio_project.created",
    entityType: "studio_project",
    entityId: row.id,
    metadata: { name: row.name },
  });

  return row;
}

export async function listStudioProjects(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(studioProject)
    .where(eq(studioProject.ventureId, ventureId))
    .orderBy(desc(studioProject.updatedAt));
}

export async function listCustomerCustomizationRequests(ventureId: string) {
  const projects = await listStudioProjects(ventureId);
  return projects.filter((project) =>
    isCustomerCustomizationRequest(project.notes),
  );
}

export async function getStudioProjectById(input: {
  ventureId: string;
  projectId: string;
}) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(studioProject)
    .where(
      and(
        eq(studioProject.id, input.projectId),
        eq(studioProject.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Studio project not found");
  }

  const links = await db
    .select({ link: studioProjectAsset, asset })
    .from(studioProjectAsset)
    .innerJoin(asset, eq(studioProjectAsset.assetId, asset.id))
    .where(eq(studioProjectAsset.studioProjectId, row.id))
    .orderBy(studioProjectAsset.sortOrder);

  return { project: row, links };
}

export async function updateStudioProjectStatus(input: {
  ventureId: string;
  projectId: string;
  status: StudioProjectStatus;
  actorUserId: string;
}) {
  const db = getDb();

  const [row] = await db
    .update(studioProject)
    .set({ status: input.status, updatedAt: new Date() })
    .where(
      and(
        eq(studioProject.id, input.projectId),
        eq(studioProject.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Studio project not found");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "studio_project.status_updated",
    entityType: "studio_project",
    entityId: row.id,
    metadata: { status: input.status },
  });

  return row;
}

export async function updateStudioProjectInternalNotes(input: {
  ventureId: string;
  projectId: string;
  internalNotes: string | null;
  actorUserId: string;
}) {
  const db = getDb();

  const [row] = await db
    .update(studioProject)
    .set({
      internalNotes: input.internalNotes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(studioProject.id, input.projectId),
        eq(studioProject.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Studio project not found");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "studio_project.internal_notes_updated",
    entityType: "studio_project",
    entityId: row.id,
    metadata: { hasInternalNotes: Boolean(input.internalNotes?.trim()) },
  });

  return row;
}

export async function addStudioProjectAsset(input: {
  ventureId: string;
  projectId: string;
  assetId: string;
  role: StudioProjectAssetRole;
  actorUserId: string | null;
}) {
  const db = getDb();

  await getAssetById({ ventureId: input.ventureId, assetId: input.assetId });

  const [project] = await db
    .select()
    .from(studioProject)
    .where(
      and(
        eq(studioProject.id, input.projectId),
        eq(studioProject.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("Studio project not found");
  }

  const [row] = await db
    .insert(studioProjectAsset)
    .values({
      studioProjectId: input.projectId,
      assetId: input.assetId,
      role: input.role,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to link asset to studio project");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "studio_project.asset_added",
    entityType: "studio_project",
    entityId: input.projectId,
    metadata: { assetId: input.assetId, role: input.role },
  });

  return row;
}

export async function removeStudioProjectAsset(input: {
  ventureId: string;
  projectId: string;
  linkId: string;
  actorUserId: string;
}) {
  const db = getDb();

  const [project] = await db
    .select()
    .from(studioProject)
    .where(
      and(
        eq(studioProject.id, input.projectId),
        eq(studioProject.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!project) {
    throw new NotFoundError("Studio project not found");
  }

  await db
    .delete(studioProjectAsset)
    .where(
      and(
        eq(studioProjectAsset.id, input.linkId),
        eq(studioProjectAsset.studioProjectId, input.projectId),
      ),
    );

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "studio_project.asset_removed",
    entityType: "studio_project",
    entityId: input.projectId,
    metadata: { linkId: input.linkId },
  });
}
