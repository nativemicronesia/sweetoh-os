"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  assertBuilderRole,
  preparePartnerProduct,
  listBuilderBlanks,
  confirmBuilderProduct,
} from "@/lib/domains/intelligence/partner-builder";
import {
  getPrintifyBlueprint,
  downloadCatalogImage,
  catalogCategory,
  plainCatalogDescription,
} from "@/lib/integrations/printify/catalog";
import { updateProduct } from "@/lib/domains/catalog/service";

export async function startCatalogDesign(form: FormData) {
  const session = await requirePartnerWorkspace();
  assertBuilderRole(session);
  const id = z.coerce.number().int().positive().parse(form.get("blueprintId"));
  try {
    const blueprint = await getPrintifyBlueprint(id);
    const index = z.coerce
      .number()
      .int()
      .min(0)
      .parse(form.get("imageIndex") ?? 0);
    const url = blueprint.images[index];
    if (!url) throw new Error("Choose a product image.");
    const image = await downloadCatalogImage(url);
    const name = [blueprint.brand, blueprint.model, blueprint.title]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 180);
    // Reuse the local blank if this catalog product was already chosen.
    const existing = (await listBuilderBlanks(session)).find(
      (b) => b.name === name,
    );
    if (existing) redirect(`/partner/canvas?blank=${existing.id}`);
    const product = await preparePartnerProduct(session, {
      file: image.bytes,
      mimeType: image.mimeType,
      purpose: "blank",
      useAi: false,
      name,
      notes: plainCatalogDescription(blueprint.description).slice(0, 3500),
      sourceUrl: "",
    });
    await updateProduct({
      ...product,
      actorUserId: session.appUser.id,
      ventureId: session.ventureId,
      productId: product.id,
      category: catalogCategory(blueprint.title),
    });
    await confirmBuilderProduct(session, product.id);
    revalidatePath("/partner/catalog");
    revalidatePath("/partner");
    revalidatePath("/partner/products");
    redirect(`/partner/canvas?blank=${product.id}`);
  } catch (error) {
    unstable_rethrow(error);
    redirect(
      `/partner/catalog/printify-${id}?error=${encodeURIComponent("Couldn’t prepare this product. Try again or choose another product image.")}`,
    );
  }
}
