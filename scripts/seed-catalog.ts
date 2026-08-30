import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import { getServerEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser, collection, collectionProduct, product, venture } from "@/lib/db/schema";
import {
  approveAsset,
  createAssetWithUpload,
} from "@/lib/domains/assets/service";
import {
  addProductMediaUpload,
  createProduct,
  publishProduct,
  syncAutomaticCollections,
} from "@/lib/domains/catalog/service";
import { syncProductCollectionAssignments } from "@/lib/domains/catalog/collection-assignment";
import { MOCK_PLACEHOLDER_PNG } from "@/lib/domains/intelligence/mock-fixtures";
import { logger } from "@/lib/shared/logger";
import {
  checkStorageBuckets,
  ensureStorageBuckets,
} from "@/lib/storage/client";
import { FOUNDATION_STORAGE_BUCKETS } from "@/lib/storage/paths";

loadEnv({ path: ".env.local" });
loadEnv();

const LAUNCH_PRODUCTS = [
  {
    slug: "sweetoh-everyday-tee",
    name: "Everyday Custom Tee",
    description:
      "Soft unisex tee — base blank for Sweet'Oh designs. Printed on demand.",
    priceCents: 3200,
    category: "apparel" as const,
    designName: "Launch — Everyday Tee base",
  },
  {
    slug: "sweetoh-island-hoodie",
    name: "Island Hoodie",
    description:
      "Cozy hoodie ready for custom artwork. Sample apparel blank for launch.",
    priceCents: 4800,
    category: "apparel" as const,
    designName: "Launch — Island Hoodie base",
  },
  {
    slug: "sweetoh-kids-onesie",
    name: "Little Island Onesie",
    description: "Soft infant onesie — kids aisle blank for custom prints.",
    priceCents: 2800,
    category: "kids" as const,
    designName: "Launch — Kids Onesie base",
  },
  {
    slug: "sweetoh-throw-blanket",
    name: "Coast Throw Blanket",
    description: "Soft throw for home — print your design edge to edge.",
    priceCents: 5200,
    category: "home" as const,
    designName: "Launch — Throw Blanket base",
  },
  {
    slug: "sweetoh-ceramic-mug",
    name: "Harbor Ceramic Mug",
    description: "Classic ceramic mug — drinkware blank for everyday designs.",
    priceCents: 2200,
    category: "drinkware" as const,
    designName: "Launch — Ceramic Mug base",
  },
  {
    slug: "sweetoh-canvas-tote",
    name: "Market Canvas Tote",
    description: "Sturdy tote — accessories blank for logos and island art.",
    priceCents: 2600,
    category: "accessories" as const,
    designName: "Launch — Canvas Tote base",
  },
] as const;

async function ensureStorage() {
  const required = FOUNDATION_STORAGE_BUCKETS.map((bucket) => bucket.name);
  const status = await checkStorageBuckets(required);

  if (!status.ok) {
    logger.info("sweetoh_catalog_seed_storage_setup", { missing: status.missing });
    await ensureStorageBuckets([...FOUNDATION_STORAGE_BUCKETS]);
  }
}

async function seedLaunchProduct(input: {
  ventureId: string;
  ventureSlug: string;
  ownerAppUserId: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: (typeof LAUNCH_PRODUCTS)[number]["category"];
  designName: string;
}) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(product)
    .where(
      and(eq(product.ventureId, input.ventureId), eq(product.slug, input.slug)),
    )
    .limit(1);

  if (existing?.active) {
    if (existing.category !== input.category) {
      await db
        .update(product)
        .set({ category: input.category, updatedAt: new Date() })
        .where(eq(product.id, existing.id));
      await syncProductCollectionAssignments({
        ventureId: input.ventureId,
        productId: existing.id,
        actorUserId: input.ownerAppUserId,
      });
      logger.info("sweetoh_catalog_product_category_updated", {
        slug: input.slug,
        category: input.category,
      });
    } else {
      logger.info("sweetoh_catalog_product_exists", {
        slug: input.slug,
        productId: existing.id,
      });
    }
    return { ...existing, category: input.category };
  }

  const designAsset = await createAssetWithUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    uploadedById: input.ownerAppUserId,
    name: input.designName,
    assetType: "sweetoh_design",
    file: MOCK_PLACEHOLDER_PNG,
    filename: `${input.slug}-design.png`,
    mimeType: "image/png",
    notes: "Sweet'Oh launch seed design",
  });

  await approveAsset({
    ventureId: input.ventureId,
    assetId: designAsset.id,
    approvedById: input.ownerAppUserId,
  });

  const created =
    existing ??
    (await createProduct({
      ventureId: input.ventureId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      priceCents: input.priceCents,
      category: input.category,
      fulfillmentType: "sweetoh",
      sourceAssetId: designAsset.id,
      actorUserId: input.ownerAppUserId,
    }));

  await addProductMediaUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    productId: created.id,
    actorUserId: input.ownerAppUserId,
    file: MOCK_PLACEHOLDER_PNG,
    filename: `${input.slug}-hero.png`,
    mimeType: "image/png",
    assetId: designAsset.id,
  });

  const published = await publishProduct({
    ventureId: input.ventureId,
    productId: created.id,
    actorUserId: input.ownerAppUserId,
  });

  logger.info("sweetoh_catalog_product_published", {
    slug: published.slug,
    productId: published.id,
    category: published.category,
  });

  return published;
}

async function ensureFeaturedCollection(
  ventureId: string,
  productIds: string[],
) {
  const db = getDb();

  const [featured] = await db
    .insert(collection)
    .values({
      ventureId,
      slug: "featured",
      name: "Featured",
      description: "Homepage featured Sweet'Oh products",
      kind: "manual",
      active: true,
    })
    .onConflictDoUpdate({
      target: [collection.ventureId, collection.slug],
      set: {
        name: "Featured",
        active: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!featured) {
    throw new Error("Failed to upsert featured collection");
  }

  for (const [index, productId] of productIds.entries()) {
    await db
      .insert(collectionProduct)
      .values({
        collectionId: featured.id,
        productId,
        sortOrder: index,
      })
      .onConflictDoNothing();
  }

  return featured;
}

async function main() {
  logger.info("sweetoh_catalog_seed_start");
  const env = getServerEnv();
  await ensureStorage();

  const db = getDb();
  const slug = env.ventureSlug;

  const [ventureRow] = await db
    .select()
    .from(venture)
    .where(eq(venture.slug, slug))
    .limit(1);

  if (!ventureRow) {
    throw new Error(`Venture not found: ${slug}. Run npm run db:seed first.`);
  }

  const [ownerRow] = await db
    .select()
    .from(appUser)
    .where(
      and(
        eq(appUser.ventureId, ventureRow.id),
        eq(appUser.role, "owner"),
        eq(appUser.active, true),
      ),
    )
    .limit(1);

  if (!ownerRow) {
    throw new Error("Owner app user not found. Run npm run db:seed first.");
  }

  await syncAutomaticCollections(ventureRow.id);

  const published = [];
  for (const item of LAUNCH_PRODUCTS) {
    published.push(
      await seedLaunchProduct({
        ventureId: ventureRow.id,
        ventureSlug: ventureRow.slug,
        ownerAppUserId: ownerRow.id,
        ...item,
      }),
    );
  }

  await ensureFeaturedCollection(
    ventureRow.id,
    published.map((row) => row.id),
  );

  logger.info("sweetoh_catalog_seed_complete", {
    ventureId: ventureRow.id,
    products: published.map((row) => row.slug),
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";
  console.log("\nSweet'Oh catalog seed complete.\n");
  console.log("Test URLs:");
  console.log(`  Home:        ${site}/`);
  console.log(`  Categories:  ${site}/collections`);
  console.log(`  Kids aisle:  ${site}/collections/kids`);
  console.log(`  Products:    ${site}/products`);
  console.log(`  Create:      ${site}/create`);
  console.log(`  Partner:     ${site}/partner/login`);
  console.log("");
}

main().catch((error) => {
  logger.error("sweetoh_catalog_seed_failed", { error: String(error) });
  console.error(error);
  process.exit(1);
});
