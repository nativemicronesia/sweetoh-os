import { getDb } from "@/lib/db/client";
import { auditEvent } from "@/lib/db/schema";

export async function recordAuditEvent(input: {
  ventureId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();

  const [row] = await db
    .insert(auditEvent)
    .values({
      ventureId: input.ventureId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? null,
    })
    .returning();

  return row;
}
