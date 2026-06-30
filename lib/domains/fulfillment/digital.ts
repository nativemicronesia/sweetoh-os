import { ValidationError } from "@/lib/shared/errors";

/**
 * Future-ready hook per ADR-002 — digital fulfillment is blocked at V1 launch.
 * Never called in V1; `canPublishProduct()` already prevents digital products
 * from reaching checkout, so this is a documented stub, not a dead code path.
 */
export function routeDigitalFulfillment(): never {
  throw new ValidationError("Digital fulfillment is blocked at launch (ADR-002)");
}
