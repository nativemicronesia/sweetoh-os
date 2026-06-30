import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appUser, auditEvent } from "@/lib/db/schema";
import { INTELLIGENCE_AUDIT_ACTIONS } from "./types";

export async function listAiAuditEvents(input: {
  ventureId: string;
  limit?: number;
}) {
  const db = getDb();
  const limit = input.limit ?? 100;

  return db
    .select({
      event: auditEvent,
      actorEmail: appUser.email,
      actorRole: appUser.role,
    })
    .from(auditEvent)
    .leftJoin(appUser, eq(auditEvent.actorUserId, appUser.id))
    .where(
      and(
        eq(auditEvent.ventureId, input.ventureId),
        inArray(auditEvent.action, [...INTELLIGENCE_AUDIT_ACTIONS]),
      ),
    )
    .orderBy(desc(auditEvent.createdAt))
    .limit(limit);
}

export async function countAiAuditEvents(ventureId: string): Promise<number> {
  const rows = await listAiAuditEvents({ ventureId, limit: 500 });
  return rows.length;
}
