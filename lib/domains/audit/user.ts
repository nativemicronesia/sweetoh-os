import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appUser } from "@/lib/db/schema";

export type StoredAiActor = {
  userId: string | null;
  email: string | null;
  role: string | null;
  kind: "owner" | "partner" | "customer" | "system";
  displayName: string | null;
};

export function aiUserAuditFields(input: {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  kind?: StoredAiActor["kind"];
  displayName?: string | null;
}) {
  const kind =
    input.kind ??
    (input.role === "partner"
      ? "partner"
      : input.role === "owner"
        ? "owner"
        : "system");

  return {
    actor: {
      userId: input.userId ?? null,
      email: input.email ?? null,
      role: input.role ?? null,
      kind,
      displayName: input.displayName ?? null,
    } satisfies StoredAiActor,
  };
}

export function aiCustomerAuditFields(input: {
  email: string;
  name?: string | null;
}) {
  return aiUserAuditFields({
    userId: null,
    email: input.email.trim().toLowerCase(),
    role: null,
    kind: "customer",
    displayName: input.name?.trim() || null,
  });
}

export async function resolveAiUserAuditFields(actorUserId: string) {
  const db = getDb();
  const [user] = await db
    .select({
      id: appUser.id,
      email: appUser.email,
      name: appUser.name,
      role: appUser.role,
    })
    .from(appUser)
    .where(eq(appUser.id, actorUserId))
    .limit(1);

  if (!user) {
    return aiUserAuditFields({ userId: actorUserId, kind: "system" });
  }

  return aiUserAuditFields({
    userId: user.id,
    email: user.email,
    role: user.role,
    kind: user.role,
    displayName: user.name,
  });
}

export function getStoredAiActor(
  metadata: Record<string, unknown> | null,
): StoredAiActor | null {
  if (!metadata || typeof metadata.actor !== "object" || metadata.actor === null) {
    return null;
  }

  const actor = metadata.actor as Record<string, unknown>;

  return {
    userId: typeof actor.userId === "string" ? actor.userId : null,
    email: typeof actor.email === "string" ? actor.email : null,
    role: typeof actor.role === "string" ? actor.role : null,
    kind:
      actor.kind === "owner" ||
      actor.kind === "partner" ||
      actor.kind === "customer" ||
      actor.kind === "system"
        ? actor.kind
        : "system",
    displayName:
      typeof actor.displayName === "string" ? actor.displayName : null,
  };
}

export function formatStoredActor(
  metadata: Record<string, unknown> | null,
  fallback?: { email?: string | null; role?: string | null },
): string {
  const stored = getStoredAiActor(metadata);

  if (stored) {
    if (stored.kind === "customer") {
      return stored.displayName
        ? `Customer · ${stored.displayName} (${stored.email})`
        : `Customer · ${stored.email ?? "unknown"}`;
    }

    if (stored.email) {
      return stored.role === "partner"
        ? `Partner · ${stored.email}`
        : stored.email;
    }

    if (stored.kind === "system") {
      return "System";
    }
  }

  if (fallback?.email) {
    return fallback.role === "partner"
      ? `Partner · ${fallback.email}`
      : fallback.email;
  }

  return "System";
}
