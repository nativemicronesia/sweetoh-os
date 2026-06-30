export type ProductCategory =
  | "baby_me"
  | "toys_sensory"
  | "sweetoh_creations"
  | "originals";

export type FulfillmentType = "dropship" | "sweetoh" | "digital";

export type PublishCheckInput = {
  category: ProductCategory;
  fulfillmentType: FulfillmentType;
  supplierSku: string | null;
  priceCents: number;
  hasMedia: boolean;
  sweetohPathValid: boolean;
};

export type PublishCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export type PublishReadinessCheck = {
  label: string;
  passed: boolean;
  message?: string;
};

export type PublishReadiness = {
  canPublish: boolean;
  checks: PublishReadinessCheck[];
  blockingReason: string | null;
};

export function getPublishReadiness(input: PublishCheckInput): PublishReadiness {
  const checks: PublishReadinessCheck[] = [
    {
      label: "Fulfillment type allowed at launch",
      passed: input.fulfillmentType !== "digital",
      message:
        input.fulfillmentType === "digital"
          ? "Digital products are blocked at launch (ADR-002)"
          : undefined,
    },
    {
      label: "At least one media item",
      passed: input.hasMedia,
      message: input.hasMedia ? undefined : "Product requires at least one media item",
    },
    {
      label: "Price greater than zero",
      passed: input.priceCents > 0,
      message:
        input.priceCents > 0 ? undefined : "Set a price before publishing",
    },
  ];

  if (input.fulfillmentType === "dropship") {
    checks.push({
      label: "Dropship supplier SKU",
      passed: Boolean(input.supplierSku?.trim()),
      message: input.supplierSku?.trim()
        ? undefined
        : "Dropship products require supplier_sku",
    });
  }

  if (input.fulfillmentType === "sweetoh") {
    checks.push({
      label: "Sweet'Oh source asset",
      passed: input.sweetohPathValid,
      message: input.sweetohPathValid
        ? undefined
        : "Sweet'Oh products require an approved source asset (design or intake photo)",
    });
  }

  const gate = canPublishProduct(input);

  return {
    canPublish: gate.ok,
    checks,
    blockingReason: gate.ok ? null : gate.reason,
  };
}

export function canPublishProduct(input: PublishCheckInput): PublishCheckResult {
  if (input.fulfillmentType === "digital") {
    return { ok: false, reason: "Digital products are blocked at launch (ADR-002)" };
  }

  if (!input.hasMedia) {
    return { ok: false, reason: "Product requires at least one media item" };
  }

  if (input.priceCents <= 0) {
    return { ok: false, reason: "Set a price greater than zero before publishing" };
  }

  if (input.fulfillmentType === "dropship") {
    if (!input.supplierSku?.trim()) {
      return {
        ok: false,
        reason: "Dropship products require supplier_sku",
      };
    }
  }

  if (input.fulfillmentType === "sweetoh") {
    if (!input.sweetohPathValid) {
      return {
        ok: false,
        reason: "Sweet'Oh products require a valid Sweet'Oh fulfillment path",
      };
    }
  }

  // Originals and all categories use the same gate (ADR-006) — no category bypass.
  void input.category;

  return { ok: true };
}
