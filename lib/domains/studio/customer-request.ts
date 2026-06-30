export const CUSTOMER_REQUEST_MARKER =
  "Customer customization request (submitted via /create)";

export function isCustomerCustomizationRequest(
  notes: string | null | undefined,
): boolean {
  return Boolean(notes?.includes(CUSTOMER_REQUEST_MARKER));
}

export function parseCustomerRequestNotes(notes: string | null | undefined): {
  email: string | null;
  contact: string | null;
  prompt: string | null;
} {
  if (!notes) {
    return { email: null, contact: null, prompt: null };
  }

  const email = notes.match(/^Email: (.+)$/m)?.[1]?.trim() ?? null;
  const contact = notes.match(/^Contact: (.+)$/m)?.[1]?.trim() ?? null;
  const promptMatch = notes.match(
    /--- Customer request ---\n([\s\S]*?)(?:\n\n--- |$)/,
  );

  return {
    email,
    contact,
    prompt: promptMatch?.[1]?.trim() ?? null,
  };
}

export function isOpenCustomerRequestStatus(status: string): boolean {
  return (
    status === "new" ||
    status === "reviewing" ||
    status === "approved" ||
    status === "in_production"
  );
}

/** Partner production queue — owner-approved jobs and in-production work. */
export function isPartnerProductionJobStatus(status: string): boolean {
  return status === "approved" || status === "in_production";
}

/** @deprecated Prefer isPartnerProductionJobStatus */
export function isPartnerApprovedJobStatus(status: string): boolean {
  return isPartnerProductionJobStatus(status);
}
