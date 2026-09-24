import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { appUser, customer, customRequest, venture } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";
import { normalizePhoto } from "@/lib/domains/catalog/own-listing";
import { createSignedUrl, uploadToBucket } from "@/lib/storage/client";
import { customerUploadObjectKey, STORAGE_BUCKETS } from "@/lib/storage/paths";
import { sendCustomRequestReceivedEmail, sendPartnerNewCustomRequestEmail } from "@/lib/integrations/email/resend";
import { ValidationError } from "@/lib/shared/errors";
import { getServerEnv } from "@/lib/config/env";
import type { ShopCustomer } from "./account";

export const CUSTOM_PRODUCT_TYPES = ["T-shirt", "Hoodie / sweatshirt", "Tumbler / cup", "Tote bag", "Hat", "Kids / baby", "Something else"] as const;
export const CUSTOM_REQUEST_STATUSES = ["new", "contacted", "quoted", "done", "declined"] as const;
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];
export const CUSTOM_REQUEST_MAX_PHOTOS = 4;

export const STATUS_LABEL: Record<CustomRequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  done: "Done",
  declined: "Declined",
};

export type CustomRequestRow = typeof customRequest.$inferSelect;

export async function createCustomRequest(
  shopper: ShopCustomer,
  input: {
    productType: string;
    description: string;
    quantity: number;
    neededBy: string | null;
    budget: string | null;
    phone: string | null;
    photos: { file: Buffer; filename: string }[];
  },
): Promise<CustomRequestRow> {
  if (!(CUSTOM_PRODUCT_TYPES as readonly string[]).includes(input.productType)) throw new ValidationError("Pick what kind of product you want.");
  const description = input.description.trim();
  if (description.length < 10) throw new ValidationError("Tell us a little more about what you want (a sentence or two).");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10000) throw new ValidationError("Enter how many you need.");
  if (input.photos.length > CUSTOM_REQUEST_MAX_PHOTOS) throw new ValidationError(`Up to ${CUSTOM_REQUEST_MAX_PHOTOS} photos.`);

  const id = randomUUID();
  const ventureSlug = await ventureSlugFor(shopper.ventureId);
  const photoKeys: string[] = [];
  for (const [index, photo] of input.photos.entries()) {
    const { bytes } = await normalizePhoto(photo.file);
    const objectKey = customerUploadObjectKey(ventureSlug, id, `photo-${index + 1}.jpg`);
    await uploadToBucket({ bucket: STORAGE_BUCKETS.customerUploads, objectKey, body: bytes, contentType: "image/jpeg" });
    photoKeys.push(objectKey);
  }

  const [row] = await getDb()
    .insert(customRequest)
    .values({
      id,
      ventureId: shopper.ventureId,
      customerId: shopper.id,
      productType: input.productType,
      description: description.slice(0, 4000),
      quantity: input.quantity,
      neededBy: input.neededBy || null,
      budget: input.budget?.trim().slice(0, 120) || null,
      phone: input.phone?.trim().slice(0, 40) || null,
      photoKeys,
    })
    .returning();

  // Emails are best-effort (and skipped until Resend is configured); the inbox is the source of truth.
  const title = `${input.productType}${input.quantity > 1 ? ` × ${input.quantity}` : ""}`;
  await sendCustomRequestReceivedEmail({ to: shopper.email, customerName: shopper.name, title, projectId: id }).catch(() => undefined);
  // Her real Sweet'Oh inbox when set; otherwise the partner accounts' login emails.
  const env = getServerEnv();
  const inbox = env.sweetohPartnerInbox ?? env.sweetohSupportEmail;
  const recipients = inbox
    ? [inbox]
    : (
        await getDb()
          .select({ email: appUser.email })
          .from(appUser)
          .where(and(eq(appUser.ventureId, shopper.ventureId), eq(appUser.role, "partner")))
      ).map((p) => p.email);
  for (const to of recipients) {
    await sendPartnerNewCustomRequestEmail({
      to,
      customerName: shopper.name ?? shopper.email,
      customerEmail: shopper.email,
      title,
      description,
      requestId: id,
    }).catch(() => undefined);
  }
  return row;
}

async function ventureSlugFor(ventureId: string) {
  const [row] = await getDb().select({ slug: venture.slug }).from(venture).where(eq(venture.id, ventureId)).limit(1);
  return row?.slug ?? "sweetoh";
}

export async function listCustomerRequests(shopper: ShopCustomer) {
  return getDb()
    .select()
    .from(customRequest)
    .where(eq(customRequest.customerId, shopper.id))
    .orderBy(desc(customRequest.createdAt))
    .limit(20);
}

function assertPartner(session: SessionUser) {
  if (session.role !== "partner" && session.role !== "owner") throw new ValidationError("Only the shop can see custom requests.");
}

export type InboxRequest = CustomRequestRow & { customerName: string | null; customerEmail: string; photoUrls: string[] };

export async function listInboxRequests(session: SessionUser, filter: "open" | "all" = "open"): Promise<InboxRequest[]> {
  assertPartner(session);
  const where =
    filter === "open"
      ? and(eq(customRequest.ventureId, session.ventureId), inArray(customRequest.status, ["new", "contacted", "quoted"]))
      : eq(customRequest.ventureId, session.ventureId);
  const rows = await getDb()
    .select({ request: customRequest, name: customer.name, email: customer.email })
    .from(customRequest)
    .innerJoin(customer, eq(customer.id, customRequest.customerId))
    .where(where)
    .orderBy(desc(customRequest.createdAt))
    .limit(200);
  return Promise.all(
    rows.map(async (r) => ({
      ...r.request,
      customerName: r.name,
      customerEmail: r.email,
      photoUrls: await Promise.all(
        r.request.photoKeys.map((objectKey) =>
          createSignedUrl({ bucket: STORAGE_BUCKETS.customerUploads, objectKey }).catch(() => ""),
        ),
      ).then((urls) => urls.filter(Boolean)),
    })),
  );
}

export async function countNewRequests(session: SessionUser) {
  assertPartner(session);
  const rows = await getDb()
    .select({ id: customRequest.id })
    .from(customRequest)
    .where(and(eq(customRequest.ventureId, session.ventureId), eq(customRequest.status, "new")));
  return rows.length;
}

export async function updateInboxRequest(
  session: SessionUser,
  id: string,
  patch: { status?: CustomRequestStatus; partnerNotes?: string | null },
) {
  assertPartner(session);
  if (patch.status && !CUSTOM_REQUEST_STATUSES.includes(patch.status)) throw new ValidationError("Unknown status.");
  await getDb()
    .update(customRequest)
    .set({
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.partnerNotes !== undefined ? { partnerNotes: patch.partnerNotes?.slice(0, 4000) || null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(customRequest.id, id), eq(customRequest.ventureId, session.ventureId)));
}
