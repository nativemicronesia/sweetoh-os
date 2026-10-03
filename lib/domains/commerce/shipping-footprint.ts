import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { order } from "@/lib/db/schema";
import { COUNTRY_POINTS } from "@/lib/shared/country-points";

/** Where paid orders have gone, at country level only: no names, addresses or cities leave this function. */
export type ShippingDestination = { code: string; name: string; lon: number; lat: number; orders: number };

export async function getShippingFootprint(ventureId: string): Promise<ShippingDestination[]> {
  const rows = await getDb()
    .select({ country: sql<string | null>`upper(${order.shippingAddress}->>'country')`, orders: sql<number>`count(*)::int` })
    .from(order)
    .where(and(eq(order.ventureId, ventureId), eq(order.status, "paid")))
    .groupBy(sql`upper(${order.shippingAddress}->>'country')`);
  const out: ShippingDestination[] = [];
  for (const row of rows) {
    const point = row.country ? COUNTRY_POINTS[row.country] : undefined;
    if (point) out.push({ code: row.country as string, ...point, orders: row.orders });
  }
  return out.sort((a, b) => b.orders - a.orders);
}
