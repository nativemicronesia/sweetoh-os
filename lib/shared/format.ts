export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatListForForm(values: string[] | null | undefined): string {
  return values?.join(", ") ?? "";
}

export function parseDelimitedList(raw: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const part of raw.split(/[,\n]/)) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(trimmed);
  }

  return items;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
