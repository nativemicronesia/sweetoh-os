/** Persist prompts in audit metadata — survives product/session cascade on reject. */
export function aiPromptAuditFields(input: {
  prompt: string;
  operatorNotes?: string | null;
  mode?: string;
}) {
  return {
    prompt: input.prompt.trim(),
    operatorNotes: input.operatorNotes?.trim() || null,
    ...(input.mode ? { mode: input.mode } : {}),
  };
}

export function formatStoredPromptPreview(
  metadata: Record<string, unknown> | null,
  maxLength = 120,
): string | null {
  const prompt =
    metadata && typeof metadata.prompt === "string" ? metadata.prompt.trim() : "";

  if (!prompt) {
    return null;
  }

  if (prompt.length <= maxLength) {
    return prompt;
  }

  return `${prompt.slice(0, maxLength)}…`;
}
