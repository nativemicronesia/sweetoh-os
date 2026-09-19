import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appUser, asset, printRequest, shopSetting, type PrintRequestItems } from "@/lib/db/schema";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { createSignedUrl } from "@/lib/storage/client";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";

/**
 * Creator → Sweet'Oh print requests. Stored against the Sweet'Oh shop venture
 * so the partner sees them in their own section, separate from shop orders.
 */
export const REQUEST_STATUS_LABEL: Record<string, string> = {
  new: "Waiting for Sweet'Oh",
  quoted: "Quote ready — pay to confirm",
  declined: "Declined",
  paid: "Paid — in the queue",
  in_production: "Printing",
  shipped: "Shipped",
  canceled: "Canceled",
};

export async function isAcceptingRequests(): Promise<boolean> {
  const shop = await getDefaultVenture();
  const [row] = await getDb().select().from(shopSetting).where(eq(shopSetting.ventureId, shop.id)).limit(1);
  return row?.acceptingCreatorRequests ?? true;
}

export async function setAcceptingRequests(accepting: boolean) {
  const shop = await getDefaultVenture();
  await getDb()
    .insert(shopSetting)
    .values({ ventureId: shop.id, acceptingCreatorRequests: accepting })
    .onConflictDoUpdate({ target: shopSetting.ventureId, set: { acceptingCreatorRequests: accepting, updatedAt: new Date() } });
}

export async function createPrintRequest(input: {
  creatorUserId: string;
  creatorVentureId: string;
  mockupAssetId: string;
  productName: string;
  items: PrintRequestItems;
  note: string | null;
  shipTo: string | null;
}) {
  if (!(await isAcceptingRequests())) throw new ValidationError("Sweet'Oh isn't taking print requests right now. Send it to your Printify store instead, or try again later.");
  const quantity = input.items.lines.reduce((n, l) => n + l.quantity, 0);
  if (quantity < 1 || quantity > 500) throw new ValidationError("Choose between 1 and 500 pieces.");
  // Every file must belong to the requesting creator's workspace.
  const ids = [input.mockupAssetId, ...input.items.files.map((f) => f.assetId)];
  const owned = await getDb().select({ id: asset.id }).from(asset).where(and(inArray(asset.id, ids), eq(asset.ventureId, input.creatorVentureId)));
  if (owned.length !== new Set(ids).size) throw new ValidationError("Some files are missing. Try again from the Studio.");
  const shop = await getDefaultVenture();
  const [row] = await getDb()
    .insert(printRequest)
    .values({
      shopVentureId: shop.id,
      creatorUserId: input.creatorUserId,
      creatorVentureId: input.creatorVentureId,
      compositionAssetId: input.mockupAssetId,
      productName: input.productName.slice(0, 200),
      quantity,
      items: input.items,
      creatorNote: input.note?.slice(0, 2000) || null,
      shipTo: input.shipTo?.slice(0, 1000) || null,
    })
    .returning();
  return row;
}

export async function listCreatorRequests(creatorUserId: string) {
  return getDb().select().from(printRequest).where(eq(printRequest.creatorUserId, creatorUserId)).orderBy(desc(printRequest.createdAt)).limit(100);
}

export async function getCreatorRequest(creatorUserId: string, id: string) {
  const [row] = await getDb()
    .select()
    .from(printRequest)
    .where(and(eq(printRequest.id, id), eq(printRequest.creatorUserId, creatorUserId)))
    .limit(1);
  if (!row) throw new NotFoundError("Request not found.");
  return row;
}

/** Partner view: every request sent to the shop, newest first, with the creator's name. */
export async function listShopRequests(shopVentureId: string) {
  return getDb()
    .select({ request: printRequest, creatorName: appUser.name, creatorEmail: appUser.email })
    .from(printRequest)
    .innerJoin(appUser, eq(appUser.id, printRequest.creatorUserId))
    .where(eq(printRequest.shopVentureId, shopVentureId))
    .orderBy(desc(printRequest.createdAt))
    .limit(200);
}

export async function countOpenShopRequests(shopVentureId: string) {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(printRequest)
    .where(and(eq(printRequest.shopVentureId, shopVentureId), inArray(printRequest.status, ["new", "paid"])));
  return row?.n ?? 0;
}

export async function getShopRequest(shopVentureId: string, id: string) {
  const [row] = await getDb()
    .select({ request: printRequest, creatorName: appUser.name, creatorEmail: appUser.email })
    .from(printRequest)
    .innerJoin(appUser, eq(appUser.id, printRequest.creatorUserId))
    .where(and(eq(printRequest.id, id), eq(printRequest.shopVentureId, shopVentureId)))
    .limit(1);
  if (!row) throw new NotFoundError("Request not found.");
  return row;
}

export async function updateShopRequest(shopVentureId: string, id: string, patch: Partial<typeof printRequest.$inferInsert>) {
  const [row] = await getDb()
    .update(printRequest)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(printRequest.id, id), eq(printRequest.shopVentureId, shopVentureId)))
    .returning();
  if (!row) throw new NotFoundError("Request not found.");
  return row;
}

/** Signed links for the request's mockup and print files (they live in the creator's workspace). */
export async function requestFileUrls(request: typeof printRequest.$inferSelect) {
  const ids = [request.compositionAssetId, ...(request.items?.files ?? []).map((f) => f.assetId)];
  const rows = await getDb().select().from(asset).where(and(inArray(asset.id, ids), eq(asset.ventureId, request.creatorVentureId)));
  const url = async (assetId: string) => {
    const a = rows.find((r) => r.id === assetId);
    return a ? createSignedUrl({ bucket: a.bucket, objectKey: a.objectKey, expiresInSeconds: 3600 }).catch(() => null) : null;
  };
  return {
    mockup: await url(request.compositionAssetId),
    files: await Promise.all((request.items?.files ?? []).map(async (f) => ({ ...f, url: await url(f.assetId) }))),
  };
}
