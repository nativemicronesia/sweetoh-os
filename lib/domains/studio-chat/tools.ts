/**
 * Studio chat tools — thin wrappers over Sweet'Oh's existing, already-real
 * operations. No new business logic lives here.
 *
 * Every tool closes over the authenticated `SessionUser`, so the model never
 * sees credentials, never chooses a venture, and never chooses an actor. Write
 * tools call the same role-checked core functions the Review/Orders buttons
 * call (`lib/domains/catalog/partner-listings.ts`,
 * `lib/domains/fulfillment/partner-jobs.ts`) — a chat tool therefore cannot do
 * anything the equivalent role's button could not.
 */

import type { SessionUser } from "@/lib/domains/identity/types";
import { listProductsPendingReview } from "@/lib/domains/catalog/service";
import {
  approvePartnerPendingListing,
  canModerateListings,
  publishPartnerDraft,
  rejectPartnerPendingListing,
} from "@/lib/domains/catalog/partner-listings";
import { createPieProductDraft } from "@/lib/domains/intelligence/pie";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import {
  listFulfillmentJobs,
  type FulfillmentJobStatus,
} from "@/lib/domains/fulfillment/service";
import {
  PARTNER_JOB_STATUSES,
  updatePartnerJobStatus,
} from "@/lib/domains/fulfillment/partner-jobs";
import { listCustomerCustomizationRequests } from "@/lib/domains/studio/service";
import { formatPrice } from "@/lib/shared/format";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";

/** Same shape as nmh-os's ConversationTool — plain JSON Schema in, string out. */
export type ConversationTool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<StudioToolResult>;
};

export type StudioToolResult = {
  ok: boolean;
  /** One-line confirmation the chat UI renders as a card. */
  summary: string;
  /** Structured payload handed back to the model. */
  data?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Accepts an id, or a product name the operator used in conversation. Name
 * resolution only ever searches rows this session can already see (their own
 * drafts, plus the pending queue for partner/owner).
 */
async function resolveProductRef(
  session: SessionUser,
  ref: string,
): Promise<{ id: string; name: string }> {
  if (!ref) {
    throw new ValidationError("Which listing? Give its name or id.");
  }

  const [drafts, pending] = await Promise.all([
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    canModerateListings(session)
      ? listProductsPendingReview(session.ventureId)
      : Promise.resolve([]),
  ]);

  const visible = [
    ...drafts.map(({ product }) => ({ id: product.id, name: product.name })),
    ...pending.map((product) => ({ id: product.id, name: product.name })),
  ];

  if (UUID_PATTERN.test(ref)) {
    return visible.find((row) => row.id === ref) ?? { id: ref, name: ref };
  }

  const needle = ref.toLowerCase();
  const match =
    visible.find((row) => row.name.toLowerCase() === needle) ??
    visible.find((row) => row.name.toLowerCase().includes(needle));

  if (!match) {
    throw new ValidationError(
      `No listing named "${ref}" is waiting on you. Ask for the list first.`,
    );
  }

  return match;
}

function ok(summary: string, data?: unknown): StudioToolResult {
  return { ok: true, summary, data };
}

/** Tool failures are answers, not crashes — the model explains them in words. */
function wrap(
  name: string,
  run: (input: Record<string, unknown>) => Promise<StudioToolResult>,
): (input: Record<string, unknown>) => Promise<StudioToolResult> {
  return async (input) => {
    try {
      return await run(input);
    } catch (error) {
      return {
        ok: false,
        summary: `${name} failed: ${getActionErrorMessage(error)}`,
      };
    }
  };
}

export function buildStudioChatTools(session: SessionUser): ConversationTool[] {
  const moderator = canModerateListings(session);

  const tools: ConversationTool[] = [
    {
      name: "create_draft_from_text",
      description:
        "Create a new product draft from a text description. Sweet'Oh AI writes the listing copy, price suggestion, and category. Returns the draft id — the operator still reviews and publishes it. Photo-based drafts are not available here; direct the operator to the Create screen's photo upload for those.",
      input_schema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "What the product is, in the operator's own words. e.g. 'toddler tee, soft cotton, name Mae on the front'.",
          },
        },
        required: ["prompt"],
      },
      execute: wrap("create_draft_from_text", async (input) => {
        const prompt = readString(input, "prompt");

        const product = await createPieProductDraft({
          ventureId: session.ventureId,
          ventureSlug: session.ventureSlug,
          actorUserId: session.appUser.id,
          textPrompt: prompt,
        });

        return ok(`Drafted "${product.name}"`, {
          draftId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          reviewUrl: `/partner/review/${product.id}`,
        });
      }),
    },
    {
      name: "list_pending_review",
      description:
        "List everything waiting on the operator: their own open drafts, plus (for the Sweet'Oh partner/owner) listings submitted for approval.",
      input_schema: { type: "object", properties: {} },
      execute: wrap("list_pending_review", async () => {
        const [drafts, pending] = await Promise.all([
          listActorProductDrafts({
            ventureId: session.ventureId,
            actorUserId: session.appUser.id,
          }),
          moderator
            ? listProductsPendingReview(session.ventureId)
            : Promise.resolve([]),
        ]);

        const openDrafts = drafts
          .filter(({ product }) => !product.active)
          .map(({ product }) => ({
            id: product.id,
            name: product.name,
            status: product.draftStatus,
            price: formatPrice(product.priceCents),
          }));

        const awaitingApproval = pending.map((product) => ({
          id: product.id,
          name: product.name,
          brand: product.brandVentureSlug ?? "sweetoh",
          price: formatPrice(product.priceCents),
        }));

        const total = openDrafts.length + awaitingApproval.length;

        return ok(
          total === 0
            ? "Nothing waiting on you"
            : `${openDrafts.length} open draft${
                openDrafts.length === 1 ? "" : "s"
              }, ${awaitingApproval.length} awaiting approval`,
          { openDrafts, awaitingApproval, canApprove: moderator },
        );
      }),
    },
    {
      name: "list_orders",
      description:
        "List Sweet'Oh orders: catalog fulfillment jobs (with status) and custom storefront requests currently in production.",
      input_schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: PARTNER_JOB_STATUSES,
            description:
              "Optional catalog-job status filter. Omit for all open jobs.",
          },
        },
      },
      execute: wrap("list_orders", async (input) => {
        const status = readString(input, "status");
        const statuses =
          status && PARTNER_JOB_STATUSES.includes(status as FulfillmentJobStatus)
            ? [status as FulfillmentJobStatus]
            : undefined;

        const [jobs, customRequests] = await Promise.all([
          listFulfillmentJobs({
            ventureId: session.ventureId,
            path: "sweetoh",
            statuses,
          }),
          listCustomerCustomizationRequests(session.ventureId),
        ]);

        const catalogOrders = jobs.map(({ job, lineItem, order }) => ({
          id: job.id,
          product: lineItem.productName,
          quantity: lineItem.quantity,
          status: job.status,
          customerEmail: order.customerEmail,
          trackingNumber: job.trackingNumber,
        }));

        const custom = customRequests.map((project) => ({
          id: project.id,
          name: project.name,
          status: project.status,
        }));

        return ok(
          `${catalogOrders.length} catalog order${
            catalogOrders.length === 1 ? "" : "s"
          }, ${custom.length} custom job${custom.length === 1 ? "" : "s"}`,
          { catalogOrders, customJobs: custom },
        );
      }),
    },
    {
      name: "update_order_status",
      description:
        "Update a catalog fulfillment job's status, and optionally its tracking number. Only Sweet'Oh-path jobs can be changed.",
      input_schema: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "Fulfillment job id, from list_orders.",
          },
          status: { type: "string", enum: PARTNER_JOB_STATUSES },
          trackingNumber: { type: "string" },
        },
        required: ["orderId", "status"],
      },
      execute: wrap("update_order_status", async (input) => {
        const orderId = readString(input, "orderId");
        const status = readString(input, "status");
        const trackingNumber = readString(input, "trackingNumber") || null;

        const row = await updatePartnerJobStatus(session, {
          jobId: orderId,
          status,
          trackingNumber,
        });

        return ok(`Order marked ${row.status.replaceAll("_", " ")}`, {
          orderId: row.id,
          status: row.status,
          trackingNumber: row.trackingNumber,
          orderUrl: `/partner/orders/${row.id}`,
        });
      }),
    },
  ];

  // Publish/reject are partner+owner powers. Creators do not get the tools at
  // all, and the core functions would refuse them anyway.
  if (moderator) {
    tools.push(
      {
        name: "publish_draft",
        description:
          "Publish a listing so it goes live in the Sweet'Oh catalog. Works on the operator's own drafts and on listings submitted for approval by a creator.",
        input_schema: {
          type: "object",
          properties: {
            draftId: {
              type: "string",
              description: "Draft id, or the listing name as the operator said it.",
            },
          },
          required: ["draftId"],
        },
        execute: wrap("publish_draft", async (input) => {
          const ref = await resolveProductRef(
            session,
            readString(input, "draftId"),
          );

          // Same split the Review screen shows: your own draft gets Publish,
          // someone else's submission gets Approve. Both are role-checked in
          // lib/domains/catalog/partner-listings.ts.
          const owned = await listActorProductDrafts({
            ventureId: session.ventureId,
            actorUserId: session.appUser.id,
          });
          const isOwn = owned.some(({ product }) => product.id === ref.id);

          const row = isOwn
            ? await publishPartnerDraft(session, ref.id)
            : await approvePartnerPendingListing(session, ref.id);

          return ok(`Published "${row.name}"`, {
            productId: row.id,
            name: row.name,
            slug: row.slug,
            productUrl: `/products/${row.slug}`,
          });
        }),
      },
      {
        name: "reject_draft",
        description:
          "Reject a listing that was submitted for Sweet'Oh approval. It goes back to the creator instead of going live.",
        input_schema: {
          type: "object",
          properties: {
            draftId: {
              type: "string",
              description: "Draft id, or the listing name as the operator said it.",
            },
            reason: {
              type: "string",
              description:
                "Why it was rejected. Repeated back to the operator; not stored on the listing.",
            },
          },
          required: ["draftId"],
        },
        execute: wrap("reject_draft", async (input) => {
          const ref = await resolveProductRef(
            session,
            readString(input, "draftId"),
          );
          const reason = readString(input, "reason");

          const row = await rejectPartnerPendingListing(session, ref.id);

          return ok(
            `Rejected "${row.name}"${reason ? ` — ${reason}` : ""}`,
            {
              productId: row.id,
              name: row.name,
              reason: reason || null,
              reasonStored: false,
            },
          );
        }),
      },
    );
  }

  return tools;
}
