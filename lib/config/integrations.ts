import {
  isAiProductBuilderConfigured,
  isResendConfigured,
  isStripeCheckoutReady,
} from "@/lib/config/env";

export type IntegrationId = "stripe" | "resend" | "openai";

export type IntegrationStatus = {
  id: IntegrationId;
  label: string;
  configured: boolean;
  envVars: string[];
  unlocks: string;
};

export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      id: "stripe",
      label: "Stripe",
      configured: isStripeCheckoutReady(),
      envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      unlocks: "Cart checkout, orders, fulfillment from sales",
    },
    {
      id: "resend",
      label: "Resend",
      configured: isResendConfigured(),
      envVars: [
        "RESEND_API_KEY",
        "ISLAND_SPROUTS_FROM_EMAIL",
        "SWEETOH_FROM_EMAIL",
        "RESEND_FROM_EMAIL (legacy fallback)",
      ],
      unlocks:
        "Island Sprouts order emails + Sweet'Oh request and ready-to-order emails",
    },
    {
      id: "openai",
      label: "OpenAI / AI Builder",
      configured: isAiProductBuilderConfigured(),
      envVars: ["OPENAI_API_KEY", "AI_MOCK_MODE (offline E2E)", "OPENAI_MODEL (optional)"],
      unlocks: "Sweet'Oh AI — create and review product drafts",
    },
  ];
}

export function allIntegrationsConfigured(): boolean {
  return getIntegrationStatuses().every((item) => item.configured);
}
