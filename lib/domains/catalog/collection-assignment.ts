import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { collection, collectionProduct, product } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { NotFoundError } from "@/lib/shared/errors";
import type { ProductCategory } from "./publish";
import { AUTOMATIC_COLLECTIONS } from "./collections-config";

type Product = typeof product.$inferSelect;

export type CollectionAssignmentSource = "category" | "suggestion" | "manual";

export type ProductCollectionAssignment = {
  collectionId: string;
  slug: string;
  name: string;
  source: CollectionAssignmentSource;
};

const COLLECTION_ALIASES: Record<string, string> = {
  // POD aisles
  apparel: "apparel",
  clothing: "apparel",
  tees: "apparel",
  hoodies: "apparel",
  kids: "kids",
  children: "kids",
  baby: "kids",
  "baby and me": "kids",
  "baby me": "kids",
  home: "home",
  drinkware: "drinkware",
  mugs: "drinkware",
  accessories: "accessories",
  totes: "accessories",
  custom: "custom",
  // Legacy Island Sprouts labels → new aisles
  "toys and sensory": "kids",
  "sweet oh creations": "custom",
  sweetoh: "custom",
  "island sprouts originals": "custom",
  originals: "custom",
};

function normalizeCollectionLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAutomaticCollectionSlugForCategory(
  category: ProductCategory,
): string | null {
  return (
    AUTOMATIC_COLLECTIONS.find((item) => item.category === category)?.slug ??
    null
  );
}

export function resolveSuggestedCollectionSlug(
  suggestion: string,
): string | null {
  const normalized = normalizeCollectionLabel(suggestion);

  if (!normalized) {
    return null;
  }

  const alias = COLLECTION_ALIASES[normalized];
  if (alias) {
    return alias;
  }

  for (const item of AUTOMATIC_COLLECTIONS) {
    if (normalized === normalizeCollectionLabel(item.name)) {
      return item.slug;
    }

    if (normalized === item.slug.replace(/-/g, " ")) {
      return item.slug;
    }

    if (normalized === normalizeCollectionLabel(item.ruleKey.replace(/_/g, " "))) {
      return item.slug;
    }
  }

  return null;
}

export function resolveExplicitCollectionSlugsForProduct(
  productRow: Pick<Product, "category" | "suggestedCollections">,
): string[] {
  const categorySlug = getAutomaticCollectionSlugForCategory(
    productRow.category as ProductCategory,
  );
  const slugs = new Set<string>();

  for (const suggestion of productRow.suggestedCollections ?? []) {
    const slug = resolveSuggestedCollectionSlug(suggestion);

    if (!slug || slug === categorySlug) {
      continue;
    }

    slugs.add(slug);
  }

  return [...slugs];
}

export function computeProductCollectionAssignments(input: {
  product: Pick<Product, "category" | "suggestedCollections">;
  collections: (typeof collection.$inferSelect)[];
  manualCollectionIds?: Set<string>;
}): {
  assignments: ProductCollectionAssignment[];
  unmatchedSuggestions: string[];
} {
  const bySlug = new Map(input.collections.map((row) => [row.slug, row]));
  const assignments: ProductCollectionAssignment[] = [];
  const assignedSlugs = new Set<string>();
  const categorySlug = getAutomaticCollectionSlugForCategory(
    input.product.category as ProductCategory,
  );

  if (categorySlug) {
    const row = bySlug.get(categorySlug);

    if (row) {
      assignments.push({
        collectionId: row.id,
        slug: row.slug,
        name: row.name,
        source: "category",
      });
      assignedSlugs.add(categorySlug);
    }
  }

  const unmatchedSuggestions: string[] = [];

  for (const suggestion of input.product.suggestedCollections ?? []) {
    const slug = resolveSuggestedCollectionSlug(suggestion);

    if (!slug) {
      unmatchedSuggestions.push(suggestion);
      continue;
    }

    if (assignedSlugs.has(slug)) {
      continue;
    }

    const row = bySlug.get(slug);

    if (row) {
      assignments.push({
        collectionId: row.id,
        slug: row.slug,
        name: row.name,
        source: "suggestion",
      });
      assignedSlugs.add(slug);
    }
  }

  if (input.manualCollectionIds) {
    for (const collectionRow of input.collections) {
      if (
        collectionRow.kind !== "manual" ||
        !input.manualCollectionIds.has(collectionRow.id) ||
        assignedSlugs.has(collectionRow.slug)
      ) {
        continue;
      }

      assignments.push({
        collectionId: collectionRow.id,
        slug: collectionRow.slug,
        name: collectionRow.name,
        source: "manual",
      });
      assignedSlugs.add(collectionRow.slug);
    }
  }

  return { assignments, unmatchedSuggestions };
}

async function getProductRow(input: {
  ventureId: string;
  productId: string;
}): Promise<Product> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  return row;
}

async function listVentureCollections(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(collection)
    .where(eq(collection.ventureId, ventureId))
    .orderBy(collection.name);
}

export async function ensureAutomaticCollections(ventureId: string) {
  const db = getDb();
  const results = [];

  for (const item of AUTOMATIC_COLLECTIONS) {
    const [row] = await db
      .insert(collection)
      .values({
        ventureId,
        slug: item.slug,
        name: item.name,
        kind: "automatic",
        ruleKey: item.ruleKey,
        active: true,
      })
      .onConflictDoUpdate({
        target: [collection.ventureId, collection.slug],
        set: {
          name: item.name,
          ruleKey: item.ruleKey,
          kind: "automatic",
          active: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (row) {
      results.push(row);
    }
  }

  return results;
}

export async function getProductCollectionAssignments(input: {
  ventureId: string;
  productId: string;
}): Promise<{
  assignments: ProductCollectionAssignment[];
  unmatchedSuggestions: string[];
}> {
  const productRow = await getProductRow(input);
  const collections = await listVentureCollections(input.ventureId);
  const db = getDb();
  const manualRows = await db
    .select({ collectionId: collectionProduct.collectionId })
    .from(collectionProduct)
    .where(eq(collectionProduct.productId, productRow.id));

  return computeProductCollectionAssignments({
    product: productRow,
    collections,
    manualCollectionIds: new Set(
      manualRows.map((row) => row.collectionId),
    ),
  });
}

export async function syncProductCollectionAssignments(input: {
  ventureId: string;
  productId: string;
  actorUserId?: string;
}): Promise<{ assignedSlugs: string[]; removedSlugs: string[] }> {
  const productRow = await getProductRow(input);

  if (!productRow.active) {
    return { assignedSlugs: [], removedSlugs: [] };
  }

  await ensureAutomaticCollections(input.ventureId);

  const collections = await listVentureCollections(input.ventureId);
  const bySlug = new Map(collections.map((row) => [row.slug, row]));
  const targetSlugs = resolveExplicitCollectionSlugsForProduct(productRow);
  const targetCollectionIds = new Set(
    targetSlugs
      .map((slug) => bySlug.get(slug)?.id)
      .filter((id): id is string => Boolean(id)),
  );

  const db = getDb();
  const existing = await db
    .select({
      collectionId: collectionProduct.collectionId,
      slug: collection.slug,
    })
    .from(collectionProduct)
    .innerJoin(collection, eq(collectionProduct.collectionId, collection.id))
    .where(eq(collectionProduct.productId, productRow.id));

  const existingIds = new Set(existing.map((row) => row.collectionId));
  const toAdd = [...targetCollectionIds].filter((id) => !existingIds.has(id));
  const toRemove = existing.filter(
    (row) => !targetCollectionIds.has(row.collectionId),
  );

  if (toRemove.length > 0) {
    await db
      .delete(collectionProduct)
      .where(
        and(
          eq(collectionProduct.productId, productRow.id),
          inArray(
            collectionProduct.collectionId,
            toRemove.map((row) => row.collectionId),
          ),
        ),
      );
  }

  if (toAdd.length > 0) {
    await db.insert(collectionProduct).values(
      toAdd.map((collectionId, index) => ({
        collectionId,
        productId: productRow.id,
        sortOrder: index,
      })),
    );
  }

  const assignedSlugs = toAdd
    .map((id) => collections.find((row) => row.id === id)?.slug)
    .filter((slug): slug is string => Boolean(slug));
  const removedSlugs = toRemove.map((row) => row.slug);

  if (
    input.actorUserId &&
    (assignedSlugs.length > 0 || removedSlugs.length > 0)
  ) {
    await recordAuditEvent({
      ventureId: input.ventureId,
      actorUserId: input.actorUserId,
      action: "product.collections_assigned",
      entityType: "product",
      entityId: productRow.id,
      metadata: {
        assignedSlugs,
        removedSlugs,
        categorySlug: getAutomaticCollectionSlugForCategory(
          productRow.category as ProductCategory,
        ),
      },
    });
  }

  return { assignedSlugs, removedSlugs };
}

export async function syncAllPublishedProductCollectionAssignments(input: {
  ventureId: string;
  actorUserId: string;
}): Promise<{ productCount: number; changedCount: number }> {
  const db = getDb();
  const activeProducts = await db
    .select({ id: product.id })
    .from(product)
    .where(
      and(eq(product.ventureId, input.ventureId), eq(product.active, true)),
    );

  let changedCount = 0;

  for (const row of activeProducts) {
    const result = await syncProductCollectionAssignments({
      ventureId: input.ventureId,
      productId: row.id,
      actorUserId: input.actorUserId,
    });

    if (result.assignedSlugs.length > 0 || result.removedSlugs.length > 0) {
      changedCount += 1;
    }
  }

  return { productCount: activeProducts.length, changedCount };
}

export async function countActiveProductsInCollection(
  collectionRow: typeof collection.$inferSelect,
): Promise<number> {
  const db = getDb();
  const products = await getActiveProductIdsForCollection(collectionRow);
  return products.length;
}

export async function getActiveProductIdsForCollection(
  collectionRow: typeof collection.$inferSelect,
): Promise<string[]> {
  const db = getDb();

  if (collectionRow.kind === "automatic") {
    const ids = new Set<string>();

    if (collectionRow.ruleKey) {
      const byCategory = await db
        .select({ id: product.id })
        .from(product)
        .where(
          and(
            eq(product.ventureId, collectionRow.ventureId),
            eq(product.category, collectionRow.ruleKey as ProductCategory),
            eq(product.active, true),
          ),
        );

      for (const row of byCategory) {
        ids.add(row.id);
      }
    }

    const byJunction = await db
      .select({ id: product.id })
      .from(collectionProduct)
      .innerJoin(product, eq(collectionProduct.productId, product.id))
      .where(
        and(
          eq(collectionProduct.collectionId, collectionRow.id),
          eq(product.active, true),
        ),
      );

    for (const row of byJunction) {
      ids.add(row.id);
    }

    return [...ids];
  }

  const rows = await db
    .select({ id: product.id })
    .from(collectionProduct)
    .innerJoin(product, eq(collectionProduct.productId, product.id))
    .where(
      and(
        eq(collectionProduct.collectionId, collectionRow.id),
        eq(product.active, true),
      ),
    );

  return rows.map((row) => row.id);
}

export async function getCollectionById(input: {
  ventureId: string;
  collectionId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collection)
    .where(
      and(
        eq(collection.id, input.collectionId),
        eq(collection.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Collection not found");
  }

  return row;
}
