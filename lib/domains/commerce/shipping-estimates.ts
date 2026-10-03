/**
 * Delivery estimates the shop is willing to promise, by ISO country code, shown when a visitor selects that
 * country on the home-page globe. Empty on purpose: add an entry only once it is true for real carriers,
 * for example `US: "Usually 5 to 8 business days after printing"`. Countries without an entry show no promise.
 */
export const SHIPPING_ESTIMATES: Record<string, string> = {};
