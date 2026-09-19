"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { asset, creatorProfile } from "@/lib/db/schema";
import { requireCreator } from "@/lib/domains/identity/service";
import { getProductById } from "@/lib/domains/catalog/service";
import { getCreatorProfile, getCreditBalance } from "@/lib/domains/creator/credits";
import { createPrintRequest } from "@/lib/domains/creator/print-requests";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createSignedUrl } from "@/lib/storage/client";
import { designLibraryObjectKey, STORAGE_BUCKETS } from "@/lib/storage/paths";
import { decryptToken, encryptToken, listCreatorShops, sendProductToPrintify } from "@/lib/integrations/printify/creator-shop";
import { ValidationError } from "@/lib/shared/errors";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof ValidationError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: "Some details look off. Check them and try again." };
  console.error("creator_publish_failed", error instanceof Error ? error.message : error);
  return { ok: false, error: "That didn't work. Your design is safe — try again." };
}

/**
 * Print files can be tens of megabytes — too big for a server action body on
 * Vercel. The browser uploads each one straight to storage with a one-time
 * signed URL; the asset row is created here, in the creator's own workspace.
 */
export async function preparePrintUploadsAction(
  files: { name: string; kind: "print" | "mockup"; size: number }[],
): Promise<Result<{ uploads: { assetId: string; url: string }[] }>> {
  const session = await requireCreator();
  try {
    const list = z
      .array(z.object({ name: z.string().min(1).max(120), kind: z.enum(["print", "mockup"]), size: z.number().int().positive().max(60 * 1024 * 1024) }))
      .min(1)
      .max(12)
      .parse(files);
    const admin = createAdminClient();
    const uploads = [];
    for (const f of list) {
      const id = crypto.randomUUID();
      const objectKey = designLibraryObjectKey(session.ventureSlug, id, `${f.kind}-${f.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.png`);
      const { data, error } = await admin.storage.from(STORAGE_BUCKETS.designLibrary).createSignedUploadUrl(objectKey);
      if (error || !data) throw error ?? new Error("upload url");
      await getDb().insert(asset).values({
        id,
        ventureId: session.ventureId,
        name: `${f.kind === "print" ? "Print file" : "Mockup"} — ${f.name}`,
        assetType: "sweetoh_design",
        status: "draft",
        bucket: STORAGE_BUCKETS.designLibrary,
        objectKey,
        mimeType: "image/png",
        fileSizeBytes: f.size,
        uploadedById: session.appUser.id,
        notes: f.kind === "print" ? "print-file: exported from Sweet'Oh Studio" : "mockup: exported from Sweet'Oh Studio",
      });
      uploads.push({ assetId: id, url: data.signedUrl });
    }
    return { ok: true, uploads };
  } catch (error) {
    return fail(error);
  }
}

async function ownedAssets(ventureId: string, ids: string[]) {
  const rows = await getDb().select().from(asset).where(and(inArray(asset.id, ids), eq(asset.ventureId, ventureId)));
  if (rows.length !== new Set(ids).size) throw new ValidationError("Some files didn't upload. Try again.");
  return rows;
}

/* ---------- Printify (the creator's own account) ---------- */

export async function connectPrintifyAction(form: FormData): Promise<Result<{ shops: { id: number; title: string }[] }>> {
  const session = await requireCreator();
  try {
    const token = z.string().trim().min(20, "Paste your full Printify API token.").max(4000).parse(form.get("token"));
    const shops = await listCreatorShops(token);
    await getDb()
      .update(creatorProfile)
      .set({
        printifyTokenEnc: encryptToken(token),
        printifyShopId: shops.length === 1 ? String(shops[0].id) : null,
        printifyShopTitle: shops.length === 1 ? shops[0].title : null,
        updatedAt: new Date(),
      })
      .where(eq(creatorProfile.userId, session.appUser.id));
    revalidatePath("/studio/settings");
    revalidatePath("/studio");
    return { ok: true, shops: shops.map((s) => ({ id: s.id, title: s.title })) };
  } catch (error) {
    return fail(error);
  }
}

export async function choosePrintifyShopAction(shopId: string): Promise<Result> {
  const session = await requireCreator();
  try {
    const profile = await getCreatorProfile(session.appUser.id);
    if (!profile?.printifyTokenEnc) throw new ValidationError("Connect Printify first.");
    const shops = await listCreatorShops(decryptToken(profile.printifyTokenEnc));
    const shop = shops.find((s) => String(s.id) === shopId);
    if (!shop) throw new ValidationError("That shop isn't in your Printify account.");
    await getDb()
      .update(creatorProfile)
      .set({ printifyShopId: String(shop.id), printifyShopTitle: shop.title, updatedAt: new Date() })
      .where(eq(creatorProfile.userId, session.appUser.id));
    revalidatePath("/studio/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function disconnectPrintifyAction(): Promise<void> {
  const session = await requireCreator();
  await getDb()
    .update(creatorProfile)
    .set({ printifyTokenEnc: null, printifyShopId: null, printifyShopTitle: null, updatedAt: new Date() })
    .where(eq(creatorProfile.userId, session.appUser.id));
  revalidatePath("/studio/settings");
}

const sendSchema = z.object({
  blankId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000),
  priceCents: z.number().int().min(100).max(100000),
  colors: z.array(z.string().max(80)).max(60),
  sizes: z.array(z.string().max(20)).max(30),
  prints: z.array(z.object({ assetId: z.string().uuid(), position: z.string().min(1).max(40) })).min(1).max(8),
  tags: z.array(z.string().max(40)).max(13).default([]),
});

export async function sendToPrintifyAction(input: z.input<typeof sendSchema>): Promise<Result<{ productId: string; provider: string; shop: string }>> {
  const session = await requireCreator();
  try {
    const data = sendSchema.parse(input);
    const profile = await getCreatorProfile(session.appUser.id);
    if (!profile?.printifyTokenEnc || !profile.printifyShopId) throw new ValidationError("Connect your Printify store first (Printify & account).");
    const blank = await getProductById({ ventureId: session.ventureId, productId: data.blankId });
    const blueprintId = blank.catalogSource?.provider === "printify" ? blank.catalogSource.blueprintId : null;
    if (!blueprintId) throw new ValidationError("Only catalog products can be sent to Printify.");
    const files = await ownedAssets(session.ventureId, data.prints.map((p) => p.assetId));
    const prints = await Promise.all(
      data.prints.map(async (p) => {
        const a = files.find((f) => f.id === p.assetId)!;
        return { position: p.position, fileName: `${p.position}.png`, url: await createSignedUrl({ bucket: a.bucket, objectKey: a.objectKey, expiresInSeconds: 3600 }) };
      }),
    );
    const sent = await sendProductToPrintify({
      token: decryptToken(profile.printifyTokenEnc),
      shopId: profile.printifyShopId,
      blueprintId,
      title: data.title,
      description: data.description || blank.description || "",
      colors: data.colors,
      sizes: data.sizes,
      priceCents: data.priceCents,
      sizeUpchargeCents: blank.variantOptions?.sizeUpchargeCents,
      prints,
      tags: data.tags,
    });
    return { ok: true, productId: sent.productId, provider: sent.provider, shop: profile.printifyShopTitle ?? "your shop" };
  } catch (error) {
    return fail(error);
  }
}

/* ---------- Print with Sweet'Oh ---------- */

const requestSchema = z.object({
  productName: z.string().trim().min(2).max(200),
  mockupAssetId: z.string().uuid(),
  files: z.array(z.object({ assetId: z.string().uuid(), surface: z.string().max(60), position: z.string().max(40), width: z.number().int(), height: z.number().int() })).min(1).max(8),
  lines: z.array(z.object({ color: z.string().max(80).nullable(), size: z.string().max(20).nullable(), quantity: z.number().int().min(1).max(500) })).min(1).max(60),
  note: z.string().max(2000).nullable(),
  shipTo: z.string().trim().min(8, "Add a shipping address.").max(1000),
  blueprintId: z.number().int().nullable(),
  productLabel: z.string().max(200).nullable(),
});

export async function requestPrintAction(input: z.input<typeof requestSchema>): Promise<Result<{ id: string }>> {
  const session = await requireCreator();
  try {
    const { plan } = await getCreditBalance(session.appUser.id);
    if (plan.id === "free") throw new ValidationError("Printing with Sweet'Oh is part of the Creator and Pro plans.");
    const data = requestSchema.parse(input);
    const row = await createPrintRequest({
      creatorUserId: session.appUser.id,
      creatorVentureId: session.ventureId,
      mockupAssetId: data.mockupAssetId,
      productName: data.productName,
      items: { lines: data.lines, files: data.files, blueprintId: data.blueprintId, productLabel: data.productLabel },
      note: data.note,
      shipTo: data.shipTo,
    });
    revalidatePath("/studio/requests");
    revalidatePath("/partner/creator-requests");
    return { ok: true, id: row.id };
  } catch (error) {
    return fail(error);
  }
}
