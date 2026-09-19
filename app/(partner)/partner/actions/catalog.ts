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
  getBlueprintOptions,
  getPrintifyBlueprint,
  downloadCatalogImage,
  catalogCategory,
  plainCatalogDescription,
} from "@/lib/integrations/printify/catalog";
import {
  setProductPrintArea,
  setProductVariantSetup,
  updateProduct,
} from "@/lib/domains/catalog/service";
import { defaultPrintAreaFor, defaultUpcharges, sortSizes } from "@/lib/domains/catalog/variants";

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
    // Only colors and sizes Printify actually lists for this product.
    const options = await getBlueprintOptions(id).catch(() => null);
    const picked = (key: string) =>
      z.array(z.string()).max(200).catch([]).parse(JSON.parse(String(form.get(key) ?? "[]")));
    const colors = (options?.colors ?? []).filter((c) => picked("colors").includes(c.name));
    const sizes = sortSizes(picked("sizes").filter((s) => options?.sizes.includes(s)));
    if (options?.colors.length && !colors.length) throw new Error("Pick at least one color.");
    const variantOptions = { colors, sizes, sizeUpchargeCents: defaultUpcharges(sizes) };
    const catalogSource = {
      provider: "printify" as const,
      blueprintId: id,
      brand: blueprint.brand,
      model: blueprint.model,
      printAreas: options?.printAreas ?? [],
      availableColors: options?.colors ?? [],
      availableSizes: options?.sizes ?? [],
    };
    // Reuse the local blank if this catalog product was already chosen.
    const existing = (await listBuilderBlanks(session)).find(
      (b) => b.catalogSource?.blueprintId === id || b.name === name,
    );
    if (existing) {
      await setProductVariantSetup({
        ventureId: session.ventureId,
        productId: existing.id,
        variantOptions,
        catalogSource,
      });
      redirect(`/partner/canvas?blank=${existing.id}`);
    }
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
    await setProductVariantSetup({
      ventureId: session.ventureId,
      productId: product.id,
      variantOptions,
      catalogSource,
    });
    const area = defaultPrintAreaFor(catalogSource.printAreas);
    await setProductPrintArea({
      ventureId: session.ventureId,
      productId: product.id,
      printArea: { ...area, surfaces: [{ id: "front", name: "Front", assetId: null, area }] },
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
