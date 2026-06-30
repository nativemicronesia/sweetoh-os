export const INTELLIGENCE_AUDIT_ACTIONS = [
  "ai_creation_session.created",
  "product.ai_drafted",
  "product.ai_outputs_edited",
  "product.ai_draft_published",
  "product.draft_rejected",
  "product.draft_reviewed",
  "product.draft_submitted_for_review",
  "product.archived",
  "product.published",
  "product.unpublished",
  "customer_customization.submitted",
  "product_intelligence.intake_run",
  "product_intelligence.template_defined",
  "pie_template.approved",
  "pil.compound",
  "pil.archived",
] as const;

/** @deprecated Use INTELLIGENCE_AUDIT_ACTIONS */
export const AI_AUDIT_ACTIONS = INTELLIGENCE_AUDIT_ACTIONS;

export type IntelligenceAuditAction = (typeof INTELLIGENCE_AUDIT_ACTIONS)[number];

/** @deprecated Use IntelligenceAuditAction */
export type AiAuditAction = IntelligenceAuditAction;

const ACTION_LABELS: Record<IntelligenceAuditAction, string> = {
  "ai_creation_session.created": "AI session created",
  "product.ai_drafted": "AI draft product created",
  "product.ai_outputs_edited": "AI outputs edited",
  "product.ai_draft_published": "AI draft published",
  "product.draft_rejected": "AI draft rejected",
  "product.draft_reviewed": "Draft reviewed",
  "product.draft_submitted_for_review": "Draft submitted for review",
  "product.archived": "Product archived",
  "product.published": "Product published",
  "product.unpublished": "Product unpublished",
  "customer_customization.submitted": "Customer /create AI request",
  "product_intelligence.intake_run": "Product Intelligence Engine run",
  "product_intelligence.template_defined": "PIE template promoted",
  "pie_template.approved": "PIE template approved",
  "pil.compound": "PIL entry compounded",
  "pil.archived": "PIL entry archived",
};

export function formatAiAuditAction(action: string): string {
  if (action in ACTION_LABELS) {
    return ACTION_LABELS[action as IntelligenceAuditAction];
  }

  return action.replaceAll("_", " ").replaceAll(".", " · ");
}

export function isIntelligenceAuditAction(
  action: string,
): action is IntelligenceAuditAction {
  return (INTELLIGENCE_AUDIT_ACTIONS as readonly string[]).includes(action);
}

/** @deprecated Use isIntelligenceAuditAction */
export function isAiAuditAction(action: string): action is AiAuditAction {
  return isIntelligenceAuditAction(action);
}
