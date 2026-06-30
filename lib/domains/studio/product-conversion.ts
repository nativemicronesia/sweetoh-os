import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { createProduct, setProductStudioProject } from "@/lib/domains/catalog/service";
import { sendSweetohProductReadyEmail } from "@/lib/integrations/email/resend";
import { getPublicEnv } from "@/lib/config/env";
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
