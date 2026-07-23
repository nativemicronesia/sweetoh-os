import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import {
  addProductMediaUpload,
  createProduct,
  getActiveProductById,
  setProductStudioProject,
} from "@/lib/domains/catalog/service";
import { sendSweetohProductReadyEmail } from "@/lib/integrations/email/resend";
import { getPublicEnv } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import { downloadFromBucket } from "@/lib/storage/client";
import { getStudioProjectById } from "./service";
import { parseCustomerRequestNotes } from "./customer-request";

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "sweetoh-creation";
}

async function generateUniqueProductSlug(
  ventureId: string,
  title: string,
): Promise<string> {
  const db = getDb();
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const [existing] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.ventureId, ventureId), eq(product.slug, candidate)))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/**
 * Bridges the Sweet'Oh request workflow (studio) into a sellable
 * product (catalog) in one step, replacing the manual "paste the
 * project UUID into a text field" path. Owner still sets price,
 * uploads product photos, and publishes through the existing product
 * edit page.
 */
export async function createProductFromCustomerRequest(input: {
  ventureId: string;
  projectId: string;
  actorUserId: string;
}) {
  const { project } = await getStudioProjectById({
    ventureId: input.ventureId,
    projectId: input.projectId,
  });

  const parsed = parseCustomerRequestNotes(project.notes);
  const name = project.name.replace(/^(Request|Customize): /, "");
  const slug = await generateUniqueProductSlug(input.ventureId, name);

  const created = await createProduct({
    ventureId: input.ventureId,
    slug,
    name,
    description: parsed.prompt,
    priceCents: 0,
    category: "sweetoh_creations",
    fulfillmentType: "sweetoh",
    actorUserId: input.actorUserId,
  });

  return setProductStudioProject({
    ventureId: input.ventureId,
    productId: created.id,
    studioProjectId: input.projectId,
    actorUserId: input.actorUserId,
  });
}

/**
 * Mints a real, immediately-purchasable product from a customer's
 * AI-generated design (the /create flow) — a different trigger from
 * createProductFromCustomerRequest above, which is a manual, partner-
 * initiated conversion of an existing request, defaults to priceCents: 0
 * and active: false (expects a partner to price/publish it afterward), and
 * always has a real staff actor. None of that fits here: there is no staff
 * actor at the moment a customer confirms their own design, the price must
 * be set immediately (copied from whichever existing product they said
 * they were customizing — same price as that product type, per the
 * pricing model), and the product must be active right away so it's
 * addable to cart.
 *
 * Deliberately does not touch the product.draftStatus editorial pipeline
 * (submitProductDraftForReview/publishProduct/etc.) — that's for the
 * owner's manually-curated catalog. The review gate for a customer-
 * confirmed item is the partner's existing fulfillment Queue, which already
 * requires a manual "New -> In Production" step once the order is placed;
 * routing through draftStatus here would just be a redundant second gate.
 */
export async function createProductFromGeneratedDesign(input: {
  ventureId: string;
  ventureSlug: string;
  projectId: string;
  /** Existing catalog product the customer said they're customizing — its
   * price/category/fulfillment type are copied onto the new one-off product. */
  basedOnProductId: string;
}) {
  const { project, links } = await getStudioProjectById({
    ventureId: input.ventureId,
    projectId: input.projectId,
  });

  const mockupLink = links.find((link) => link.link.role === "mockup");
  if (!mockupLink) {
    throw new ValidationError("No generated design found for this project — generate one first.");
  }
  const mockupBytes = await downloadFromBucket({
    bucket: mockupLink.asset.bucket,
    objectKey: mockupLink.asset.objectKey,
  });

  const base = await getActiveProductById({
    ventureId: input.ventureId,
    productId: input.basedOnProductId,
  });

  const parsed = parseCustomerRequestNotes(project.notes);
  const name = project.name.replace(/^(Request|Customize): /, "");
  const slug = await generateUniqueProductSlug(input.ventureId, name);

  const created = await createProduct({
    ventureId: input.ventureId,
    slug,
    name,
    description: parsed.prompt,
    priceCents: base.priceCents,
    category: base.category as Parameters<typeof createProduct>[0]["category"],
    fulfillmentType: base.fulfillmentType as Parameters<typeof createProduct>[0]["fulfillmentType"],
    actorUserId: null,
    active: true,
  });

  await setProductStudioProject({
    ventureId: input.ventureId,
    productId: created.id,
    studioProjectId: input.projectId,
    actorUserId: null,
  });

  await addProductMediaUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    productId: created.id,
    actorUserId: null,
    file: mockupBytes,
    filename: "mockup.png",
    mimeType: mockupLink.asset.mimeType ?? "image/png",
  });

  return created;
}

/**
 * Tells the customer who submitted a Sweet'Oh request that the product
 * built from it is now published and ready to order. No-op if the
 * project has no captured customer email (e.g. owner-created projects
 * that were never a customer request).
 */
export async function notifyCustomerProductReady(input: {
  ventureId: string;
  projectId: string;
  productName: string;
  productSlug: string;
}) {
  const { project } = await getStudioProjectById({
    ventureId: input.ventureId,
    projectId: input.projectId,
  });

  if (!project.customerEmail) {
    return;
  }

  const productUrl = `${getPublicEnv().siteUrl}/products/${input.productSlug}`;

  await sendSweetohProductReadyEmail({
    to: project.customerEmail,
    customerName: project.customerName,
    productName: input.productName,
    productUrl,
    projectId: input.projectId,
  });
}
