/** Current SweetOh shop capability, distinct from SweetOh AI's broad knowledge. */
export const CONFIRMED_SHOP_METHODS = ["sublimation", "engraving"] as const;
export type ConfirmedShopMethod = (typeof CONFIRMED_SHOP_METHODS)[number];

/** Educational knowledge only; these are not represented as SweetOh shop services. */
export const KNOWLEDGE_ONLY_METHODS = ["dtf", "dtg", "screen_printing", "embroidery", "htv_vinyl"] as const;
