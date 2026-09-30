import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  auditEvent,
  fulfillmentEvent,
  fulfillmentJob,
  order,
  orderLineItem,
} from "@/lib/db/schema";
import { NotFoundError } from "@/lib/shared/errors";

export type FulfillmentPath = "dropship" | "sweetoh";
export type FulfillmentJobStatus =
  | "new"
  | "in_production"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "cancelled";

/** Omitted fields preserve existing shipping details; explicit null clears them. */
export function buildFulfillmentJobStatusUpdate(
  input: {
    status: FulfillmentJobStatus;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    notes?: string | null;
  },
  updatedAt = new Date(),
) {
  return {
    status: input.status,
    updatedAt,
    ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
    ...(input.trackingUrl !== undefined ? { trackingUrl: input.trackingUrl } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

export async function listFulfillmentJobs(input: {
  ventureId: string;
  path?: FulfillmentPath;
  statuses?: FulfillmentJobStatus[];
}) {
  const db = getDb();

  const conditions = [eq(fulfillmentJob.ventureId, input.ventureId)];
  if (input.path) {
    conditions.push(eq(fulfillmentJob.path, input.path));
  }
  if (input.statuses && input.statuses.length > 0) {
    conditions.push(inArray(fulfillmentJob.status, input.statuses));
  }

  return db
    .select({ job: fulfillmentJob, lineItem: orderLineItem, order })
    .from(fulfillmentJob)
    .innerJoin(orderLineItem, eq(fulfillmentJob.orderLineItemId, orderLineItem.id))
    .innerJoin(order, eq(fulfillmentJob.orderId, order.id))
    .where(and(...conditions))
    .orderBy(desc(fulfillmentJob.createdAt));
}

export async function getFulfillmentJobById(input: {
  ventureId: string;
  jobId: string;
}) {
  const db = getDb();

  const [row] = await db
    .select({ job: fulfillmentJob, lineItem: orderLineItem, order })
    .from(fulfillmentJob)
    .innerJoin(orderLineItem, eq(fulfillmentJob.orderLineItemId, orderLineItem.id))
    .innerJoin(order, eq(fulfillmentJob.orderId, order.id))
    .where(
      and(
        eq(fulfillmentJob.id, input.jobId),
        eq(fulfillmentJob.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Fulfillment job not found");
  }

  const events = await db
    .select()
    .from(fulfillmentEvent)
    .where(eq(fulfillmentEvent.fulfillmentJobId, row.job.id))
    .orderBy(desc(fulfillmentEvent.createdAt));

  return { ...row, events };
}

export async function updateFulfillmentJobStatus(input: {
  ventureId: string;
  jobId: string;
  status: FulfillmentJobStatus;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  notes?: string | null;
  actorUserId: string;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(fulfillmentJob)
      .set(buildFulfillmentJobStatusUpdate(input))
      .where(
        and(
          eq(fulfillmentJob.id, input.jobId),
          eq(fulfillmentJob.ventureId, input.ventureId),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError("Fulfillment job not found");
    }

    await tx.insert(fulfillmentEvent).values({
      fulfillmentJobId: row.id,
      status: input.status,
      note: input.notes ?? null,
      actorUserId: input.actorUserId,
    });

    await tx.insert(auditEvent).values({
      ventureId: input.ventureId,
      actorUserId: input.actorUserId,
      action: "fulfillment_job.status_updated",
      entityType: "fulfillment_job",
      entityId: row.id,
      metadata: { status: input.status },
    });

    return row;
  });
}

export async function countPartnerSweetohJobs(input: {
  ventureId: string;
  statuses: FulfillmentJobStatus[];
}) {
  const db = getDb();
  const rows = await db
    .select({ id: fulfillmentJob.id })
    .from(fulfillmentJob)
    .where(
      and(
        eq(fulfillmentJob.ventureId, input.ventureId),
        eq(fulfillmentJob.path, "sweetoh"),
        inArray(fulfillmentJob.status, input.statuses),
      ),
    );

  return rows.length;
}
