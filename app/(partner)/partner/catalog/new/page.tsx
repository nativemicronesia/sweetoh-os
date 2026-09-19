import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { assertBuilderRole } from "@/lib/domains/intelligence/partner-builder";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/capabilities";
import { OwnProductWizard } from "./own-product-wizard";

export const maxDuration = 300;

export default async function NewOwnProductPage() {
  const session = await requirePartnerWorkspace();
  assertBuilderRole(session);
  return <OwnProductWizard types={PRODUCT_TYPE_OPTIONS} />;
}
