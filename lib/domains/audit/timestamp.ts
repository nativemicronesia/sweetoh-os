/** ISO timestamp in audit metadata — self-contained snapshot alongside prompt/output. */
export function aiTimestampAuditFields(at: Date = new Date()) {
  return {
    recordedAt: at.toISOString(),
  };
}

export function getStoredTimestamp(
  metadata: Record<string, unknown> | null,
): Date | null {
  if (!metadata || typeof metadata.recordedAt !== "string") {
    return null;
  }

  const parsed = new Date(metadata.recordedAt);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatStoredTimestamp(
  metadata: Record<string, unknown> | null,
  fallback?: Date,
): string {
  const stored = getStoredTimestamp(metadata);
  const date = stored ?? fallback;

  if (!date) {
    return "—";
  }

  return date.toLocaleString();
}
