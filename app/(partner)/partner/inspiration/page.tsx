import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listPartnerInspiration } from "@/lib/domains/partner-captures/service";
import { InspirationWorkspace } from "./workspace";

export default async function PartnerInspirationPage() {
  const session = await requirePartnerWorkspace();
  const items = await listPartnerInspiration(session);
  return <InspirationWorkspace initialItems={items} initialError={null} />;
}
