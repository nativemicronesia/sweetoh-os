import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";
import {
  approveAsset,
  createAssetWithUpload,
  getAssetById,
  getAssetSignedUrl,
  validateImageUpload,
} from "@/lib/domains/assets/service";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { setProductPrintArea, setProductVariantSetup } from "@/lib/domains/catalog/service";
import type { ProductCategory } from "@/lib/domains/catalog/categories";
import { areaSchema } from "@/lib/domains/catalog/studio-layout";
import { colorHex, sortSizes, defaultUpcharges, type VariantColor } from "@/lib/domains/catalog/variants";
import { assertBuilderRole, reservePartnerAi } from "@/lib/domains/intelligence/partner-builder";
import { persistDraftProduct } from "@/lib/domains/intelligence/service";
import type { BuilderRecord } from "@/lib/domains/intelligence/product-research-schema";
import {
  aiCutout,
  editArtwork,
  generateDesign as aiGenerateDesign,
  understandProduct,
  type ProductType,
} from "@/lib/integrations/ai/product-research";
import { downloadFromBucket } from "@/lib/storage/client";
import { opaqueBox, removeUniformBackground, skinShare, squareOnTransparent } from "@/lib/studio/cutout";
import { ValidationError } from "@/lib/shared/errors";

/**
 * Sweet'Oh's creative actions. The studio calls these simple verbs; how each
 * is done (local image processing, which AI model) stays behind this module,
 * so the underlying NMH/Dekaz intelligence can change without touching the UI.
 */

type Area = { x: number; y: number; width: number; height: number };
export type ProposedView = {
  label: string;
  position: string;
  originalAssetId: string;
  originalUrl: string;
  cutoutAssetId: string | null;
  cutoutUrl: string | null;
  area: Area;
  printWidthIn: number;
  printHeightIn: number;
};
export type BlankProposal = {
  name: string;
  productType: ProductType;
  category: ProductCategory;
  color: VariantColor;
  sizes: string[];
  views: ProposedView[];
  usedAi: boolean;
  note: string | null;
};

const TYPE_PRESETS: Record<ProductType, { category: ProductCategory; w: number; h: number; sizes: string[]; label: string }> = {
  tshirt: { category: "apparel", w: 12, h: 14, sizes: ["S", "M", "L", "XL", "2XL"], label: "T-shirt" },
  hoodie: { category: "apparel", w: 12, h: 11, sizes: ["S", "M", "L", "XL", "2XL"], label: "Hoodie" },
  sweatshirt: { category: "apparel", w: 12, h: 14, sizes: ["S", "M", "L", "XL", "2XL"], label: "Sweatshirt" },
  tank: { category: "apparel", w: 11, h: 14, sizes: ["S", "M", "L", "XL"], label: "Tank top" },
  kids_apparel: { category: "kids", w: 9, h: 11, sizes: ["XS", "S", "M", "L", "XL"], label: "Kids apparel" },
  hat: { category: "accessories", w: 4, h: 2, sizes: [], label: "Hat" },
  mug: { category: "drinkware", w: 3.5, h: 3.5, sizes: ["11oz", "15oz"], label: "Mug" },
  tumbler: { category: "drinkware", w: 4, h: 7, sizes: [], label: "Tumbler" },
  water_bottle: { category: "drinkware", w: 3.5, h: 6, sizes: [], label: "Water bottle" },
  tote_bag: { category: "accessories", w: 12, h: 12, sizes: [], label: "Tote bag" },
  pillow: { category: "home", w: 14, h: 14, sizes: ["16x16", "18x18"], label: "Pillow" },
  blanket: { category: "home", w: 50, h: 60, sizes: [], label: "Blanket" },
  towel: { category: "home", w: 24, h: 40, sizes: [], label: "Towel" },
  apron: { category: "accessories", w: 9, h: 9, sizes: [], label: "Apron" },
  phone_case: { category: "accessories", w: 2.8, h: 5.8, sizes: [], label: "Phone case" },
  sticker: { category: "custom", w: 4, h: 4, sizes: [], label: "Sticker" },
  poster: { category: "home", w: 16, h: 20, sizes: [], label: "Poster" },
  other: { category: "custom", w: 10, h: 10, sizes: [], label: "Product" },
};
export const PRODUCT_TYPE_OPTIONS = Object.entries(TYPE_PRESETS).map(([value, p]) => ({
  value: value as ProductType,
  label: p.label,
  category: p.category,
  w: p.w,
  h: p.h,
  sizes: p.sizes,
}));

function clampArea(a: Area): Area {
  const width = Math.min(0.96, Math.max(0.05, a.width));
  const height = Math.min(0.96, Math.max(0.05, a.height));
  return {
    x: Math.min(Math.max(0.01, a.x), 0.99 - width),
    y: Math.min(Math.max(0.01, a.y), 0.99 - height),
    width,
    height,
  };
}

/** Keep a proposed print area on the product itself. */
function insideBox(a: Area, b: Area | null): Area {
  if (!b) return a;
  const x0 = Math.max(a.x, b.x + b.width * 0.03), y0 = Math.max(a.y, b.y + b.height * 0.03);
  const x1 = Math.min(a.x + a.width, b.x + b.width * 0.97), y1 = Math.min(a.y + a.height, b.y + b.height * 0.97);
  return x1 - x0 < 0.05 || y1 - y0 < 0.05 ? a : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** A print area inside the product's visible box, shaped like its print size. */
function heuristicArea(box: Area | null, type: ProductType, ratio: number): Area {
  const b = box ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
  const apparel = ["tshirt", "hoodie", "sweatshirt", "tank", "kids_apparel"].includes(type);
  let width = b.width * (apparel ? 0.36 : 0.6);
  let height = width * ratio;
  const maxH = b.height * (apparel ? 0.5 : 0.7);
  if (height > maxH) {
    height = maxH;
    width = height / ratio;
  }
  return clampArea({ x: b.x + (b.width - width) / 2, y: b.y + b.height * (apparel ? 0.2 : (1 - 0.7) / 2), width, height });
}

async function normalize(file: Buffer) {
  return sharp(file, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
}

async function signed(session: SessionUser, assetId: string) {
  return (await getAssetSignedUrl({ ventureId: session.ventureId, assetId })) ?? "";
}

async function assetBytes(session: SessionUser, assetId: string) {
  const a = await getAssetById({ ventureId: session.ventureId, assetId });
  return { asset: a, bytes: Buffer.from(await downloadFromBucket({ bucket: a.bucket, objectKey: a.objectKey })) };
}

/**
 * Cutout of a photo: free local removal first, AI when the backdrop is busy,
 * a person is in the shot, or the product needs printed graphics cleaned off.
 */
async function cutoutOf(session: SessionUser, image: Buffer, subject: "product" | "artwork", key: string, needsAi = false) {
  if (!needsAi) {
    const local = await removeUniformBackground(image, { dropIslands: subject === "product" });
    if (local.ok && (subject === "artwork" || (await skinShare(local.png)) < 0.015)) return { png: local.png, method: "local" as const };
  }
  await reservePartnerAi(session, key);
  return { png: await aiCutout(image, subject), method: "ai" as const };
}

/* ---------- Turn Photo Into Blank ---------- */

export async function turnPhotoIntoBlank(
  session: SessionUser,
  input: { photos: { file: Buffer; mimeType: string; label: string }[]; typeHint?: ProductType | null },
): Promise<BlankProposal> {
  assertBuilderRole(session);
  if (!input.photos.length) throw new ValidationError("Add at least one photo of the product.");
  if (input.photos.length > 4) throw new ValidationError("Use up to four photos (front, back, sides).");

  let understanding: Awaited<ReturnType<typeof understandProduct>> | null = null;
  let usedAi = false;
  let note: string | null = null;
  const views: ProposedView[] = [];

  for (const [index, photo] of input.photos.entries()) {
    validateImageUpload({ mimeType: photo.mimeType, sizeBytes: photo.file.length });
    const image = await normalize(photo.file);
    const fingerprint = createHash("sha256").update(image).digest("hex").slice(0, 24);
    const original = await createAssetWithUpload({
      ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id,
      name: `Product photo — ${photo.label}`, assetType: "product_asset", file: image,
      filename: "photo.png", mimeType: "image/png", notes: "Original partner product photo.",
    });

    // First look at the raw photo: people or printed graphics mean the AI cutout.
    let screening: Awaited<ReturnType<typeof understandProduct>> | null = null;
    if (index === 0) {
      try {
        await reservePartnerAi(session, `blank-screen:${fingerprint}`);
        screening = await understandProduct(image);
        usedAi = true;
      } catch {
        screening = null;
      }
    }
    let cutoutPng: Buffer | null = null;
    try {
      const cut = await cutoutOf(session, image, "product", `blank-cutout:${fingerprint}`, Boolean(screening?.hasPeople || screening?.hasPrintedDecoration));
      cutoutPng = await squareOnTransparent(cut.png);
      usedAi ||= cut.method === "ai";
    } catch (error) {
      note = error instanceof ValidationError ? error.message : "Background removal wasn’t available, so the original photo is used.";
    }
    const cutout = cutoutPng
      ? await createAssetWithUpload({
          ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id,
          name: `Blank — ${photo.label}`, assetType: "product_asset", file: cutoutPng,
          filename: "blank.png", mimeType: "image/png", notes: "Background removed; reusable blank view.",
        })
      : null;

    // Understand the product once, from the clearest (first) view.
    let proposed: Area[] = [];
    if (index === 0 && cutoutPng) {
      try {
        await reservePartnerAi(session, `blank-understand:${fingerprint}`);
        const flat = await sharp(cutoutPng).flatten({ background: "#ffffff" }).png().toBuffer();
        understanding = await understandProduct(flat);
        // Name/type/colour are clearest in the original photo.
        if (screening) understanding = { ...understanding, name: screening.name, productType: screening.productType, colorName: screening.colorName };
        usedAi = true;
        proposed = understanding.printAreas.map(({ x, y, width, height }) => clampArea({ x, y, width, height }));
      } catch (error) {
        note ??= error instanceof ValidationError ? error.message : "AI suggestions weren’t available; print areas were placed automatically.";
      }
    }

    const type = input.typeHint ?? understanding?.productType ?? "other";
    const preset = TYPE_PRESETS[type];
    const aiArea = index === 0 ? understanding?.printAreas[0] : undefined;
    const position = aiArea?.position ?? (/back/i.test(photo.label) ? "back" : index === 0 ? "front" : photo.label.toLowerCase());
    const widthIn = aiArea?.printWidthInches && aiArea.printWidthInches > 0.5 ? aiArea.printWidthInches : preset.w;
    const heightIn = aiArea?.printHeightInches && aiArea.printHeightInches > 0.5 ? aiArea.printHeightInches : preset.h;
    const box = cutoutPng ? await opaqueBox(cutoutPng) : null;
    const area = proposed[0] ? insideBox(proposed[0], box) : heuristicArea(box, type, heightIn / widthIn);

    views.push({
      label: photo.label,
      position,
      originalAssetId: original.id,
      originalUrl: await signed(session, original.id),
      cutoutAssetId: cutout?.id ?? null,
      cutoutUrl: cutout ? await signed(session, cutout.id) : null,
      area,
      printWidthIn: Math.round(widthIn * 10) / 10,
      printHeightIn: Math.round(heightIn * 10) / 10,
    });
  }

  const type = input.typeHint ?? understanding?.productType ?? "other";
  const preset = TYPE_PRESETS[type];
  const colorName = understanding?.colorName?.trim() || "White";
  return {
    name: understanding?.name?.trim() || preset.label,
    productType: type,
    category: preset.category,
    color: { name: colorName, hex: colorHex(colorName) },
    sizes: preset.sizes,
    views,
    usedAi,
    note,
  };
}

export async function createOwnBlank(
  session: SessionUser,
  input: {
    name: string;
    productType: ProductType;
    colors: VariantColor[];
    sizes: string[];
    views: {
      label: string;
      position: string;
      assetId: string;
      originalAssetId: string;
      area: Area;
      printRegions?: import("@/lib/domains/catalog/studio-layout").PrintRegion[];
      printWidthIn: number;
      printHeightIn: number;
    }[];
  },
) {
  assertBuilderRole(session);
  const name = input.name.trim().slice(0, 180);
  if (!name) throw new ValidationError("Give your product a name.");
  if (!input.views.length) throw new ValidationError("Keep at least one view.");
  const preset = TYPE_PRESETS[input.productType] ?? TYPE_PRESETS.other;
  // Every referenced photo must belong to this shop.
  for (const v of input.views) {
    await getAssetById({ ventureId: session.ventureId, assetId: v.assetId });
    await getAssetById({ ventureId: session.ventureId, assetId: v.originalAssetId });
  }
  const record: BuilderRecord = {
    kind: "partner_product_builder",
    purpose: "blank",
    fingerprint: createHash("sha256").update(JSON.stringify(input)).digest("hex"),
    research: null,
    confirmed: true,
    mockupAssetId: input.views[0].assetId,
  };
  const saved = await persistDraftProduct({
    ventureId: session.ventureId, actorUserId: session.appUser.id, mode: "visual_intake",
    prompt: "Turn photo into blank", rawResponse: record,
    sourceAssetId: input.views[0].originalAssetId, primaryAssetId: input.views[0].originalAssetId,
    output: {
      title: name, description: "", shortDescription: "", seoTitle: name.slice(0, 60), seoDescription: "",
      category: preset.category, suggestedTags: [], suggestedCollections: [], suggestedPriceCents: 0,
      internalNotes: "Made from the partner's own product photos.",
    },
  });
  for (const v of input.views) {
    await approveAsset({ ventureId: session.ventureId, assetId: v.assetId, approvedById: session.appUser.id }).catch(() => undefined);
  }
  const used = new Set<string>();
  const surfaces = input.views.map((v, i) => {
    let id = v.position.replace(/[^a-z0-9_]/gi, "_").toLowerCase() || `view_${i + 1}`;
    while (used.has(id)) id = `${id}_${i + 1}`;
    used.add(id);
    return { id, name: v.label.slice(0, 60) || `View ${i + 1}`, position: v.position, assetId: v.assetId, area: areaSchema.parse(v.area), printRegions: v.printRegions };
  });
  await setProductPrintArea({
    ventureId: session.ventureId, productId: saved.product.id,
    printArea: { ...surfaces[0].area, surfaces },
  });
  const sizes = sortSizes(input.sizes.map((s) => s.trim()).filter(Boolean).slice(0, 20));
  const colors = input.colors.filter((c) => c.name.trim()).slice(0, 30);
  await setProductVariantSetup({
    ventureId: session.ventureId, productId: saved.product.id,
    variantOptions: { colors, sizes, sizeUpchargeCents: defaultUpcharges(sizes) },
    catalogSource: {
      provider: "own",
      brand: "",
      model: preset.label,
      printAreas: input.views.flatMap((v, i) => v.printRegions !== undefined
        ? v.printRegions.flatMap(r => r.dimensions ? [{ position: `${surfaces[i].id}:${r.id}`, width: Math.round(r.dimensions.width * (r.dimensions.unit === "cm" ? 300 / 2.54 : 300)), height: Math.round(r.dimensions.height * (r.dimensions.unit === "cm" ? 300 / 2.54 : 300)) }] : [])
        : [{ position: surfaces[i].position ?? surfaces[i].id, width: Math.round(v.printWidthIn * 300), height: Math.round(v.printHeightIn * 300) }]),
      availableColors: colors,
      availableSizes: sizes,
    },
  });
  return saved.product.id;
}

/* ---------- Design actions ---------- */

async function saveDesign(session: SessionUser, name: string, png: Buffer, notes: string) {
  const art = await uploadPartnerDesign({
    ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id,
    name: name.slice(0, 100), notes, file: png, filename: "design.png", mimeType: "image/png", autoApprove: false,
  });
  return { assetId: art.id, name: art.name, previewUrl: await signed(session, art.id) };
}

export async function removeBackground(session: SessionUser, assetId: string) {
  assertBuilderRole(session);
  const { asset: source, bytes } = await assetBytes(session, assetId);
  const image = await normalize(bytes);
  const fingerprint = createHash("sha256").update(image).digest("hex").slice(0, 24);
  const cut = await cutoutOf(session, image, "artwork", `bg:${fingerprint}`);
  const saved = await saveDesign(session, `${source.name} (no background)`, cut.png, `Background removed (${cut.method}).`);
  return { ...saved, method: cut.method };
}

export async function editDesign(session: SessionUser, assetId: string, instruction: string) {
  assertBuilderRole(session);
  const brief = instruction.trim().slice(0, 1000);
  if (brief.length < 4) throw new ValidationError("Describe the change you want.");
  const { asset: source, bytes } = await assetBytes(session, assetId);
  await reservePartnerAi(session, `edit:${assetId}:${brief}`);
  const png = await editArtwork(await normalize(bytes), brief);
  return saveDesign(session, `${source.name} — edited`, png, `AI edit. Instruction: ${brief}`);
}

export async function generateDesign(
  session: SessionUser,
  input: { brief: string; seamless?: boolean; referenceAssetId?: string | null },
) {
  assertBuilderRole(session);
  const brief = input.brief.trim().slice(0, 2000);
  if (brief.length < 8) throw new ValidationError("Describe the design in a few more words.");
  const reference = input.referenceAssetId ? await normalize((await assetBytes(session, input.referenceAssetId)).bytes) : null;
  await reservePartnerAi(session, `${input.seamless ? "pattern" : "art"}:${brief}:${input.referenceAssetId ?? ""}`);
  const png = await aiGenerateDesign({ brief, seamless: input.seamless, reference });
  return saveDesign(session, brief.slice(0, 100), png, `${input.seamless ? "AI seamless pattern" : "AI design"}. Brief: ${brief}`);
}

/* ---------- Inspiration board ---------- */

const INSPIRATION_NOTE = "inspiration:";

export async function addInspiration(session: SessionUser, file: { bytes: Buffer; name: string; mimeType: string }) {
  assertBuilderRole(session);
  validateImageUpload({ mimeType: file.mimeType, sizeBytes: file.bytes.length });
  const image = await sharp(file.bytes, { limitInputPixels: 40_000_000 }).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
  const created = await createAssetWithUpload({
    ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id,
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "Inspiration", assetType: "media",
    file: image, filename: "inspiration.jpg", mimeType: "image/jpeg",
    notes: `${INSPIRATION_NOTE} reference only, never printed`,
  });
  return { assetId: created.id, name: created.name, previewUrl: await signed(session, created.id) };
}

export async function listInspiration(session: SessionUser) {
  const rows = await getDb()
    .select()
    .from(asset)
    .where(and(eq(asset.ventureId, session.ventureId), eq(asset.assetType, "media"), like(asset.notes, `${INSPIRATION_NOTE}%`)))
    .orderBy(desc(asset.createdAt))
    .limit(60);
  return Promise.all(
    rows.filter((r) => r.status !== "archived").map(async (r) => ({ id: r.id, name: r.name, previewUrl: await signed(session, r.id) })),
  );
}
