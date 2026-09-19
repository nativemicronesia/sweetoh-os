/**
 * Resend transactional email.
 *
 * Sender rules (one RESEND_API_KEY):
 * - Island Sprouts store/order → ISLAND_SPROUTS_FROM_EMAIL
 * - Sweet'Oh studio workflow (custom request, production, partner, ready-to-order)
 *   → SWEETOH_FROM_EMAIL
 * - Legacy RESEND_FROM_EMAIL is used for any brand when its venture-specific from
 *   address is unset (RESEND_SWEETOH_FROM_EMAIL is checked before RESEND_FROM_EMAIL
 *   for Sweet'Oh).
 *
 * Reply-to rules:
 * - Island Sprouts store/order → ISLAND_SPROUTS_SUPPORT_EMAIL (Sweet'Oh-only orders
 *   use SWEETOH_SUPPORT_EMAIL — resolved in commerce/order-email.ts)
 * - Sweet'Oh workflow → SWEETOH_SUPPORT_EMAIL
 */
import { Resend } from "resend";
import {
  getIslandSproutsSupportEmail,
  getServerEnv,
  getSweetohSupportEmail,
  isIslandSproutsEmailConfigured,
  isResendApiConfigured,
  isSweetohEmailConfigured,
} from "@/lib/config/env";
import { formatPrice } from "@/lib/shared/format";
import { logger } from "@/lib/shared/logger";

let client: Resend | null = null;

function getResendClient(): Resend {
  if (!isResendApiConfigured()) {
    throw new Error(
      "Resend is not configured. Add RESEND_API_KEY to .env.local.",
    );
  }

  if (!client) {
    client = new Resend(getServerEnv().resendApiKey!);
  }

  return client;
}

function islandSproutsReplyTo(override?: string): string | undefined {
  return override ?? getIslandSproutsSupportEmail();
}

function sweetohReplyTo(): string | undefined {
  return getSweetohSupportEmail();
}

async function sendIslandSproutsStoreEmail(input: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  failureLogKey: string;
  context: Record<string, unknown>;
}) {
  if (!isIslandSproutsEmailConfigured()) {
    logger.warn("island_sprouts_store_email_skipped", {
      reason: "island_sprouts_email_not_configured",
      ...input.context,
    });
    return;
  }

  const replyTo = islandSproutsReplyTo(input.replyTo);

  try {
    await getResendClient().emails.send({
      from: getServerEnv().islandSproutsFromEmail!,
      ...(replyTo ? { replyTo } : {}),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  } catch (error) {
    logger.error(input.failureLogKey, {
      error: String(error),
      ...input.context,
    });
  }
}

/** All Sweet'Oh workflow email — custom request, production, partner, ready-to-order. */
async function sendSweetohWorkflowEmail(input: {
  to: string;
  subject: string;
  text: string;
  failureLogKey: string;
  context: Record<string, unknown>;
}) {
  if (!isSweetohEmailConfigured()) {
    logger.warn("sweetoh_workflow_email_skipped", {
      reason: "sweetoh_email_not_configured",
      ...input.context,
    });
    return;
  }

  const replyTo = sweetohReplyTo();

  try {
    await getResendClient().emails.send({
      from: getServerEnv().sweetohFromEmail!,
      ...(replyTo ? { replyTo } : {}),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  } catch (error) {
    logger.error(input.failureLogKey, {
      error: String(error),
      ...input.context,
    });
  }
}

export async function sendOrderConfirmationEmail(input: {
  to: string;
  orderId: string;
  totalCents: number;
  lineItems: { productName: string; quantity: number; priceCentsAtPurchase: number; color?: string | null; size?: string | null }[];
  /** Venture-appropriate support inbox — defaults to Island Sprouts support. */
  replyTo?: string;
}) {
  const supportEmail = islandSproutsReplyTo(input.replyTo);

  const itemLines = input.lineItems
    .map(
      (item) =>
        `${item.productName}${item.color || item.size ? ` (${[item.color, item.size].filter(Boolean).join(" / ")})` : ""} × ${item.quantity} — ${formatPrice(item.priceCentsAtPurchase * item.quantity)}`,
    )
    .join("\n");

  const text = [
    "Thank you for your order!",
    "",
    `Order ${input.orderId}`,
    "",
    itemLines,
    "",
    `Total: ${formatPrice(input.totalCents)}`,
    ...(supportEmail
      ? ["", `Questions? Reply to this email or contact ${supportEmail}.`]
      : []),
  ].join("\n");

  await sendIslandSproutsStoreEmail({
    to: input.to,
    subject: "Your Island Sprouts order is confirmed",
    text,
    replyTo: input.replyTo,
    failureLogKey: "order_confirmation_email_failed",
    context: { orderId: input.orderId },
  });
}

/**
 * Order confirmation for Sweet'Oh's own independent storefront checkout
 * (app/api/webhooks/stripe). Every order this app's Stripe webhook creates
 * belongs to this deployment's own venture, so it is always Sweet'Oh
 * branded — unlike the legacy `sendOrderConfirmationEmail` above, which was
 * written for a shared cart that could mix Island Sprouts and Sweet'Oh
 * line items and always defaulted to Island Sprouts branding.
 */
export async function sendStorefrontOrderConfirmationEmail(input: {
  to: string;
  orderId: string;
  totalCents: number;
  lineItems: { productName: string; quantity: number; priceCentsAtPurchase: number; color?: string | null; size?: string | null }[];
}) {
  const supportEmail = sweetohReplyTo();

  const itemLines = input.lineItems
    .map(
      (item) =>
        `${item.productName}${item.color || item.size ? ` (${[item.color, item.size].filter(Boolean).join(" / ")})` : ""} × ${item.quantity} — ${formatPrice(item.priceCentsAtPurchase * item.quantity)}`,
    )
    .join("\n");

  const text = [
    "Thank you for your Sweet'Oh order!",
    "",
    `Order ${input.orderId}`,
    "",
    itemLines,
    "",
    `Total: ${formatPrice(input.totalCents)}`,
    ...(supportEmail
      ? ["", `Questions? Reply to this email or contact ${supportEmail}.`]
      : []),
    "",
    "— Sweet'Oh",
  ].join("\n");

  await sendSweetohWorkflowEmail({
    to: input.to,
    subject: "Your Sweet'Oh order is confirmed",
    text,
    failureLogKey: "storefront_order_confirmation_email_failed",
    context: { orderId: input.orderId },
  });
}

export async function sendCustomRequestReceivedEmail(input: {
  to: string;
  customerName?: string | null;
  title: string;
  projectId: string;
}) {
  const supportEmail = sweetohReplyTo();
  const greeting = input.customerName ? `Hi ${input.customerName},` : "Hi,";
  const text = [
    greeting,
    "",
    `Thanks for your Sweet'Oh custom request: "${input.title}".`,
    "",
    "Our team will review it and follow up at this email — typically within a few business days. Nothing is produced or charged until we confirm with you.",
    ...(supportEmail
      ? ["", `Questions before we reply? Contact ${supportEmail}.`]
      : []),
    "",
    "— Sweet'Oh",
  ].join("\n");

  await sendSweetohWorkflowEmail({
    to: input.to,
    subject: "We received your Sweet'Oh request",
    text,
    failureLogKey: "custom_request_received_email_failed",
    context: { projectId: input.projectId },
  });
}

export async function sendSweetohProductReadyEmail(input: {
  to: string;
  customerName?: string | null;
  productName: string;
  productUrl: string;
  projectId: string;
}) {
  const supportEmail = sweetohReplyTo();
  const greeting = input.customerName ? `Hi ${input.customerName},` : "Hi,";
  const text = [
    greeting,
    "",
    `Your custom Sweet'Oh creation, "${input.productName}", is ready to order:`,
    "",
    input.productUrl,
    ...(supportEmail
      ? ["", `Questions? Contact ${supportEmail}.`]
      : []),
    "",
    "— Sweet'Oh",
  ].join("\n");

  await sendSweetohWorkflowEmail({
    to: input.to,
    subject: "Your Sweet'Oh creation is ready to order",
    text,
    failureLogKey: "sweetoh_product_ready_email_failed",
    context: { projectId: input.projectId },
  });
}
