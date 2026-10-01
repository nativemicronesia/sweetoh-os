"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudioWorkspace, studioBase } from "@/lib/domains/identity/service";
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
import { defaultUpcharges, sortSizes } from "@/lib/domains/catalog/variants";
import { flatBlankKindFor, flatBlankZone } from "@/lib/studio/flat-blanks";
import { pixelsToInches } from "@/lib/domains/catalog/production-geometry";
import { ValidationError } from "@/lib/shared/errors";
import { getProductById } from "@/lib/domains/catalog/service";

export async function startCatalogDesign(form: FormData) {
  const session = await requireStudioWorkspace();
  assertBuilderRole(session);
  const paths = studioBase(session);
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
      images: blueprint.images,
    };
    // Every printable surface the supplier lists, each with its real printable size as structured geometry.
    const POSITION_NAME: Record<string, string> = { front: "Front", back: "Back", left_sleeve: "Left sleeve", right_sleeve: "Right sleeve", neck: "Neck label" };
    const kindFor = (position: string) => flatBlankKindFor({ name: `${blueprint.title} ${name}`, model: blueprint.model, position });
    const surfaceFor = (spec: { position: string; width: number; height: number }) => {
      const size = pixelsToInches(spec);
      const area = flatBlankZone(kindFor(spec.position), size.width, size.height);
      return {
        id: spec.position,
        name: POSITION_NAME[spec.position] ?? spec.position.replace(/_/g, " "),
        position: spec.position,
        assetId: null,
        area,
        printRegions: [{ id: `${spec.position}-main`, name: `${POSITION_NAME[spec.position] ?? spec.position} print area`, bounds: area, shape: "rectangle" as const, dimensions: size }],
      };
    };
    const specs = catalogSource.printAreas.length ? catalogSource.printAreas : [{ position: "front", width: 3600, height: 4800 }];
    const rank = (position: string) => { const i = ["front", "back"].indexOf(position); return i === -1 ? 9 : i; };
    const ordered = [...specs].sort((a, b) => rank(a.position) - rank(b.position));
    const allSurfaces = ordered.map(surfaceFor).map((surface, index) => index === 0 ? { ...surface, imageUrl: url, imageRole: "catalog_reference" as const } : surface);
    const frontArea = allSurfaces[0].area;
    const frontView = allSurfaces[0];
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
      // Older blanks designed on a downloaded photo move to the chosen catalog photo.
      const current = (await getProductById({ ventureId: session.ventureId, productId: existing.id })).printArea;
      if (!current?.surfaces?.[0]?.assetId && !current?.surfaces?.[0]?.imageUrl) {
        const others = current?.surfaces?.slice(1) ?? [];
        await setProductPrintArea({
          ventureId: session.ventureId,
          productId: existing.id,
          printArea: { ...frontArea, surfaces: [...allSurfaces, ...others] },
        });
      }
      redirect(`${paths.canvas}?blank=${existing.id}`);
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
    await setProductPrintArea({
      ventureId: session.ventureId,
      productId: product.id,
      printArea: { ...frontArea, surfaces: allSurfaces },
    });
    await confirmBuilderProduct(session, product.id);
    revalidatePath(paths.catalog);
    revalidatePath(paths.home);
    redirect(`${paths.canvas}?blank=${product.id}`);
  } catch (error) {
    unstable_rethrow(error);
    // Say which step failed, so "try again" isn't the only thing on offer.
    const message = error instanceof ValidationError
      ? error.message
      : /fetch failed|timeout|ECONN|ETIMEDOUT/i.test(String(error))
        ? "Printify didn’t answer just now. Wait a moment and try again — nothing was lost."
        : "Couldn’t prepare this product. Try another product photo, or pick a different product.";
    console.error("catalog_prepare_failed", { blueprintId: id, error: error instanceof Error ? error.message : String(error) });
    redirect(`${paths.catalog}/printify-${id}?error=${encodeURIComponent(message)}`);
  }
}
