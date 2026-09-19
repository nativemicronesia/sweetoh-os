import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { printRequest } from "@/lib/db/schema";

/** Stripe confirmed the creator paid the quote: the request joins the print queue. */
export async function markPrintRequestPaid(requestId: string, stripeSessionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return;
  await getDb()
    .update(printRequest)
    .set({ status: "paid", paidAt: new Date(), stripeSessionId, updatedAt: new Date() })
    .where(and(eq(printRequest.id, requestId), inArray(printRequest.status, ["quoted", "new"])));
}
